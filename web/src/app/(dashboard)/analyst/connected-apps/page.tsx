"use client"

import { ConnectedAppsTable } from "@/modules/admin/components/integration/connected-apps-table"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function AnalystConnectedAppsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Aplicativos Conectados"
        description="Acompanhe o status dos aplicativos conectados dos seus clientes"
      />
      <div className="mt-6">
        <ConnectedAppsTable />
      </div>
    </PageContainer>
  )
}
