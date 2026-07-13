import { useQuery } from "@tanstack/react-query"
import { createSchemaClient } from "@/lib/supabase/client"

function getSupabase() {
  return createSchemaClient("integration")
}

export type ActivityLog = {
  id: string
  event_type: string
  app_id: string | null
  provider: string | null
  actor_id: string | null
  category: string
  erp_error_code: string | null
  payload: Record<string, unknown> | null
  created_at: string
}

export type ActivityFilters = {
  category?: string
  event_type?: string
  fromDate?: string
  toDate?: string
  provider?: string
}

export function useActivityLogs(filters?: ActivityFilters) {
  return useQuery({
    queryKey: ["activity-logs", filters],
    queryFn: async () => {
      let query = getSupabase()
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      if (filters?.category) query = query.eq("category", filters.category)
      if (filters?.event_type) query = query.eq("event_type", filters.event_type)
      if (filters?.provider) query = query.eq("provider", filters.provider)
      if (filters?.fromDate) query = query.gte("created_at", filters.fromDate)
      if (filters?.toDate) query = query.lte("created_at", filters.toDate)

      const { data, error } = await query
      if (error) throw error
      return data as ActivityLog[]
    },
  })
}

export function useActivityEventTypes() {
  return useQuery({
    queryKey: ["activity-logs", "event-types"],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("audit_logs")
        .select("event_type")
      if (error) throw error
      const types = new Set((data as { event_type: string }[]).map((r) => r.event_type))
      return Array.from(types).sort()
    },
  })
}
