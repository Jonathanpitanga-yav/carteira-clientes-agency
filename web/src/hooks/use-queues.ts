import { useQuery } from "@tanstack/react-query"
import { createSchemaClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"

function getSupabase() {
  return createSchemaClient("jobs")
}

export type QueueStatus = {
  queue_name: string
  pending: number
  archived: number
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
