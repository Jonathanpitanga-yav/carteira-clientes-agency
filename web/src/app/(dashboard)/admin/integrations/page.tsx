"use client"

import { IntegrationList } from "@/modules/admin/components/integration/integration-list"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function IntegrationsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Integrações ERP"
        description="Gerencie as conexões com sistemas ERP"
      />
      <IntegrationList />
    </PageContainer>
  )
}
