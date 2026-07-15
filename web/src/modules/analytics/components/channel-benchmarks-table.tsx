"use client"

import { useChannelBenchmarks } from "@/hooks/use-analytics"
import { getGlobalMarketplaceDisplay } from "@/hooks/use-orders"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompactCurrency } from "@/lib/utils/format"
import { cn } from "@/lib/utils"
import { ShoppingBag } from "lucide-react"

function getChannelDisplay(slug: string): { label: string; icon: React.ReactNode } {
  const base = getGlobalMarketplaceDisplay(slug)
  return {
    label: base,
    icon: <ShoppingBag className="h-4 w-4 shrink-0 text-muted-foreground" />,
  }
}

export function ChannelBenchmarksTable() {
  const { data, isLoading } = useChannelBenchmarks()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Benchmarks de canais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!data?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Benchmarks de canais</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum canal com vendas no período.</p>
        </CardContent>
      </Card>
    )
  }

  const totalRevenue = data.reduce((s, r) => s + Number(r.total_revenue), 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-heading">Benchmarks de canais</CardTitle>
        <p className="text-xs text-muted-foreground">
          Performance consolidada por canal, independente do cliente
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Canal</th>
                <th className="pb-2 font-medium tabular-nums">Clientes</th>
                <th className="pb-2 font-medium tabular-nums">Pedidos</th>
                <th className="pb-2 font-medium tabular-nums text-right">Ticket médio</th>
                <th className="pb-2 font-medium tabular-nums text-right">Receita</th>
                <th className="pb-2 font-medium tabular-nums text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => {
                const revenue = Number(row.total_revenue)
                const share = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
                const { label, icon } = getChannelDisplay(row.channel_slug)
                const isTop = index < 3
                return (
                  <tr
                    key={row.channel_slug}
                    className={cn(
                      "border-b last:border-0 transition-colors hover:bg-muted/50",
                    )}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        {isTop ? (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {index + 1}
                          </span>
                        ) : (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                            {index + 1}
                          </span>
                        )}
                        {icon}
                        <span className="font-medium truncate">{label}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 tabular-nums">
                      {row.client_count}
                    </td>
                    <td className="py-3 pr-4 tabular-nums">
                      {row.total_orders.toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {formatCompactCurrency(Number(row.avg_ticket))}
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold tabular-nums">
                      {formatCompactCurrency(revenue)}
                    </td>
                    <td className="py-3 text-right tabular-nums text-muted-foreground">
                      {share.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
