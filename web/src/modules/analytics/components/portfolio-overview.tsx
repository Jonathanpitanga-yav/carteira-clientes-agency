"use client"

import { useState } from "react"
import { usePortfolioOverview, useMonthlyTrend } from "@/hooks/use-analytics"
import { StatCard } from "@/components/shared/stat-card"
import { PeriodComparison } from "@/modules/dashboard/components/period-comparison"
import { ClientRanking } from "@/modules/leader/components/client-ranking"
import { MarketplaceRankingCard } from "@/modules/dashboard/components/marketplace-ranking-card"
import { EcommerceRankingCard } from "@/modules/dashboard/components/ecommerce-ranking-card"
import { ChannelRankingCard } from "@/modules/dashboard/components/channel-ranking-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompactCurrency } from "@/lib/utils/format"
import { TrendingUp, Receipt, DollarSign, Building2 } from "lucide-react"
import { DateRangePicker, getPresetRange } from "@/components/shared/date-range-picker"
import type { DateRange } from "@/components/shared/date-range-picker"
import { format } from "date-fns"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"

type Props = {
  basePath?: string
}

function formatMonthLabel(ym: string) {
  const d = new Date(ym + "-01")
  return format(d, "MMM")
}

export function PortfolioOverview({ basePath = "/admin" }: Props) {
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange("thisMonth"))
  const yearMonth = dateRange.to.substring(0, 7)
  const periodLabel = dateRange.from === dateRange.to
    ? format(new Date(dateRange.to + "T12:00:00"), "d 'de' MMM 'de' yyyy")
    : `${format(new Date(dateRange.from + "T12:00:00"), "d MMM")} a ${format(new Date(dateRange.to + "T12:00:00"), "d MMM")}`

  const { data, isLoading } = usePortfolioOverview(yearMonth)
  const { data: trend, isLoading: trendLoading } = useMonthlyTrend(12)

  const current = data?.current
  const prev = data?.previous

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[260px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Período de referência</label>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
        <div className="text-sm text-muted-foreground tabular-nums">
          Dados mensais de <span className="font-medium text-foreground">{yearMonth}</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="GMV consolidado" icon={<TrendingUp className="h-4 w-4" />} loading={isLoading}>
          <div className="text-2xl font-bold font-heading">{formatCompactCurrency(current?.total_gmv ?? 0)}</div>
          <PeriodComparison current={current?.total_gmv ?? 0} previous={prev?.total_gmv ?? 0} format="percent" className="mt-1" />
        </StatCard>
        <StatCard label="Pedidos no mês" icon={<Receipt className="h-4 w-4" />} loading={isLoading}>
          <div className="text-2xl font-bold font-heading">{current?.total_orders ?? 0}</div>
          <PeriodComparison current={current?.total_orders ?? 0} previous={prev?.total_orders ?? 0} format="number" className="mt-1" />
        </StatCard>
        <StatCard label="Ticket médio" icon={<DollarSign className="h-4 w-4" />} loading={isLoading}>
          <div className="text-2xl font-bold font-heading">{formatCompactCurrency(current?.avg_ticket ?? 0)}</div>
          <PeriodComparison current={current?.avg_ticket ?? 0} previous={prev?.avg_ticket ?? 0} format="percent" className="mt-1" />
        </StatCard>
        <StatCard label="Clientes ativos" icon={<Building2 className="h-4 w-4" />} value={current?.active_clients ?? 0} loading={isLoading} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading">Faturamento Mensal — Últimos 12 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          {trendLoading ? <Skeleton className="h-[220px] w-full" />
          : <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend?.map((r) => ({ label: formatMonthLabel(r.year_month), gmv: r.total_gmv, orders: r.total_orders }))} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v: number) => formatCompactCurrency(v)} tick={{ fontSize: 11 }} width={60} />
                  <Tooltip formatter={(value: any, name: any) => {
                    if (name === "gmv" && typeof value === "number") return [formatCompactCurrency(value), "Faturamento"]
                    return [value, "Pedidos"]
                  }} />
                  <Bar dataKey="gmv" radius={[4, 4, 0, 0]} fill="#6e29f6" fillOpacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          }
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChannelRankingCard yearMonth={yearMonth} />
        <MarketplaceRankingCard yearMonth={yearMonth} />
        <EcommerceRankingCard yearMonth={yearMonth} />
      </div>

      <ClientRanking clientLinkPrefix={`${basePath}/clients`} yearMonth={yearMonth} />
    </div>
  )
}
