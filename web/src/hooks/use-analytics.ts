import { useQuery } from "@tanstack/react-query"
import { createSchemaClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"
import { getCurrentYearMonth, getPreviousYearMonth } from "@/hooks/use-billing"
import { subMonths, format } from "date-fns"

function getSalesClient() {
  return createSchemaClient("sales")
}

export type PortfolioRow = {
  year_month: string
  active_clients: number
  total_orders: number
  total_gmv: number
  total_canceled: number
  total_gross: number
  avg_ticket: number
}

export type ClientConcentrationRow = {
  client_id: string
  client_name: string
  year_month: string
  revenue: number
  orders: number
  share_pct: number
  rank: number
}

export type ErpDistributionRow = {
  erp_provider: string
  year_month: string
  client_count: number
  order_count: number
  total_revenue: number
}

export type ChannelBenchmarkRow = {
  channel_slug: string
  client_count: number
  total_orders: number
  total_revenue: number
  avg_ticket: number
}

export type MonthlyTrendRow = {
  year_month: string
  total_gmv: number
  total_orders: number
}

export type PortfolioSummary = {
  current: PortfolioRow | null
  previous: PortfolioRow | null
}

function aggregateRows(rows: PortfolioRow[], yearMonth: string) {
  return rows.find((r) => r.year_month === yearMonth) ?? null
}

export function usePortfolioOverview(yearMonth?: string) {
  const currentYm = yearMonth ?? getCurrentYearMonth()
  const prevYm = getPreviousYearMonth(new Date(currentYm + "-01"))

  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, "portfolio", currentYm, prevYm],
    queryFn: async () => {
      const { data, error } = await getSalesClient()
        .from("agency_portfolio_overview")
        .select("*")
        .in("year_month", [currentYm, prevYm])
        .order("year_month", { ascending: false })

      if (error) throw error
      const rows = (data ?? []) as PortfolioRow[]
      return {
        current: aggregateRows(rows, currentYm),
        previous: aggregateRows(rows, prevYm),
      } as PortfolioSummary
    },
  })
}

export function useMonthlyTrend(months = 12) {
  const today = new Date()
  const yearMonths: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = subMonths(today, i)
    yearMonths.push(format(d, "yyyy-MM"))
  }

  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, "monthly-trend", months],
    queryFn: async () => {
      const { data, error } = await getSalesClient()
        .from("agency_portfolio_overview")
        .select("year_month, total_gmv, total_orders")
        .in("year_month", yearMonths)
        .order("year_month", { ascending: true })

      if (error) throw error
      const rows = (data ?? []) as MonthlyTrendRow[]
      const map = new Map(rows.map((r) => [r.year_month, r]))
      return yearMonths.map((ym) => map.get(ym) ?? { year_month: ym, total_gmv: 0, total_orders: 0 })
    },
  })
}

export function useClientConcentration(limit = 20, clientIds?: string[]) {
  const currentYm = getCurrentYearMonth()

  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, "concentration", currentYm, limit, clientIds],
    queryFn: async () => {
      const { data, error } = await getSalesClient()
        .from("agency_client_concentration")
        .select("*")
        .eq("year_month", currentYm)
        .order("rank", { ascending: true })
        .limit(limit)

      if (error) throw error
      let rows = (data ?? []) as ClientConcentrationRow[]
      if (clientIds?.length) {
        rows = rows.filter((r) => clientIds.includes(r.client_id))
      }
      return rows
    },
  })
}

export function useErpDistribution() {
  const currentYm = getCurrentYearMonth()

  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, "erp-distribution", currentYm],
    queryFn: async () => {
      const { data, error } = await getSalesClient()
        .from("agency_erp_distribution")
        .select("*")
        .eq("year_month", currentYm)
        .order("total_revenue", { ascending: false })

      if (error) throw error
      return (data ?? []) as ErpDistributionRow[]
    },
  })
}

export function useChannelBenchmarks() {
  return useQuery({
    queryKey: [QUERY_KEYS.ANALYTICS, "channel-benchmarks"],
    queryFn: async () => {
      const { data, error } = await getSalesClient()
        .from("agency_channel_benchmarks")
        .select("*")
        .neq("channel_slug", "unknown")
        .order("total_revenue", { ascending: false })

      if (error) throw error
      return (data ?? []) as ChannelBenchmarkRow[]
    },
  })
}
