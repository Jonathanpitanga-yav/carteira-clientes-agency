"use client"

import { useState } from "react"
import { StatCard } from "@/components/shared/stat-card"
import { DashboardKpiRow } from "@/modules/dashboard/components/dashboard-kpi-row"
import { ClientRanking } from "@/modules/leader/components/client-ranking"
import { MarketplaceRankingCard } from "@/modules/dashboard/components/marketplace-ranking-card"
import { EcommerceRankingCard } from "@/modules/dashboard/components/ecommerce-ranking-card"
import { ChannelRankingCard } from "@/modules/dashboard/components/channel-ranking-card"
import { useClientsStats } from "@/hooks/use-clients"
import { useUsersStats } from "@/hooks/use-users"
import { getCurrentYearMonth } from "@/hooks/use-billing"
import { Building2, Users } from "lucide-react"

type BillingOverviewProps = {
  showUsersStat?: boolean
}

export function BillingOverview({ showUsersStat = false }: BillingOverviewProps) {
  const currentYm = getCurrentYearMonth()
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYm)
  const { data: clientStats } = useClientsStats()
  const { data: userStats, isLoading: usersLoading } = useUsersStats()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-muted-foreground">Mês:</label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
        />
      </div>

      <div
        className={
          showUsersStat
            ? "grid gap-4 md:grid-cols-2 lg:grid-cols-5"
            : "grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        }
      >
        <DashboardKpiRow />
        <StatCard
          label="Clientes ativos"
          value={clientStats?.active ?? 0}
          icon={<Building2 className="h-4 w-4" />}
        />
        {showUsersStat && (
          <StatCard
            label="Usuários cadastrados"
            value={userStats?.total ?? 0}
            icon={<Users className="h-4 w-4" />}
            loading={usersLoading}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ClientRanking yearMonth={selectedMonth} />
        <MarketplaceRankingCard yearMonth={selectedMonth} />
        <EcommerceRankingCard yearMonth={selectedMonth} />
      </div>
      <ChannelRankingCard yearMonth={selectedMonth} />
    </div>
  )
}
