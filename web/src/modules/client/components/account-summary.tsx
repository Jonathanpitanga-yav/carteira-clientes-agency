"use client"

import { StatCard } from "@/components/shared/stat-card"
import { useBillingSummary } from "@/hooks/use-billing"
import { formatCompactCurrency } from "@/lib/utils/format"
import { TrendingUp, Receipt, DollarSign, ArrowDownUp } from "lucide-react"

export function AccountSummary() {
  const { summary, isLoading } = useBillingSummary()

  const avgTicket =
    summary.monthlyOrders > 0
      ? summary.monthlyApproved / summary.monthlyOrders
      : 0

  const variationPct = summary.variation * 100
  const variationLabel =
    variationPct >= 0 ? `+${variationPct.toFixed(1)}%` : `${variationPct.toFixed(1)}%`

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Faturamento do mês"
        value={formatCompactCurrency(summary.monthlyApproved)}
        icon={<TrendingUp className="h-4 w-4" />}
        loading={isLoading}
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
      <StatCard
        label="Vs. mês anterior"
        value={variationLabel}
        icon={<ArrowDownUp className="h-4 w-4" />}
        loading={isLoading}
      />
    </div>
  )
}
