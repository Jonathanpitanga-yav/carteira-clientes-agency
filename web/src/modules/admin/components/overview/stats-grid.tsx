"use client"

import { StatCard } from "@/components/shared/stat-card"
import { useClientsStats } from "@/hooks/use-clients"
import { useUsersStats } from "@/hooks/use-users"
import { useBillingSummary } from "@/hooks/use-billing"
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format"
import { Users, Building2, TrendingUp, Receipt } from "lucide-react"

export function StatsGrid() {
  const { data: clientStats, isLoading: clientsLoading } = useClientsStats()
  const { data: userStats, isLoading: usersLoading } = useUsersStats()
  const { summary, isLoading: billingLoading } = useBillingSummary()

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Clientes ativos"
        value={clientStats?.active ?? 0}
        icon={<Building2 className="h-4 w-4" />}
        loading={clientsLoading}
      />
      <StatCard
        label="Usuários"
        value={userStats?.total ?? 0}
        icon={<Users className="h-4 w-4" />}
        loading={usersLoading}
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
    </div>
  )
}
