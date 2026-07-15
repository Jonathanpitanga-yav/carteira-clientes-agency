"use client"

import { useClientAbcSummary } from "@/hooks/use-client-analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompactCurrency } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

const ABC_BADGE: Record<string, { label: string; class: string }> = {
  A: { label: "A", class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  B: { label: "B", class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  C: { label: "C", class: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
}

export function ClientAbcCurve() {
  const { items, aCount, bCount, cCount, aRevenue, bRevenue, cRevenue, totalRevenue, isLoading } = useClientAbcSummary()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Curva ABC de Itens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  if (!items.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Curva ABC de Itens</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum item vendido no período.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold", ABC_BADGE.A.class)}>A</span>
            <span className="text-sm font-medium text-muted-foreground">Itens A (80%)</span>
          </div>
          <p className="mt-2 text-2xl font-bold font-heading">{aCount}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{formatCompactCurrency(aRevenue)} — {totalRevenue > 0 ? ((aRevenue / totalRevenue) * 100).toFixed(0) : 0}% do total</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold", ABC_BADGE.B.class)}>B</span>
            <span className="text-sm font-medium text-muted-foreground">Itens B (15%)</span>
          </div>
          <p className="mt-2 text-2xl font-bold font-heading">{bCount}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{formatCompactCurrency(bRevenue)} — {totalRevenue > 0 ? ((bRevenue / totalRevenue) * 100).toFixed(0) : 0}% do total</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold", ABC_BADGE.C.class)}>C</span>
            <span className="text-sm font-medium text-muted-foreground">Itens C (5%)</span>
          </div>
          <p className="mt-2 text-2xl font-bold font-heading">{cCount}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{formatCompactCurrency(cRevenue)} — {totalRevenue > 0 ? ((cRevenue / totalRevenue) * 100).toFixed(0) : 0}% do total</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading">Todos os itens</CardTitle>
          <p className="text-xs text-muted-foreground">{items.length} itens classificados por faturamento</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Classif.</th>
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
                  <tr key={row.product_id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="py-2.5 pr-3">
                      <span className={cn("inline-flex h-5 w-6 items-center justify-center rounded text-xs font-bold", ABC_BADGE[row.abc_class]?.class)}>
                        {row.abc_class}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground max-w-[100px] truncate">{row.sku ?? "—"}</td>
                    <td className="py-2.5 pr-3 font-medium max-w-[200px] truncate">{row.product_name}</td>
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
        </CardContent>
      </Card>
    </div>
  )
}
