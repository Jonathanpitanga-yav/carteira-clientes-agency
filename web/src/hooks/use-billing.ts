import { useQuery } from "@tanstack/react-query"
import { createSchemaClient, createCoreClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"
import { useAuth } from "@/providers/auth-provider"

function getSalesClient() {
  return createSchemaClient("sales")
}

export type MonthlyBillingRow = {
  client_id: string | null
  client_name: string | null
  year_month: string | null
  total_approved: number | null
  total_canceled: number | null
  total_gross: number | null
  approved_count: number | null
}

type DailyBillingRow = {
  client_id: string | null
  date: string | null
  total_approved: number | null
  order_count: number | null
}

export type ClientRankingRow = {
  client_id: string | null
  client_name: string | null
  year_month: string | null
  total_approved: number | null
  approved_count: number | null
  rank: number | null
  prev_rank: number | null
}

export type MarketplaceRankingRow = {
  marketplace_slug: string | null
  year_month: string | null
  total_revenue: number | null
  order_count: number | null
  rank: number | null
  prev_rank: number | null
}

export type EcommerceRankingRow = {
  ecommerce_slug: string | null
  year_month: string | null
  total_revenue: number | null
  order_count: number | null
  rank: number | null
  prev_rank: number | null
}

export type ChannelRevenueRow = {
  channel_slug: string | null
  year_month: string | null
  total_revenue: number | null
  order_count: number | null
}

export function getCurrentYearMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function getPreviousYearMonth(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  return getCurrentYearMonth(d)
}

function aggregateMonthRows(rows: MonthlyBillingRow[], yearMonth: string) {
  const filtered = rows.filter((r) => r.year_month === yearMonth)
  return {
    total_approved: filtered.reduce((sum, r) => sum + Number(r.total_approved ?? 0), 0),
    approved_count: filtered.reduce((sum, r) => sum + Number(r.approved_count ?? 0), 0),
  }
}

export function useMyClientIds() {
  const { user } = useAuth()

  return useQuery({
    queryKey: [QUERY_KEYS.CLIENTS, "my-ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await createCoreClient()
        .from("client_users")
        .select("client_id")
        .eq("user_id", user!.id)

      if (error) throw error
      return (data ?? []).map((r) => r.client_id as string)
    },
  })
}

export function useMonthlyBilling(clientIds?: string | string[]) {
  const ids = clientIds
    ? Array.isArray(clientIds)
      ? clientIds
      : [clientIds]
    : undefined

  return useQuery({
    queryKey: [QUERY_KEYS.BILLING, "monthly", ids],
    queryFn: async () => {
      let query = getSalesClient()
        .from("client_monthly_billing")
        .select("*")
        .order("year_month", { ascending: false })

      if (ids?.length === 1) {
        query = query.eq("client_id", ids[0])
      }

      const { data, error } = await query
      if (error) throw error

      const rows = (data ?? []) as MonthlyBillingRow[]
      if (ids && ids.length > 1) {
        return rows.filter((r) => r.client_id && ids.includes(r.client_id))
      }
      return rows
    },
  })
}

export function useDailyBilling(clientIds?: string | string[]) {
  const ids = clientIds
    ? Array.isArray(clientIds)
      ? clientIds
      : [clientIds]
    : undefined

  return useQuery({
    queryKey: [QUERY_KEYS.DAILY_BILLING, ids],
    queryFn: async () => {
      let query = getSalesClient()
        .from("daily_billing")
        .select("*")
        .order("date", { ascending: false })
        .limit(90)

      if (ids?.length === 1) {
        query = query.eq("client_id", ids[0])
      }

      const { data, error } = await query
      if (error) throw error

      const rows = (data ?? []) as DailyBillingRow[]
      if (ids && ids.length > 1) {
        return rows.filter((r) => r.client_id && ids.includes(r.client_id))
      }
      return rows
    },
  })
}

export function useBillingSummary(clientIds?: string | string[]) {
  const monthly = useMonthlyBilling(clientIds)
  const daily = useDailyBilling(clientIds)

  const currentYm = getCurrentYearMonth()
  const prevYm = getPreviousYearMonth()

  const current = aggregateMonthRows(monthly.data ?? [], currentYm)
  const previous = aggregateMonthRows(monthly.data ?? [], prevYm)

  const avgTicket = current.approved_count > 0 ? current.total_approved / current.approved_count : 0
  const previousAvgTicket =
    previous.approved_count > 0 ? previous.total_approved / previous.approved_count : 0

  const summary = {
    monthlyApproved: current.total_approved,
    monthlyOrders: current.approved_count,
    previousMonthApproved: previous.total_approved,
    previousMonthOrders: previous.approved_count,
    avgTicket,
    previousAvgTicket,
    variation:
      previous.total_approved > 0
        ? (current.total_approved - previous.total_approved) / previous.total_approved
        : 0,
    ordersVariation:
      previous.approved_count > 0
        ? (current.approved_count - previous.approved_count) / previous.approved_count
        : 0,
    avgTicketVariation:
      previousAvgTicket > 0 ? (avgTicket - previousAvgTicket) / previousAvgTicket : 0,
    dailyData: daily.data ?? [],
    monthlyData: monthly.data ?? [],
  }

  return { summary, isLoading: monthly.isLoading || daily.isLoading }
}

export function useClientBillingSummary() {
  const { data: clientIds, isLoading: idsLoading } = useMyClientIds()
  const billing = useBillingSummary(clientIds)

  return {
    ...billing,
    isLoading: idsLoading || billing.isLoading,
    clientIds,
  }
}

export function useClientRanking(limit = 10) {
  const currentYm = getCurrentYearMonth()

  return useQuery({
    queryKey: [QUERY_KEYS.BILLING, "client-ranking", currentYm, limit],
    queryFn: async () => {
      const { data, error } = await getSalesClient()
        .from("client_monthly_ranking")
        .select("*")
        .eq("year_month", currentYm)
        .order("rank", { ascending: true })
        .limit(limit)

      if (error) throw error
      return (data ?? []) as ClientRankingRow[]
    },
  })
}

export function useMarketplaceRanking(limit = 8) {
  const currentYm = getCurrentYearMonth()

  return useQuery({
    queryKey: [QUERY_KEYS.BILLING, "marketplace-ranking", currentYm, limit],
    queryFn: async () => {
      const { data, error } = await getSalesClient()
        .from("marketplace_monthly_ranking")
        .select("*")
        .eq("year_month", currentYm)
        .neq("marketplace_slug", "unknown")
        .order("rank", { ascending: true })
        .limit(limit)

      if (error) throw error
      return (data ?? []) as MarketplaceRankingRow[]
    },
  })
}

export function useEcommerceRanking(limit = 8) {
  const currentYm = getCurrentYearMonth()

  return useQuery({
    queryKey: [QUERY_KEYS.BILLING, "ecommerce-ranking", currentYm, limit],
    queryFn: async () => {
      const { data, error } = await getSalesClient()
        .from("ecommerce_monthly_ranking")
        .select("*")
        .eq("year_month", currentYm)
        .order("rank", { ascending: true })
        .limit(limit)

      if (error) throw error
      return (data ?? []) as EcommerceRankingRow[]
    },
  })
}

export function useChannelRevenue() {
  const currentYm = getCurrentYearMonth()
  const prevYm = getPreviousYearMonth()

  return useQuery({
    queryKey: [QUERY_KEYS.BILLING, "channel-revenue", currentYm, prevYm],
    queryFn: async () => {
      const { data, error } = await getSalesClient()
        .from("channel_monthly_revenue")
        .select("*")
        .in("year_month", [currentYm, prevYm])
        .in("channel_slug", ["marketplace", "ecommerce"])

      if (error) throw error
      const rows = (data ?? []) as ChannelRevenueRow[]
      return {
        current: rows.filter((r) => r.year_month === currentYm),
        previous: rows.filter((r) => r.year_month === prevYm),
      }
    },
  })
}
