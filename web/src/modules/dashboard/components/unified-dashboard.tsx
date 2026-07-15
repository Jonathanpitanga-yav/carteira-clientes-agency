"use client"

import type { Role } from "@/lib/constants"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"
import { BillingOverview } from "@/modules/leader/components/billing-overview"
import { PortfolioStats } from "@/modules/analyst/components/portfolio-stats"
import { AccountSummary } from "@/modules/client/components/account-summary"
import Link from "next/link"
import { BarChart3, ExternalLink } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  roles: Role[]
}

function isLeaderOrAbove(roles: Role[]) {
  return roles.includes("admin") || roles.includes("leader")
}

function analyticsHref(roles: Role[]) {
  if (roles.includes("admin")) return "/admin/analytics"
  if (roles.includes("leader")) return "/leader/analytics"
  return "/analyst/analytics"
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
          <div className="flex justify-center">
            <Link
              href={analyticsHref(roles)}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Ver rankings completos em Analytics
              <ExternalLink className="ml-2 h-3 w-3" />
            </Link>
          </div>
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
