"use client"

import { ActivityHistoryTable } from "@/modules/admin/components/audit-logs/activity-history-table"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function ActivityHistoryPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Histórico de Atividades"
        description="Registro unificado de credenciais, acessos, permissões e execução de filas"
      />
      <div className="mt-6">
        <ActivityHistoryTable />
      </div>
    </PageContainer>
  )
}
