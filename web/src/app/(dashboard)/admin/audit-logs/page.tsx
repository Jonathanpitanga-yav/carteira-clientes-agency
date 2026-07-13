"use client"

import { AuditLogTable } from "@/modules/admin/components/audit-logs/audit-log-table"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function AuditLogsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Auditoria"
        description="Histórico de ações realizadas no sistema"
      />
      <AuditLogTable />
    </PageContainer>
  )
}
