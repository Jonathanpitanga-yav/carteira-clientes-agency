"use client"

import { StatCard } from "@/components/shared/stat-card"
import { DashboardKpiRow } from "@/modules/dashboard/components/dashboard-kpi-row"
import { useClientsStats } from "@/hooks/use-clients"
import { useUsersStats } from "@/hooks/use-users"
import { Building2, Users } from "lucide-react"

type BillingOverviewProps = {
  showUsersStat?: boolean
}

export function BillingOverview({ showUsersStat = false }: BillingOverviewProps) {
  const { data: clientStats } = useClientsStats()
  const { data: userStats, isLoading: usersLoading } = useUsersStats()

  return (
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
  )
}
