"use client"

import { useClients, useClientsStats } from "@/hooks/use-clients"
import { useBillingSummary } from "@/hooks/use-billing"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCompactCurrency } from "@/lib/utils/format"
import { Trophy } from "lucide-react"
import Link from "next/link"

export function ClientRanking() {
  const { data: clients, isLoading } = useClients()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Ranking de clientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const sorted = clients
    ?.filter((c) => c.status === "active")
    .slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-heading">Top clientes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {sorted?.map((client, index) => (
          <Link
            key={client.id}
            href={`/leader/clients/${client.id}`}
            className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted transition-colors"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {index === 0 ? (
                <Trophy className="h-4 w-4 text-yellow-500" />
              ) : (
                index + 1
              )}
            </span>
            <span className="flex-1 truncate">{client.name}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
