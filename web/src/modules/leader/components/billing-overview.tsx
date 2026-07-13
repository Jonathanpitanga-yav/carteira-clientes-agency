"use client"

import { StatCard } from "@/components/shared/stat-card"
import { useClientsStats } from "@/hooks/use-clients"
import { useBillingSummary } from "@/hooks/use-billing"
import { formatCompactCurrency } from "@/lib/utils/format"
import { TrendingUp, Building2, Receipt, DollarSign } from "lucide-react"

export function BillingOverview() {
  const { data: clientStats } = useClientsStats()
  const { summary, isLoading } = useBillingSummary()

  const avgTicket =
    summary.monthlyOrders > 0
      ? summary.monthlyApproved / summary.monthlyOrders
      : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Faturamento do mês"
        value={formatCompactCurrency(summary.monthlyApproved)}
        icon={<TrendingUp className="h-4 w-4" />}
        loading={isLoading}
      />
      <StatCard
        label="Clientes ativos"
        value={clientStats?.active ?? 0}
        icon={<Building2 className="h-4 w-4" />}
      />
      <StatCard
        label="Pedidos no mês"
        value={summary.monthlyOrders}
        icon={<Receipt className="h-4 w-4" />}
        loading={isLoading}
      />
      <StatCard
        label="Ticket médio"
        value={formatCompactCurrency(avgTicket)}
        icon={<DollarSign className="h-4 w-4" />}
        loading={isLoading}
      />
    </div>
  )
}
