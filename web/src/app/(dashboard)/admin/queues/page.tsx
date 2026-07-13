"use client"

import { QueueMonitor } from "@/modules/admin/components/queues/queue-monitor"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function QueuesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Filas"
        description="Monitoramento de filas de processamento"
      />
      <QueueMonitor />
    </PageContainer>
  )
}
