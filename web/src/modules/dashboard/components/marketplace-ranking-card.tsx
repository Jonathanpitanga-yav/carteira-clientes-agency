"use client"

import { useMarketplaceRanking, type MarketplaceRankingRow } from "@/hooks/use-billing"
import { useChannelBenchmarks } from "@/hooks/use-analytics"
import { getGlobalMarketplaceDisplay } from "@/hooks/use-orders"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompactCurrency } from "@/lib/utils/format"
import { RankPosition } from "@/modules/dashboard/components/rank-movement"
import { Store, ShoppingBag } from "lucide-react"

type MarketplaceRankingCardProps = {
  yearMonth?: string
}

export function MarketplaceRankingCard({ yearMonth }: MarketplaceRankingCardProps) {
  const { data: rankingRaw, isLoading: rankingLoading } = useMarketplaceRanking(12, yearMonth)
  const { data: benchmarks, isLoading: benchmarksLoading } = useChannelBenchmarks()
  const ranking = (rankingRaw ?? []) as MarketplaceRankingRow[]

  const isLoading = rankingLoading || benchmarksLoading

  if (isLoading) {
    return (
      <Card className="h-full max-h-[520px]">
        <CardHeader>
          <CardTitle className="text-base font-heading">Ranking de marketplaces</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!ranking.length && !benchmarks?.length) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-heading">Ranking de marketplaces</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum canal com vendas no período.</p>
        </CardContent>
      </Card>
    )
  }

  const totalBenchmarkRevenue = benchmarks ? benchmarks.reduce((s, r) => s + Number(r.total_revenue), 0) : 0

  return (
    <Card className="flex h-full max-h-[520px] flex-col">
      <CardHeader className="shrink-0 pb-1">
        <CardTitle className="text-base font-heading">Ranking de marketplaces</CardTitle>
        <p className="text-xs text-muted-foreground">Marketplaces por faturamento</p>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {ranking.length > 0 && (
          <div className="space-y-1">
            {ranking.map((row) => (
              <div
                key={row.marketplace_slug}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm"
              >
                <RankPosition rank={row.rank} prevRank={row.prev_rank}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {row.rank}
                  </span>
                </RankPosition>
                <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {getGlobalMarketplaceDisplay(row.marketplace_slug)}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {Number(row.order_count ?? 0)} pedidos
                  </p>
                </div>
                <span className="shrink-0 text-right font-semibold tabular-nums">
                  {formatCompactCurrency(Number(row.total_revenue ?? 0))}
                </span>
              </div>
            ))}
          </div>
        )}

        {benchmarks && benchmarks.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Benchmark por canal</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-1.5 font-medium">Canal</th>
                    <th className="pb-1.5 font-medium tabular-nums">Clientes</th>
                    <th className="pb-1.5 font-medium tabular-nums">Pedidos</th>
                    <th className="pb-1.5 font-medium tabular-nums text-right">Ticket</th>
                    <th className="pb-1.5 font-medium tabular-nums text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarks.map((row) => {
                    const revenue = Number(row.total_revenue)
                    const share = totalBenchmarkRevenue > 0 ? (revenue / totalBenchmarkRevenue) * 100 : 0
                    return (
                      <tr key={row.channel_slug} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-1.5">
                            <ShoppingBag className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="truncate font-medium">{getGlobalMarketplaceDisplay(row.channel_slug)}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-2 tabular-nums text-muted-foreground">{row.client_count}</td>
                        <td className="py-2 pr-2 tabular-nums">{row.total_orders.toLocaleString("pt-BR")}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{formatCompactCurrency(Number(row.avg_ticket))}</td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">{share.toFixed(1)}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
