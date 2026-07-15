"use client"

import { useChannelRevenue, type ChannelRevenueRow } from "@/hooks/use-billing"
import { PeriodComparison } from "@/modules/dashboard/components/period-comparison"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompactCurrency } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

const STORE_TYPE_LABELS: Record<string, string> = {
  marketplace: "Marketplace",
  ecommerce: "E-commerce",
}

const STORE_TYPE_COLORS: Record<string, string> = {
  marketplace: "bg-violet-500",
  ecommerce: "bg-sky-500",
}

function findChannelRow(rows: ChannelRevenueRow[], slug: string) {
  return rows.find((r) => r.channel_slug === slug)
}

export function ChannelRankingCard() {
  const { data, isLoading } = useChannelRevenue()

  const rows = (data?.current ?? []).slice().sort((a, b) => Number(b.total_revenue ?? 0) - Number(a.total_revenue ?? 0))
  const previousRows = data?.previous ?? []
  const totalRevenue = rows.reduce((sum, r) => sum + Number(r.total_revenue ?? 0), 0)
  const totalOrders = rows.reduce((sum, r) => sum + Number(r.order_count ?? 0), 0)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Tipo de loja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!rows.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Tipo de loja</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sem faturamento por tipo de loja no mês.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-heading">Tipo de loja</CardTitle>
        <p className="text-xs text-muted-foreground">
          Marketplace (ML, Shopee, Amazon…) vs E-commerce (Shopify, Nuvemshop…)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {rows.map((row) => {
            const slug = row.channel_slug ?? "unknown"
            const pct = totalRevenue > 0 ? (Number(row.total_revenue ?? 0) / totalRevenue) * 100 : 0
            if (pct <= 0) return null
            return (
              <div
                key={slug}
                className={cn("h-full transition-all", STORE_TYPE_COLORS[slug] ?? "bg-gray-400")}
                style={{ width: `${pct}%` }}
                title={`${STORE_TYPE_LABELS[slug] ?? slug}: ${pct.toFixed(1)}%`}
              />
            )
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((row, index) => {
            const slug = row.channel_slug ?? "unknown"
            const revenue = Number(row.total_revenue ?? 0)
            const orders = Number(row.order_count ?? 0)
            const share = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
            const orderShare = totalOrders > 0 ? (orders / totalOrders) * 100 : 0
            const prev = findChannelRow(previousRows, slug)
            const prevRevenue = Number(prev?.total_revenue ?? 0)
            const prevOrders = Number(prev?.order_count ?? 0)

            return (
              <div
                key={slug}
                className="flex flex-col gap-2 rounded-lg border px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span
                    className={cn("h-2.5 w-2.5 shrink-0 rounded-full", STORE_TYPE_COLORS[slug] ?? "bg-gray-400")}
                  />
                  <span className="font-medium">{STORE_TYPE_LABELS[slug] ?? slug}</span>
                </div>
                <div className="flex items-end justify-between gap-2 pl-9">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="tabular-nums">{orders} pedidos ({orderShare.toFixed(0)}%)</p>
                    <p className="tabular-nums">{share.toFixed(1)}% do faturamento</p>
                    <PeriodComparison
                      current={revenue}
                      previous={prevRevenue}
                      format="percent"
                      prefix="Faturamento"
                    />
                    <PeriodComparison
                      current={orders}
                      previous={prevOrders}
                      format="number"
                      prefix="Pedidos"
                    />
                  </div>
                  <span className="shrink-0 text-lg font-semibold tabular-nums">
                    {formatCompactCurrency(revenue)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
