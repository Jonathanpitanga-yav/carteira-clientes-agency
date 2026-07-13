"use client"

import { useIntegrations } from "@/hooks/use-integrations"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plug, RefreshCw, XCircle } from "lucide-react"

export function IntegrationList() {
  const { data: integrations, isLoading, error } = useIntegrations()

  if (error) {
    return <div className="text-destructive">Erro ao carregar integrações.</div>
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    )
  }

  if (!integrations?.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
        <Plug className="h-8 w-8" />
        <p>Nenhuma integração encontrada.</p>
      </div>
    )
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
                variant={int.status === "active" ? "default" : "secondary"}
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
            <p className="text-xs text-muted-foreground">
              ERP: {int.provider_name ?? "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Criada em{" "}
              {new Date(int.created_at).toLocaleDateString("pt-BR")}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
