"use client"

import { useParams } from "next/navigation"
import { useClient } from "@/hooks/use-clients"
import { useBillingSummary } from "@/hooks/use-billing"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDocument } from "@/lib/utils/format"

export default function ClientDetailPage() {
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
    return (
      <PageContainer>
        <p className="text-muted-foreground">Cliente não encontrado.</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={client.name}
        description={
          client.document ? `CNPJ: ${formatDocument(client.document)}` : undefined
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Faturamento do mês"
          value={formatCurrency(summary.monthlyApproved)}
          loading={billingLoading}
        />
        <StatCard
          label="Pedidos no mês"
          value={summary.monthlyOrders ?? 0}
          loading={billingLoading}
        />
        <StatCard
          label="Status"
          value=""
          loading={false}
        >
          <Badge
            className={
              client.status === "active"
                ? "bg-emerald-600 text-white"
                : ""
            }
          >
            {client.status === "active" ? "Ativo" : "Inativo"}
          </Badge>
        </StatCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID</span>
            <span className="font-mono">{client.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">CNPJ</span>
            <span>{client.document ? formatDocument(client.document) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Criado em</span>
            <span>{new Date(client.created_at).toLocaleDateString("pt-BR")}</span>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
