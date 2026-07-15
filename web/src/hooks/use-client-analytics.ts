import { useQuery } from "@tanstack/react-query"
import { createSchemaClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"
import { getCurrentYearMonth } from "@/hooks/use-billing"

function getSalesClient() {
  return createSchemaClient("sales")
}

export type ChannelBreakdownRow = {
  client_id: string
  client_name: string | null
  channel_slug: string
  year_month: string
  order_count: number
  total_revenue: number
  avg_ticket: number
}

export type LogisticsBreakdownRow = {
  client_id: string
  client_name: string | null
  logistics_slug: string
  year_month: string
  order_count: number
  total_revenue: number
}

export type AbcItemRow = {
  client_id: string
  client_name: string | null
  product_id: string
  product_name: string
  sku: string | null
  category: string | null
  total_revenue: number
  total_quantity: number
  order_count: number
  rank: number
  cumulative_pct: number
  abc_class: "A" | "B" | "C"
}

export function useClientChannelBreakdown() {
  const currentYm = getCurrentYearMonth()

  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, "channel-breakdown", currentYm],
    queryFn: async () => {
      const { data, error } = await getSalesClient()
        .from("client_channel_breakdown")
        .select("*")
        .eq("year_month", currentYm)
        .neq("channel_slug", "unknown")
        .order("total_revenue", { ascending: false })

      if (error) throw error
      return (data ?? []) as ChannelBreakdownRow[]
    },
  })
}

export function useClientLogisticsBreakdown() {
  const currentYm = getCurrentYearMonth()

  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, "logistics-breakdown", currentYm],
    queryFn: async () => {
      const { data, error } = await getSalesClient()
        .from("client_logistics_breakdown")
        .select("*")
        .eq("year_month", currentYm)
        .order("total_revenue", { ascending: false })

      if (error) throw error
      return (data ?? []) as LogisticsBreakdownRow[]
    },
  })
}

export function useClientAbcCurve() {
  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, "abc-curve"],
    queryFn: async () => {
      const { data, error } = await getSalesClient()
        .from("client_item_abc_curve")
        .select("*")
        .order("abc_class", { ascending: true })
        .order("total_revenue", { ascending: false })

      if (error) throw error
      return (data ?? []) as AbcItemRow[]
    },
  })
}

export function useClientAbcSummary() {
  const abc = useClientAbcCurve()

  const items = abc.data ?? []
  const aItems = items.filter((i) => i.abc_class === "A")
  const bItems = items.filter((i) => i.abc_class === "B")
  const cItems = items.filter((i) => i.abc_class === "C")

  const aRevenue = aItems.reduce((s, i) => s + Number(i.total_revenue), 0)
  const bRevenue = bItems.reduce((s, i) => s + Number(i.total_revenue), 0)
  const cRevenue = cItems.reduce((s, i) => s + Number(i.total_revenue), 0)
  const totalRevenue = aRevenue + bRevenue + cRevenue

  return {
    items,
    aItems, aCount: aItems.length, aRevenue,
    bItems, bCount: bItems.length, bRevenue,
    cItems, cCount: cItems.length, cRevenue,
    totalRevenue,
    isLoading: abc.isLoading,
  }
}
