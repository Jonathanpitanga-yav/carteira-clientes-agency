"use client"

import { PortfolioStats } from "@/modules/analyst/components/portfolio-stats"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function AnalystPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Dashboard do analista"
        description="Sua carteira de clientes"
      />
      <PortfolioStats />
    </PageContainer>
  )
}
