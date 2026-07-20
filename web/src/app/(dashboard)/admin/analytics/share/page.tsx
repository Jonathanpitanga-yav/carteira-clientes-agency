"use client"

import { useState } from "react"
import { AnalyticsSubnav } from "@/modules/analytics/components/analytics-subnav"
import { ClientConcentrationChart } from "@/modules/analytics/components/client-concentration-chart"
import { ErpDistributionChart } from "@/modules/analytics/components/erp-distribution-chart"
import { AnalyticsFilters } from "@/modules/analytics/components/filters/analytics-filters"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"
import type { DashboardFilters } from "@/hooks/use-client-analytics"

export default function AdminAnalyticsSharePage() {
  const [filters, setFilters] = useState<DashboardFilters>({})

  return (
    <PageContainer>
      <PageHeader title="Share e Concentração" description="Dependência de faturamento por cliente e distribuição por ERP" />
      <AnalyticsSubnav basePath="/admin/analytics" />
      <AnalyticsFilters filters={filters} onChange={setFilters} showLogisticsFilter={false} showChannelFilter={false} />
      <div className="space-y-6">
        <ClientConcentrationChart clientIds={filters.clientIds} />
        <ErpDistributionChart />
      </div>
    </PageContainer>
  )
}
