"use client"

import { AnalyticsSubnav } from "@/modules/analytics/components/analytics-subnav"
import { ClientAbcCurve } from "@/modules/analytics/components/client-abc-curve"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function LeaderAnalyticsAbcPage() {
  return (
    <PageContainer>
      <PageHeader title="Curva ABC" description="Itens que representam 80% do faturamento — classificados A, B e C" />
      <AnalyticsSubnav basePath="/leader/analytics" />
      <ClientAbcCurve />
    </PageContainer>
  )
}
