"use client"

import { useClientConcentration } from "@/hooks/use-analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompactCurrency } from "@/lib/utils/format"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts"

const WARNING_THRESHOLD = 20

export function ClientConcentrationChart() {
  const { data, isLoading } = useClientConcentration(15)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Concentração por cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Concentração por cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum dado no mês atual.</p>
        </CardContent>
      </Card>
    )
  }

  const highRisk = data.filter((r) => r.share_pct >= WARNING_THRESHOLD)
  const topConcentration = data[0]?.share_pct ?? 0

  const chartData = data.map((r) => ({
    name: r.client_name ?? "—",
    receita: r.revenue,
    share: r.share_pct,
    pedidos: r.orders,
    isWarning: r.share_pct >= WARNING_THRESHOLD,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-heading">Concentração por cliente</CardTitle>
        <p className="text-xs text-muted-foreground">
          {highRisk.length > 0
            ? `Atenção: ${highRisk.length} cliente(s) com mais de ${WARNING_THRESHOLD}% de dependência`
            : "Distribuição saudável — nenhum cliente ultrapassa 20% do faturamento"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickFormatter={(v: number) => formatCompactCurrency(v)}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === "receita" && typeof value === "number")
                    return [formatCompactCurrency(value), "Receita"]
                  return [value, name]
                }}
                labelFormatter={(label) => `Cliente: ${label}`}
              />
              <Bar dataKey="receita" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.isWarning ? "#ef4444" : "#6e29f6"}
                    fillOpacity={entry.isWarning ? 0.9 : 0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Maior dependência</p>
            <p className="font-semibold tabular-nums">
              {data[0]?.client_name ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {topConcentration.toFixed(1)}% do faturamento
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Clientes com risco</p>
            <p className="font-semibold tabular-nums">
              {highRisk.length}
            </p>
            <p className="text-xs text-muted-foreground">
              {highRisk.length === 1
                ? "cliente acima de 20%"
                : "clientes acima de 20%"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
