"use client"

import { IntegrationStatusList } from "@/modules/analyst/components/integration-status-list"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function AnalystIntegrationsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Status das integrações"
        description="Acompanhe e sincronize as integrações ERP dos seus clientes"
      />
      <IntegrationStatusList />
    </PageContainer>
  )
}
