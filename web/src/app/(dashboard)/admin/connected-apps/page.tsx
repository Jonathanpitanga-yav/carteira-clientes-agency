"use client"

import { ConnectedAppsTable } from "@/modules/admin/components/integration/connected-apps-table"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function ConnectedAppsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Aplicativos Conectados"
        description="Gerencie os aplicativos conectados, tokens e sincronização"
      />
      <div className="mt-6">
        <ConnectedAppsTable />
      </div>
    </PageContainer>
  )
}
