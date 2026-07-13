"use client"

import { useParams } from "next/navigation"
import { useClient } from "@/hooks/use-clients"
import { useBillingSummary } from "@/hooks/use-billing"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils/format"

export default function AnalystClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: client, isLoading } = useClient(id)
  const { summary, isLoading: billingLoading } = useBillingSummary(id)

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </PageContainer>
    )
  }

  if (!client) {
    return <PageContainer><p className="text-muted-foreground">Cliente não encontrado.</p></PageContainer>
  }

  return (
    <PageContainer>
      <PageHeader title={client.name} />
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          label="Faturamento do mês"
          value={formatCurrency(summary.monthlyApproved)}
          loading={billingLoading}
        />
        <StatCard
          label="Pedidos no mês"
          value={summary.monthlyOrders}
          loading={billingLoading}
        />
      </div>
    </PageContainer>
  )
}
