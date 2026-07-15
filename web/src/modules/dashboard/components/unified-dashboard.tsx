"use client"

import type { Role } from "@/lib/constants"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"
import { BillingOverview } from "@/modules/leader/components/billing-overview"
import { ClientRanking } from "@/modules/leader/components/client-ranking"
import { MarketplaceRankingCard } from "@/modules/dashboard/components/marketplace-ranking-card"
import { EcommerceRankingCard } from "@/modules/dashboard/components/ecommerce-ranking-card"
import { ChannelRankingCard } from "@/modules/dashboard/components/channel-ranking-card"
import { PortfolioStats } from "@/modules/analyst/components/portfolio-stats"
import { AccountSummary } from "@/modules/client/components/account-summary"

type Props = {
  roles: Role[]
}

function isLeaderOrAbove(roles: Role[]) {
  return roles.includes("admin") || roles.includes("leader")
}

export function UnifiedDashboard({ roles }: Props) {
  const isZoomedOut = isLeaderOrAbove(roles)
  const isAdmin = roles.includes("admin")
  const isAnalyst = roles.includes("analyst") && !isZoomedOut
  const isClient = roles.includes("client") && !isZoomedOut && !isAnalyst

  if (isZoomedOut) {
    return (
      <PageContainer>
        <PageHeader
          title="Dashboard"
          description="Visão consolidada da agência"
        />
        <div className="space-y-6">
          <BillingOverview showUsersStat={isAdmin} />
          <div className="grid gap-4 lg:grid-cols-3">
            <ClientRanking />
            <MarketplaceRankingCard />
            <EcommerceRankingCard />
          </div>
          <ChannelRankingCard />
        </div>
      </PageContainer>
    )
  }

  if (isAnalyst) {
    return (
      <PageContainer>
        <PageHeader
          title="Dashboard"
          description="Sua carteira de clientes"
        />
        <PortfolioStats />
      </PageContainer>
    )
  }

  if (isClient) {
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

  return null
}
