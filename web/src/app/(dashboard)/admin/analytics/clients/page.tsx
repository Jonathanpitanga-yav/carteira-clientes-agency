"use client"

import { AnalyticsSubnav } from "@/modules/analytics/components/analytics-subnav"
import { ClientDashboard } from "@/modules/analytics/components/client-dashboard"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function AdminAnalyticsClientsPage() {
  return (
    <PageContainer>
      <PageHeader title="Análise de Clientes" description="Dashboard com vendas, canais e logística" />
      <AnalyticsSubnav basePath="/admin/analytics" />
      <ClientDashboard />
    </PageContainer>
  )
}
