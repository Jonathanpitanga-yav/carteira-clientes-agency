import { useQuery } from "@tanstack/react-query"
import { createSchemaClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"

function getSalesClient() {
  return createSchemaClient("sales")
}

export type DashboardKpis = {
  total_revenue: number
  total_orders: number
  avg_ticket: number
  prev_total_revenue: number
  prev_total_orders: number
  prev_avg_ticket: number
}

export type ChannelRow = {
  channel_slug: string
  client_count: number
  order_count: number
  total_revenue: number
  avg_ticket: number
}

export type LogisticsRow = {
  logistics_slug: string
  client_count: number
  order_count: number
  total_revenue: number
}

export type AbcItemRow = {
  client_id: string
  client_name: string | null
  sku: string | null
  product_name: string
  category: string | null
  year_month: string
  total_revenue: number
  total_quantity: number
  order_count: number
  rank: number
  prev_rank: number | null
  cumulative_pct: number
  abc_class: "A" | "B" | "C"
}

export type DashboardFilters = {
  clientIds?: string[]
  dateFrom?: string
  dateTo?: string
}

function buildRpcParams(filters: DashboardFilters) {
  return {
    p_client_ids: filters.clientIds?.length ? filters.clientIds : null,
    p_date_from: filters.dateFrom || null,
    p_date_to: filters.dateTo || null,
  }
}

export function useDashboardKpis(filters: DashboardFilters) {
  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, "dashboard-kpis", filters],
    queryFn: async () => {
      const { data, error } = await getSalesClient()
        .rpc("get_dashboard_kpis", buildRpcParams(filters))
      if (error) throw error
      const rows = data as DashboardKpis[]
      return rows?.[0] ?? {
        total_revenue: 0, total_orders: 0, avg_ticket: 0,
        prev_total_revenue: 0, prev_total_orders: 0, prev_avg_ticket: 0,
      }
    },
  })
}

export function useDashboardChannels(filters: DashboardFilters) {
  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, "dashboard-channels", filters],
    queryFn: async () => {
      const { data, error } = await getSalesClient()
        .rpc("get_dashboard_channels", buildRpcParams(filters))
      if (error) throw error
      return (data ?? []) as ChannelRow[]
    },
  })
}

export function useDashboardLogistics(filters: DashboardFilters) {
  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, "dashboard-logistics", filters],
    queryFn: async () => {
      const { data, error } = await getSalesClient()
        .rpc("get_dashboard_logistics", buildRpcParams(filters))
      if (error) throw error
      return (data ?? []) as LogisticsRow[]
    },
  })
}

export function useDashboardAbc(filters: DashboardFilters) {
  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, "dashboard-abc", filters],
    queryFn: async () => {
      let query = getSalesClient()
        .from("client_item_abc_curve")
        .select("*")
        .order("abc_class", { ascending: true })
        .order("rank", { ascending: true })

      if (filters.clientIds?.length) {
        if (filters.clientIds.length === 1) {
          query = query.eq("client_id", filters.clientIds[0])
        } else {
          query = query.in("client_id", filters.clientIds)
        }
      }

      if (filters.dateFrom) {
        query = query.gte("year_month", filters.dateFrom.substring(0, 7))
      }

      if (filters.dateTo) {
        query = query.lte("year_month", filters.dateTo.substring(0, 7))
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as AbcItemRow[]
    },
  })
}

export function useAbcSummary(filters: DashboardFilters) {
  const abc = useDashboardAbc(filters)
  const items = abc.data ?? []
  const aItems = items.filter((i) => i.abc_class === "A")
  const bItems = items.filter((i) => i.abc_class === "B")
  const cItems = items.filter((i) => i.abc_class === "C")
  const aRevenue = aItems.reduce((s, i) => s + Number(i.total_revenue), 0)
  const bRevenue = bItems.reduce((s, i) => s + Number(i.total_revenue), 0)
  const cRevenue = cItems.reduce((s, i) => s + Number(i.total_revenue), 0)
  const totalRevenue = aRevenue + bRevenue + cRevenue
  return {
    items, aItems, aCount: aItems.length, aRevenue,
    bItems, bCount: bItems.length, bRevenue,
    cItems, cCount: cItems.length, cRevenue,
    totalRevenue, isLoading: abc.isLoading,
  }
}
