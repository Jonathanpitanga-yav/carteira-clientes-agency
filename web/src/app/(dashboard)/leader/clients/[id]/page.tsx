"use client"

import { useParams } from "next/navigation"
import { useClient } from "@/hooks/use-clients"
import { useBillingSummary } from "@/hooks/use-billing"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"

export default function LeaderClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: client, isLoading } = useClient(id)
  const { summary, isLoading: billingLoading } = useBillingSummary(id)

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
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

      <div className="grid gap-4 md:grid-cols-3">
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
        <StatCard label="Status" value="">
          <Badge className={client.status === "active" ? "bg-emerald-600 text-white" : ""}>
            {client.status === "active" ? "Ativo" : "Inativo"}
          </Badge>
        </StatCard>
      </div>
    </PageContainer>
  )
}
