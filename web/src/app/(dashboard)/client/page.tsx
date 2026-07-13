"use client"

import { AccountSummary } from "@/modules/client/components/account-summary"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function ClientPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Minha conta"
        description="Visão geral do seu faturamento"
      />
      <AccountSummary />
    </PageContainer>
  )
}
