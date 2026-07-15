import { useQuery } from "@tanstack/react-query"
import { createClient, createSchemaClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"

function getSupabase() {
  return createSchemaClient("jobs")
}

export type QueueStatus = {
  queue_name: string
  pending: number
  archived: number
}

export type WebhookQueueItem = {
  id: string
  app_id: string | null
  client_id: string | null
  provider: string
  company_external_id: string | null
  event_type: string | null
  status: "pending" | "processing" | "processed" | "failed" | "dead_letter" | "unmapped"
  retry_count: number
  error: string | null
  invoice_id: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  client_name: string | null
  provider_name: string | null
  provider_slug: string | null
  app_name: string | null
}

export type WebhookQueueCount = {
  status: string
  count: number
}

export function useQueueStatus() {
  return useQuery({
    queryKey: [QUERY_KEYS.QUEUES],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("queue_status")
        .select("*")

      if (error) throw error
      return data as QueueStatus[]
    },
  })
}

export function useWebhookQueue() {
  return useQuery({
    queryKey: [QUERY_KEYS.QUEUES, "webhook"],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("webhook_invoices_queue_status")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error
      return data as WebhookQueueItem[]
    },
    refetchInterval: 10_000,
  })
}

export function useWebhookQueueCounts() {
  return useQuery({
    queryKey: [QUERY_KEYS.QUEUES, "webhook-counts"],
    queryFn: async () => {
      const { data, error } = await createClient().rpc("webhook_invoices_queue_count")
      if (error) throw error
      return (data as WebhookQueueCount[]) ?? []
    },
    refetchInterval: 10_000,
  })
}
