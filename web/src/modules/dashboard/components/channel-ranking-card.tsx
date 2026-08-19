"use client"

import { useChannelRevenue, type ChannelRevenueRow } from "@/hooks/use-billing"
import { PeriodComparison } from "@/modules/dashboard/components/period-comparison"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompactCurrency } from "@/lib/utils/format"
import { cn } from "@/lib/utils"
import { Store, ShoppingBag } from "lucide-react"

const STORE_TYPE_LABELS: Record<string, string> = {
  marketplace: "Marketplace",
  ecommerce: "E-commerce",
}

const STORE_TYPE_COLORS: Record<string, string> = {
  marketplace: "bg-brand",
  ecommerce: "bg-brand-purple",
}

const STORE_TYPE_ICONS: Record<string, typeof Store> = {
  marketplace: ShoppingBag,
  ecommerce: Store,
}

function findChannelRow(rows: ChannelRevenueRow[], slug: string) {
  return rows.find((r) => r.channel_slug === slug)
}

type ChannelRankingCardProps = {
  yearMonth?: string
}

export function ChannelRankingCard({ yearMonth }: ChannelRankingCardProps) {
  const { data, isLoading } = useChannelRevenue(yearMonth)

  const rows = (data?.current ?? []).slice().sort((a, b) => Number(b.total_revenue ?? 0) - Number(a.total_revenue ?? 0))
  const previousRows = data?.previous ?? []
  const totalRevenue = rows.reduce((sum, r) => sum + Number(r.total_revenue ?? 0), 0)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Tipo de loja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
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
          <p className="text-sm text-muted-foreground">Sem faturamento no período.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex h-full max-h-[520px] flex-col">
      <CardHeader className="shrink-0 pb-1">
        <CardTitle className="text-base font-heading">Tipo de loja</CardTitle>
        <p className="text-xs text-muted-foreground">Marketplace vs E-commerce por faturamento</p>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted mb-3">
          {rows.map((row) => {
            const slug = row.channel_slug ?? "unknown"
            const pct = totalRevenue > 0 ? (Number(row.total_revenue ?? 0) / totalRevenue) * 100 : 0
            if (pct <= 0) return null
            return (
              <div
                key={slug}
                className={cn("h-full transition-all", STORE_TYPE_COLORS[slug] ?? "bg-gray-400")}
                style={{ width: `${pct}%` }}
              />
            )
          })}
        </div>

        {rows.map((row, index) => {
          const slug = row.channel_slug ?? "unknown"
          const revenue = Number(row.total_revenue ?? 0)
          const orders = Number(row.order_count ?? 0)
          const share = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
          const prev = findChannelRow(previousRows, slug)
          const prevRevenue = Number(prev?.total_revenue ?? 0)
          const Icon = STORE_TYPE_ICONS[slug] ?? Store
          const colorDot = STORE_TYPE_COLORS[slug] ?? "bg-gray-400"

          return (
            <div
              key={slug}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50",
                index === 0 && "bg-muted/20",
              )}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums">
                {index + 1}
              </span>
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", colorDot)} />
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 font-medium truncate">{STORE_TYPE_LABELS[slug] ?? slug}</span>
              <div className="flex items-center gap-3 tabular-nums text-xs text-muted-foreground shrink-0">
                <span>{orders} ped.</span>
                <span className="w-10 text-right">{share.toFixed(0)}%</span>
                <PeriodComparison current={revenue} previous={prevRevenue} format="percent" />
              </div>
              <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums">
                {formatCompactCurrency(revenue)}
              </span>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
