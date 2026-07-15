"use client"

import { useState } from "react"
import { useDashboardKpis, useDashboardChannels, useDashboardLogistics } from "@/hooks/use-client-analytics"
import type { DashboardFilters } from "@/hooks/use-client-analytics"
import { ClientDashboardFilters } from "@/modules/analytics/components/filters/client-dashboard-filters"
import { StatCard } from "@/components/shared/stat-card"
import { PeriodComparison } from "@/modules/dashboard/components/period-comparison"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompactCurrency } from "@/lib/utils/format"
import { getGlobalMarketplaceDisplay, getGlobalLogisticsDisplay } from "@/hooks/use-orders"
import { TrendingUp, Receipt, DollarSign } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"

const CHART_COLORS = ["#00F6F6", "#6e29f6", "#8B5CF6", "#EC4899", "#F59E0B", "#06b6d4", "#10b981", "#f97316"]

export function ClientDashboard() {
  const [filters, setFilters] = useState<DashboardFilters>({})

  const { data: kpis, isLoading: kpisLoading } = useDashboardKpis(filters)
  const { data: channels, isLoading: chLoading } = useDashboardChannels(filters)
  const { data: logistics, isLoading: logLoading } = useDashboardLogistics(filters)
  const loading = kpisLoading || chLoading || logLoading

  return (
    <div className="space-y-4">
      <ClientDashboardFilters filters={filters} onChange={setFilters} />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Faturamento" icon={<TrendingUp className="h-4 w-4" />} loading={loading}>
          <div className="text-2xl font-bold font-heading">{formatCompactCurrency(kpis?.total_revenue ?? 0)}</div>
          <PeriodComparison current={kpis?.total_revenue ?? 0} previous={kpis?.prev_total_revenue ?? 0} format="percent" className="mt-1" />
        </StatCard>
        <StatCard label="Pedidos" icon={<Receipt className="h-4 w-4" />} loading={loading}>
          <div className="text-2xl font-bold font-heading">{kpis?.total_orders ?? 0}</div>
          <PeriodComparison current={kpis?.total_orders ?? 0} previous={kpis?.prev_total_orders ?? 0} format="number" className="mt-1" />
        </StatCard>
        <StatCard label="Ticket médio" icon={<DollarSign className="h-4 w-4" />} loading={loading}>
          <div className="text-2xl font-bold font-heading">{formatCompactCurrency(kpis?.avg_ticket ?? 0)}</div>
          <PeriodComparison current={kpis?.avg_ticket ?? 0} previous={kpis?.prev_avg_ticket ?? 0} format="percent" className="mt-1" />
        </StatCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base font-heading">Canais</CardTitle></CardHeader>
          <CardContent>
            {chLoading ? <Skeleton className="h-[250px] w-full" />
            : !channels?.length ? <p className="text-sm text-muted-foreground">Sem dados no período.</p>
            : <>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={channels.map((r) => ({ name: getGlobalMarketplaceDisplay(r.channel_slug), value: Number(r.total_revenue), slug: r.channel_slug }))} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value">
                        {channels.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => typeof v === "number" ? formatCompactCurrency(v) : v} />
                      <Legend verticalAlign="bottom" height={30} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-1">
                  {channels.map((row, i) => {
                    const rev = Number(row.total_revenue)
                    const total = channels.reduce((s, r) => s + Number(r.total_revenue), 0)
                    const share = total > 0 ? (rev / total) * 100 : 0
                    return (
                      <div key={row.channel_slug} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted/50">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="truncate font-medium">{getGlobalMarketplaceDisplay(row.channel_slug)}</span>
                          <span className="text-xs text-muted-foreground">({row.client_count} {row.client_count === 1 ? "cliente" : "clientes"})</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 tabular-nums">
                          <span className="text-xs text-muted-foreground">{row.order_count} ped.</span>
                          <span className="text-muted-foreground w-12 text-right text-xs">{share.toFixed(1)}%</span>
                          <span className="font-semibold w-20 text-right">{formatCompactCurrency(rev)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-heading">Logística</CardTitle></CardHeader>
          <CardContent>
            {logLoading ? <Skeleton className="h-[250px] w-full" />
            : !logistics?.length ? <p className="text-sm text-muted-foreground">Sem dados de logística no período.</p>
            : <>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={logistics.map((r) => ({ name: getGlobalLogisticsDisplay(r.logistics_slug), value: Number(r.total_revenue) }))} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value">
                        {logistics.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => typeof v === "number" ? formatCompactCurrency(v) : v} />
                      <Legend verticalAlign="bottom" height={30} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-1">
                  {logistics.map((row, i) => {
                    const rev = Number(row.total_revenue)
                    const total = logistics.reduce((s, r) => s + Number(r.total_revenue), 0)
                    const share = total > 0 ? (rev / total) * 100 : 0
                    return (
                      <div key={row.logistics_slug} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted/50">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="truncate font-medium">{getGlobalLogisticsDisplay(row.logistics_slug)}</span>
                          <span className="text-xs text-muted-foreground">({row.client_count} {row.client_count === 1 ? "cliente" : "clientes"})</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 tabular-nums">
                          <span className="text-xs text-muted-foreground">{row.order_count} ped.</span>
                          <span className="text-muted-foreground w-12 text-right text-xs">{share.toFixed(1)}%</span>
                          <span className="font-semibold w-20 text-right">{formatCompactCurrency(rev)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            }
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
