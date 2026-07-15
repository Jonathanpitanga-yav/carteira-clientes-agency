"use client"

import { useState } from "react"
import { usePortfolioOverview } from "@/hooks/use-analytics"
import { StatCard } from "@/components/shared/stat-card"
import { PeriodComparison } from "@/modules/dashboard/components/period-comparison"
import { ClientRanking } from "@/modules/leader/components/client-ranking"
import { MarketplaceRankingCard } from "@/modules/dashboard/components/marketplace-ranking-card"
import { EcommerceRankingCard } from "@/modules/dashboard/components/ecommerce-ranking-card"
import { ChannelRankingCard } from "@/modules/dashboard/components/channel-ranking-card"
import { formatCompactCurrency } from "@/lib/utils/format"
import { TrendingUp, Receipt, DollarSign, Building2 } from "lucide-react"
import { getCurrentYearMonth } from "@/hooks/use-billing"

type Props = {
  basePath?: string
}

function toYearMonth(value: string) {
  return value.replace("-", "-")
}

export function PortfolioOverview({ basePath = "/admin" }: Props) {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth())
  const { data, isLoading } = usePortfolioOverview(yearMonth)

  const current = data?.current
  const prev = data?.previous

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">Período:</label>
        <input
          type="month"
          value={yearMonth}
          onChange={(e) => setYearMonth(toYearMonth(e.target.value))}
          className="h-8 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="GMV consolidado"
          icon={<TrendingUp className="h-4 w-4" />}
          loading={isLoading}
        >
          <div className="text-2xl font-bold font-heading">
            {formatCompactCurrency(current?.total_gmv ?? 0)}
          </div>
          <PeriodComparison
            current={current?.total_gmv ?? 0}
            previous={prev?.total_gmv ?? 0}
            format="percent"
            className="mt-1"
          />
        </StatCard>
        <StatCard
          label="Pedidos no mês"
          icon={<Receipt className="h-4 w-4" />}
          loading={isLoading}
        >
          <div className="text-2xl font-bold font-heading">
            {current?.total_orders ?? 0}
          </div>
          <PeriodComparison
            current={current?.total_orders ?? 0}
            previous={prev?.total_orders ?? 0}
            format="number"
            className="mt-1"
          />
        </StatCard>
        <StatCard
          label="Ticket médio"
          icon={<DollarSign className="h-4 w-4" />}
          loading={isLoading}
        >
          <div className="text-2xl font-bold font-heading">
            {formatCompactCurrency(current?.avg_ticket ?? 0)}
          </div>
          <PeriodComparison
            current={current?.avg_ticket ?? 0}
            previous={prev?.avg_ticket ?? 0}
            format="percent"
            className="mt-1"
          />
        </StatCard>
        <StatCard
          label="Clientes ativos"
          icon={<Building2 className="h-4 w-4" />}
          value={current?.active_clients ?? 0}
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChannelRankingCard yearMonth={yearMonth} />
        <MarketplaceRankingCard yearMonth={yearMonth} />
        <EcommerceRankingCard yearMonth={yearMonth} />
      </div>

      <ClientRanking
        clientLinkPrefix={`${basePath}/clients`}
        yearMonth={yearMonth}
      />
    </div>
  )
}
