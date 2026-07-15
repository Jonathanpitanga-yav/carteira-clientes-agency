"use client"

import { AnalyticsSubnav } from "@/modules/analytics/components/analytics-subnav"
import { ClientConcentrationChart } from "@/modules/analytics/components/client-concentration-chart"
import { ErpDistributionChart } from "@/modules/analytics/components/erp-distribution-chart"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function LeaderAnalyticsSharePage() {
  return (
    <PageContainer>
      <PageHeader
        title="Share e Concentração"
        description="Dependência de faturamento por cliente e distribuição por ERP"
      />
      <AnalyticsSubnav basePath="/leader/analytics" />
      <div className="space-y-6">
        <ClientConcentrationChart />
        <ErpDistributionChart />
      </div>
    </PageContainer>
  )
}
