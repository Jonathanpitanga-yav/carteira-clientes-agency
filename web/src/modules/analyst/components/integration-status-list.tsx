"use client"

import { useIntegrations } from "@/hooks/use-integrations"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSyncIntegration } from "@/hooks/use-integrations"
import { RefreshCw } from "lucide-react"

export function IntegrationStatusList() {
  const { data: integrations, isLoading } = useIntegrations()
  const sync = useSyncIntegration()

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    )
  }

  if (!integrations?.length) {
    return <p className="text-muted-foreground">Nenhuma integração encontrada.</p>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {integrations.map((int) => (
        <Card key={int.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-heading">
                {int.client_name ?? "—"}
              </CardTitle>
              <Badge
                className={
                  int.status === "active"
                    ? "bg-emerald-600 text-white"
                    : int.status === "error"
                      ? "bg-red-600 text-white"
                      : ""
                }
              >
                {int.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              {int.provider_name ?? "—"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => sync.mutate(int.id)}
              disabled={sync.isPending}
            >
              <RefreshCw
                className={`mr-1 h-3 w-3 ${sync.isPending ? "animate-spin" : ""}`}
              />
              Sincronizar
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
