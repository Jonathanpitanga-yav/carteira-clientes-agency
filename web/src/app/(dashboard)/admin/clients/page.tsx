"use client"

import { ClientList } from "@/modules/admin/components/client/client-list"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function ClientsPage() {
  return (
    <PageContainer>
      <PageHeader title="Clientes" description="Gerencie os clientes da agência" />
      <ClientList />
    </PageContainer>
  )
}
