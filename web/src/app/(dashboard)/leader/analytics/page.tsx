"use client"

import { AnalyticsSubnav } from "@/modules/analytics/components/analytics-subnav"
import { PortfolioOverview } from "@/modules/analytics/components/portfolio-overview"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function LeaderAnalyticsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        description="Visão macro da agência — GMV consolidado, tickets e clientes ativos"
      />
      <AnalyticsSubnav basePath="/leader/analytics" />
      <PortfolioOverview />
    </PageContainer>
  )
}
