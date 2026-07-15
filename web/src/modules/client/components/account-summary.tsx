"use client"

import { StatCard } from "@/components/shared/stat-card"
import { DashboardKpiRow } from "@/modules/dashboard/components/dashboard-kpi-row"
import { useMyClientIds, useBillingSummary } from "@/hooks/use-billing"
import { formatCompactCurrency } from "@/lib/utils/format"
import { ArrowDownUp } from "lucide-react"

export function AccountSummary() {
  const { data: clientIds, isLoading: idsLoading } = useMyClientIds()
  const { summary, isLoading: billingLoading } = useBillingSummary(clientIds)
  const isLoading = idsLoading || billingLoading

  const variationPct = summary.variation * 100
  const variationLabel =
    variationPct >= 0 ? `+${variationPct.toFixed(1)}%` : `${variationPct.toFixed(1)}%`

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashboardKpiRow clientIds={clientIds} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          label="Vs. mês anterior"
          value={variationLabel}
          icon={<ArrowDownUp className="h-4 w-4" />}
          loading={isLoading}
        />
        <StatCard
          label="Faturamento mês anterior"
          value={formatCompactCurrency(summary.previousMonthApproved)}
          icon={<ArrowDownUp className="h-4 w-4" />}
          loading={isLoading}
        />
      </div>
    </div>
  )
}
