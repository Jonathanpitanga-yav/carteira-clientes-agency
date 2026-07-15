"use client"

import { AnalyticsSubnav } from "@/modules/analytics/components/analytics-subnav"
import { ChannelBenchmarksTable } from "@/modules/analytics/components/channel-benchmarks-table"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function LeaderAnalyticsBenchmarksPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Benchmarks & Ranking"
        description="Performance limpa por canal — qual canal gera mais resultado de forma consistente"
      />
      <AnalyticsSubnav basePath="/leader/analytics" />
      <ChannelBenchmarksTable />
    </PageContainer>
  )
}
