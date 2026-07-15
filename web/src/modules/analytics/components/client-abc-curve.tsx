"use client"

import { useState } from "react"
import { useAbcSummary, useDashboardAbc } from "@/hooks/use-client-analytics"
import type { DashboardFilters } from "@/hooks/use-client-analytics"
import { ClientDashboardFilters } from "@/modules/analytics/components/filters/client-dashboard-filters"
import { RankPosition } from "@/modules/dashboard/components/rank-movement"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompactCurrency } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

const ABC_BADGE: Record<string, { label: string; class: string }> = {
  A: { label: "A", class: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  B: { label: "B", class: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  C: { label: "C", class: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
}

export function ClientAbcCurve() {
  const [filters, setFilters] = useState<DashboardFilters>({})
  const { data: rawItems, isLoading: rawLoading } = useDashboardAbc(filters)
  const { aCount, bCount, cCount, aRevenue, bRevenue, cRevenue, totalRevenue, isLoading } = useAbcSummary(filters)

  const items = (rawItems ?? []).sort((a, b) => {
    if (a.abc_class !== b.abc_class) return a.abc_class < b.abc_class ? -1 : 1
    return a.rank - b.rank
  })

  return (
    <div className="space-y-4">
      <ClientDashboardFilters filters={filters} onChange={setFilters} />

      <div className="grid gap-4 md:grid-cols-3">
        {([
          { cls: "A", label: "A — 80%", count: aCount, revenue: aRevenue },
          { cls: "B", label: "B — 15%", count: bCount, revenue: bRevenue },
          { cls: "C", label: "C — 5%", count: cCount, revenue: cRevenue },
        ] as const).map(({ cls, label, count, revenue }) => (
          <div key={cls} className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold", ABC_BADGE[cls].class)}>
                {cls}
              </span>
              <span className="text-sm font-medium text-muted-foreground">{label}</span>
            </div>
            {isLoading ? (
              <Skeleton className="mt-2 h-7 w-24" />
            ) : (
              <>
                <p className="mt-2 text-2xl font-bold font-heading">{count}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatCompactCurrency(revenue)}
                  {totalRevenue > 0 && ` — ${((revenue / totalRevenue) * 100).toFixed(0)}% do total`}
                </p>
              </>
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading">Todos os itens</CardTitle>
          <p className="text-xs text-muted-foreground">
            {items.length} itens — ranking vs período anterior
          </p>
        </CardHeader>
        <CardContent>
          {rawLoading ? (
            <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !items.length ? (
            <p className="text-sm text-muted-foreground">Nenhum item vendido no período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">Mov.</th>
                    <th className="pb-2 font-medium">Classif.</th>
                    <th className="pb-2 font-medium">Cliente</th>
                    <th className="pb-2 font-medium">SKU</th>
                    <th className="pb-2 font-medium">Descrição</th>
                    <th className="pb-2 font-medium">Categoria</th>
                    <th className="pb-2 font-medium tabular-nums text-right">Qtd vendida</th>
                    <th className="pb-2 font-medium tabular-nums text-right">Pedidos</th>
                    <th className="pb-2 font-medium tabular-nums text-right">% Acum.</th>
                    <th className="pb-2 font-medium tabular-nums text-right">Faturamento</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={`${row.client_id}-${row.year_month}-${row.sku}`} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-2.5 pr-2 tabular-nums text-xs text-muted-foreground">{row.rank}</td>
                      <td className="py-2.5 pr-2">
                        <RankPosition rank={row.rank} prevRank={row.prev_rank}>
                          <span />
                        </RankPosition>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={cn("inline-flex h-5 w-6 items-center justify-center rounded text-xs font-bold", ABC_BADGE[row.abc_class]?.class)}>
                          {row.abc_class}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground truncate max-w-[120px]">{row.client_name ?? "—"}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground max-w-[90px] truncate">{row.sku ?? "—"}</td>
                      <td className="py-2.5 pr-3 font-medium max-w-[180px] truncate">{row.product_name}</td>
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground">{row.category ?? "—"}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{Number(row.total_quantity).toLocaleString("pt-BR")}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{row.order_count}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-muted-foreground">{row.cumulative_pct.toFixed(1)}%</td>
                      <td className="py-2.5 text-right font-semibold tabular-nums">{formatCompactCurrency(Number(row.total_revenue))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
