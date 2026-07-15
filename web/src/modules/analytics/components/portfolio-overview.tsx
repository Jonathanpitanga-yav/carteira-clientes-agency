"use client"

import { usePortfolioOverview } from "@/hooks/use-analytics"
import { StatCard } from "@/components/shared/stat-card"
import { PeriodComparison } from "@/modules/dashboard/components/period-comparison"
import { formatCompactCurrency } from "@/lib/utils/format"
import { TrendingUp, Receipt, DollarSign, Building2 } from "lucide-react"

export function PortfolioOverview() {
  const { data, isLoading } = usePortfolioOverview()

  const current = data?.current
  const prev = data?.previous

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="GMV consolidado"
        icon={<TrendingUp className="h-4 w-4" />}
        loading={isLoading}
      >
        <div className="text-2xl font-bold font-heading">
          {formatCompactCurrency(current?.total_gmv ?? 0)}
        </div>
        <PeriodComparison
          current={current?.total_gmv ?? 0}
          previous={prev?.total_gmv ?? 0}
          format="percent"
          className="mt-1"
        />
      </StatCard>
      <StatCard
        label="Pedidos no mês"
        icon={<Receipt className="h-4 w-4" />}
        loading={isLoading}
      >
        <div className="text-2xl font-bold font-heading">
          {current?.total_orders ?? 0}
        </div>
        <PeriodComparison
          current={current?.total_orders ?? 0}
          previous={prev?.total_orders ?? 0}
          format="number"
          className="mt-1"
        />
      </StatCard>
      <StatCard
        label="Ticket médio"
        icon={<DollarSign className="h-4 w-4" />}
        loading={isLoading}
      >
        <div className="text-2xl font-bold font-heading">
          {formatCompactCurrency(current?.avg_ticket ?? 0)}
        </div>
        <PeriodComparison
          current={current?.avg_ticket ?? 0}
          previous={prev?.avg_ticket ?? 0}
          format="percent"
          className="mt-1"
        />
      </StatCard>
      <StatCard
        label="Clientes ativos"
        icon={<Building2 className="h-4 w-4" />}
        value={current?.active_clients ?? 0}
        loading={isLoading}
      />
    </div>
  )
}
