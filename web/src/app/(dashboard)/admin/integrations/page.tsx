"use client"

import { AppStore } from "@/modules/admin/components/integration/app-store"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function IntegrationsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Central de Aplicativos"
        description="Conecte sua conta aos ERPs disponíveis"
      />
      <AppStore />
    </PageContainer>
  )
}
