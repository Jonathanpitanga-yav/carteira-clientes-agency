import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"

function getSupabase() {
  return createClient()
}

type MonthlyBillingRow = {
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

export function useMonthlyBilling(clientId?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.BILLING, clientId],
    queryFn: async () => {
      let query = getSupabase()
        .from("client_monthly_billing")
        .select("*")
        .order("year_month", { ascending: false })

      if (clientId) query = query.eq("client_id", clientId)

      const { data, error } = await query
      if (error) throw error
      return data as MonthlyBillingRow[]
    },
  })
}

export function useDailyBilling(clientId?: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.DAILY_BILLING, clientId],
    queryFn: async () => {
      let query = getSupabase()
        .from("daily_billing")
        .select("*")
        .order("date", { ascending: false })
        .limit(30)

      if (clientId) query = query.eq("client_id", clientId)

      const { data, error } = await query
      if (error) throw error
      return data as DailyBillingRow[]
    },
  })
}

export function useBillingSummary(clientId?: string) {
  const monthly = useMonthlyBilling(clientId)
  const daily = useDailyBilling(clientId)

  const currentMonth = monthly.data?.[0]
  const prevMonth = monthly.data?.[1]

  const summary = {
    monthlyApproved: currentMonth?.total_approved ?? 0,
    monthlyOrders: currentMonth?.approved_count ?? 0,
    previousMonthApproved: prevMonth?.total_approved ?? 0,
    variation:
      prevMonth?.total_approved && prevMonth.total_approved > 0
        ? ((currentMonth?.total_approved ?? 0) - prevMonth.total_approved) /
          prevMonth.total_approved
        : 0,
    dailyData: daily.data ?? [],
    monthlyData: monthly.data ?? [],
  }

  return { summary, isLoading: monthly.isLoading || daily.isLoading }
}
