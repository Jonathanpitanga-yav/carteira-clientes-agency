"use client"

import { StatCard } from "@/components/shared/stat-card"
import { useClients } from "@/hooks/use-clients"
import { useBillingSummary } from "@/hooks/use-billing"
import { useUsers } from "@/hooks/use-users"
import { formatCompactCurrency } from "@/lib/utils/format"
import { Users, TrendingUp, Receipt, DollarSign } from "lucide-react"

export function PortfolioStats() {
  const { data: clients, isLoading: clientsLoading } = useClients()
  const { summary, isLoading: billingLoading } = useBillingSummary()

  const avgTicket =
    summary.monthlyOrders > 0
      ? summary.monthlyApproved / summary.monthlyOrders
      : 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Clientes na carteira"
        value={clients?.length ?? 0}
        icon={<Users className="h-4 w-4" />}
        loading={clientsLoading}
      />
      <StatCard
        label="Faturamento do mês"
        value={formatCompactCurrency(summary.monthlyApproved)}
        icon={<TrendingUp className="h-4 w-4" />}
        loading={billingLoading}
      />
      <StatCard
        label="Pedidos no mês"
        value={summary.monthlyOrders}
        icon={<Receipt className="h-4 w-4" />}
        loading={billingLoading}
      />
      <StatCard
        label="Ticket médio"
        value={formatCompactCurrency(avgTicket)}
        icon={<DollarSign className="h-4 w-4" />}
        loading={billingLoading}
      />
    </div>
  )
}
