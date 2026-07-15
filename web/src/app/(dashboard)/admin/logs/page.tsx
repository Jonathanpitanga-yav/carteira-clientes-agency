"use client"

import { LogsCenter } from "@/modules/admin/components/logs/logs-center"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function LogsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Logs"
        description="Central unificada de webhooks, sincronização, filas e edge functions"
      />
      <div className="mt-6">
        <LogsCenter />
      </div>
    </PageContainer>
  )
}
