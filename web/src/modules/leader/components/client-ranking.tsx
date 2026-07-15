"use client"

import { useClientRanking } from "@/hooks/use-billing"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompactCurrency } from "@/lib/utils/format"
import { RankPosition } from "@/modules/dashboard/components/rank-movement"
import { Trophy } from "lucide-react"
import Link from "next/link"

type ClientRankingProps = {
  clientLinkPrefix?: string
  limit?: number
}

export function ClientRanking({
  clientLinkPrefix = "/leader/clients",
  limit = 50,
}: ClientRankingProps) {
  const { data: ranking, isLoading } = useClientRanking(limit)

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-heading">Ranking de clientes</CardTitle>
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
          <CardTitle className="text-base font-heading">Ranking de clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum faturamento no mês atual.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex h-full max-h-[520px] flex-col">
      <CardHeader className="shrink-0 pb-2">
        <CardTitle className="text-base font-heading">Ranking de clientes</CardTitle>
        <p className="text-xs text-muted-foreground">{ranking.length} clientes no mês</p>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-1">
          {ranking.map((row) => {
            const position = row.rank ?? 0
            const orders = Number(row.approved_count ?? 0)
            return (
              <Link
                key={row.client_id}
                href={`${clientLinkPrefix}/${row.client_id}`}
                className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-sm hover:bg-muted transition-colors"
              >
                <RankPosition rank={row.rank} prevRank={row.prev_rank}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {position === 1 ? (
                      <Trophy className="h-4 w-4 text-amber-500" />
                    ) : (
                      position
                    )}
                  </span>
                </RankPosition>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{row.client_name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {orders} {orders === 1 ? "pedido" : "pedidos"}
                  </p>
                </div>
                <span className="shrink-0 text-right font-semibold tabular-nums">
                  {formatCompactCurrency(Number(row.total_approved ?? 0))}
                </span>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
