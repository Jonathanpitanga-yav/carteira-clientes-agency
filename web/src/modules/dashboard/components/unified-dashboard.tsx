"use client"

import type { Role } from "@/lib/constants"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { BillingOverview } from "@/modules/leader/components/billing-overview"
import { ClientRanking } from "@/modules/leader/components/client-ranking"
import { PortfolioStats } from "@/modules/analyst/components/portfolio-stats"
import { AccountSummary } from "@/modules/client/components/account-summary"
import { useUsersStats } from "@/hooks/use-users"
import { Users } from "lucide-react"

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
        <BillingOverview />
        {isAdmin && <AdminCards />}
        <ClientRanking />
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

function AdminCards() {
  const { data: userStats, isLoading } = useUsersStats()

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard
        label="Usuários cadastrados"
        value={userStats?.total ?? 0}
        icon={<Users className="h-4 w-4" />}
        loading={isLoading}
      />
    </div>
  )
}
