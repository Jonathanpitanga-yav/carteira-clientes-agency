"use client"

import { StatsGrid } from "@/modules/admin/components/overview/stats-grid"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function AdminPage() {
  return (
    <PageContainer>
      <PageHeader title="Dashboard administrativo" description="Visão geral da agência" />
      <StatsGrid />
    </PageContainer>
  )
}
