"use client"

import { useClients } from "@/hooks/use-clients"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

export default function AnalystClientsPage() {
  const { data: clients, isLoading } = useClients()

  return (
    <PageContainer>
      <PageHeader
        title="Carteira de clientes"
        description="Clientes sob sua responsabilidade"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))
          : clients?.map((client) => (
              <Link key={client.id} href={`/analyst/clients/${client.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-sm font-heading">
                      {client.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {client.document ?? "—"}
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>
    </PageContainer>
  )
}
