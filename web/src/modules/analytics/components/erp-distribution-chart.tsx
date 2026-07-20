"use client"

import { useErpDistribution } from "@/hooks/use-analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompactCurrency } from "@/lib/utils/format"
import { cn } from "@/lib/utils"
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts"

const ERP_COLORS = [
  "#00F6F6", "#6e29f6", "#8B5CF6", "#EC4899", "#F59E0B",
  "#06b6d4", "#10b981", "#f97316", "#ef4444", "#6b7280",
]

export function ErpDistributionChart() {
  const { data, isLoading } = useErpDistribution()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Distribuição por ERP</CardTitle>
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
          <CardTitle className="text-base font-heading">Distribuição por ERP</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum dado no mês atual.</p>
        </CardContent>
      </Card>
    )
  }

  const totalRevenue = data.reduce((s, r) => s + Number(r.total_revenue), 0)
  const chartData = data.map((r) => ({
    name: r.erp_provider === "unknown" ? "Outros" : r.erp_provider,
    value: Number(r.total_revenue),
    clientes: r.client_count,
    pedidos: r.order_count,
    share: totalRevenue > 0 ? (Number(r.total_revenue) / totalRevenue) * 100 : 0,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-heading">Distribuição por ERP</CardTitle>
        <p className="text-xs text-muted-foreground">{data.length} provedor(es) de ERP ativos</p>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                {chartData.map((_, index) => (
                  <Cell key={index} fill={ERP_COLORS[index % ERP_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name, props) => {
                  if (name === "value" && typeof value === "number") {
                    const row = props.payload
                    return [
                      <div key="tooltip" className="space-y-1 text-xs">
                        <p className="font-medium">{row.name}</p>
                        <p className="tabular-nums">{formatCompactCurrency(value)}</p>
                        <p className="text-muted-foreground">{row.pedidos} pedidos · {row.clientes} clientes · {row.share.toFixed(1)}%</p>
                      </div>,
                      null,
                    ]
                  }
                  return [value, name]
                }}
              />
              <Legend verticalAlign="bottom" height={36} formatter={(value: string) => <span className="text-xs">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 space-y-2">
          {data.map((row, index) => {
            const revenue = Number(row.total_revenue)
            const share = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
            return (
              <div key={row.erp_provider} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ERP_COLORS[index % ERP_COLORS.length] }} />
                  <span className="font-medium">{row.erp_provider === "unknown" ? "Outros" : row.erp_provider}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">({row.client_count} {row.client_count === 1 ? "cliente" : "clientes"})</span>
                </div>
                <div className="flex items-center gap-3 tabular-nums">
                  <span className="text-xs text-muted-foreground">{row.order_count} {row.order_count === 1 ? "pedido" : "pedidos"}</span>
                  <span className="font-semibold w-24 text-right">{formatCompactCurrency(revenue)}</span>
                  <span className="text-xs text-muted-foreground w-12 text-right">{share.toFixed(1)}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
