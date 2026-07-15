"use client"

import { useMarketplaceRanking } from "@/hooks/use-billing"
import { getGlobalMarketplaceDisplay } from "@/hooks/use-orders"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompactCurrency } from "@/lib/utils/format"
import { RankPosition } from "@/modules/dashboard/components/rank-movement"
import { Store } from "lucide-react"

export function MarketplaceRankingCard() {
  const { data: ranking, isLoading } = useMarketplaceRanking(12)

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

  if (!ranking?.length) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-heading">Ranking de marketplaces</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sem vendas por marketplace no mês.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex h-full max-h-[520px] flex-col">
      <CardHeader className="shrink-0 pb-2">
        <CardTitle className="text-base font-heading">Ranking de marketplaces</CardTitle>
        <p className="text-xs text-muted-foreground">Canais de marketplace (exclui lojas próprias)</p>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-1">
          {ranking.map((row) => (
            <div
              key={row.marketplace_slug}
              className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-sm"
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
      </CardContent>
    </Card>
  )
}
