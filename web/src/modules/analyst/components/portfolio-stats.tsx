"use client"

import { StatCard } from "@/components/shared/stat-card"
import { DashboardKpiRow } from "@/modules/dashboard/components/dashboard-kpi-row"
import { ClientRanking } from "@/modules/leader/components/client-ranking"
import { MarketplaceRankingCard } from "@/modules/dashboard/components/marketplace-ranking-card"
import { EcommerceRankingCard } from "@/modules/dashboard/components/ecommerce-ranking-card"
import { ChannelRankingCard } from "@/modules/dashboard/components/channel-ranking-card"
import { useClients } from "@/hooks/use-clients"
import { Users } from "lucide-react"

export function PortfolioStats() {
  const { data: clients, isLoading: clientsLoading } = useClients()

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Clientes na carteira"
          value={clients?.length ?? 0}
          icon={<Users className="h-4 w-4" />}
          loading={clientsLoading}
        />
        <DashboardKpiRow />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ClientRanking clientLinkPrefix="/analyst/clients" />
        <MarketplaceRankingCard />
        <EcommerceRankingCard />
      </div>
      <ChannelRankingCard />
    </div>
  )
}
