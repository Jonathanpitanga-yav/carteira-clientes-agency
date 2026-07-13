import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"

function getSupabase() {
  return createClient()
}

export type AuditLog = {
  id: string
  action: string
  entity_type: string
  entity_id: string
  payload: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
  user_id?: string
}

export type AuditLogFilters = {
  action?: string
  entityType?: string
  fromDate?: string
  toDate?: string
}

export function useAuditLogs(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: [QUERY_KEYS.AUDIT_LOGS, filters],
    queryFn: async () => {
      let query = getSupabase()
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      if (filters?.action) query = query.eq("action", filters.action)
      if (filters?.entityType) query = query.eq("entity_type", filters.entityType)
      if (filters?.fromDate) query = query.gte("created_at", filters.fromDate)
      if (filters?.toDate) query = query.lte("created_at", filters.toDate)

      const { data, error } = await query
      if (error) throw error
      return data as AuditLog[]
    },
  })
}

export function useAuditLogActions() {
  return useQuery({
    queryKey: [QUERY_KEYS.AUDIT_LOGS, "actions"],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("audit_logs")
        .select("action")

      if (error) throw error
      const actions = new Set((data as { action: string }[]).map((r) => r.action))
      return Array.from(actions).sort()
    },
  })
}

export function useAuditLogEntityTypes() {
  return useQuery({
    queryKey: [QUERY_KEYS.AUDIT_LOGS, "entity-types"],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("audit_logs")
        .select("entity_type")

      if (error) throw error
      const types = new Set(
        (data as { entity_type: string }[]).map((r) => r.entity_type),
      )
      return Array.from(types).sort()
    },
  })
}
