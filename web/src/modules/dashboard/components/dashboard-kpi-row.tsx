"use client"

import { StatCard } from "@/components/shared/stat-card"
import { PeriodComparison } from "@/modules/dashboard/components/period-comparison"
import { useBillingSummary } from "@/hooks/use-billing"
import { formatCompactCurrency } from "@/lib/utils/format"
import { TrendingUp, Receipt, DollarSign } from "lucide-react"

type DashboardKpiRowProps = {
  clientIds?: string | string[]
}

export function DashboardKpiRow({ clientIds }: DashboardKpiRowProps) {
  const { summary, isLoading } = useBillingSummary(clientIds)

  return (
    <>
      <StatCard
        label="Faturamento do mês"
        icon={<TrendingUp className="h-4 w-4" />}
        loading={isLoading}
      >
        <div className="text-2xl font-bold font-heading">
          {formatCompactCurrency(summary.monthlyApproved)}
        </div>
        <PeriodComparison
          current={summary.monthlyApproved}
          previous={summary.previousMonthApproved}
          format="percent"
          className="mt-1"
        />
      </StatCard>
      <StatCard
        label="Pedidos no mês"
        icon={<Receipt className="h-4 w-4" />}
        loading={isLoading}
      >
        <div className="text-2xl font-bold font-heading">{summary.monthlyOrders}</div>
        <PeriodComparison
          current={summary.monthlyOrders}
          previous={summary.previousMonthOrders}
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
          {formatCompactCurrency(summary.avgTicket)}
        </div>
        <PeriodComparison
          current={summary.avgTicket}
          previous={summary.previousAvgTicket}
          format="percent"
          className="mt-1"
        />
      </StatCard>
    </>
  )
}
