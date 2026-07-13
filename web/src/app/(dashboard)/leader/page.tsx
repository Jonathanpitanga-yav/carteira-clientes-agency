"use client"

import { BillingOverview } from "@/modules/leader/components/billing-overview"
import { ClientRanking } from "@/modules/leader/components/client-ranking"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function LeaderPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Dashboard do líder"
        description="Visão consolidada da agência"
      />
      <BillingOverview />
      <div className="grid gap-6 md:grid-cols-2">
        <ClientRanking />
      </div>
    </PageContainer>
  )
}
