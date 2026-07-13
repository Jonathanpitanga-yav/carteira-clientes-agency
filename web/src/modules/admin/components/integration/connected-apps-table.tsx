"use client"

import { useConnectedApps, useDeleteIntegration, useSyncIntegration, useRefreshToken } from "@/hooks/use-integrations"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Plug,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react"

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "Ativo", variant: "default" },
    expired: { label: "Expirado", variant: "secondary" },
    error: { label: "Erro", variant: "destructive" },
    pending: { label: "Pendente", variant: "outline" },
  }
  return map[status] ?? { label: status, variant: "outline" as const }
}

function tokenStatus(expiresAt: string | null) {
  if (!expiresAt) return { label: "Sem token", icon: XCircle, className: "text-muted-foreground" }
  const diff = new Date(expiresAt).getTime() - Date.now()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)

  if (diff < 0) return { label: "Expirado", icon: XCircle, className: "text-destructive" }
  if (days < 1) return { label: `${hours}h restantes`, icon: Clock, className: "text-amber-500" }
  if (days < 7) return { label: `${days}d restantes`, icon: Clock, className: "text-amber-500" }
  return { label: `${days}d restantes`, icon: CheckCircle2, className: "text-emerald-500" }
}

export function ConnectedAppsTable() {
  const { data: apps, isLoading, error } = useConnectedApps()
  const deleteIntegration = useDeleteIntegration()
  const syncIntegration = useSyncIntegration()
  const refreshToken = useRefreshToken()

  if (error) {
    return <div className="text-destructive">Erro ao carregar aplicativos conectados.</div>
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (!apps?.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
        <Plug className="h-8 w-8" />
        <p>Nenhum aplicativo conectado.</p>
        <p className="text-xs">Vá até a Central de Aplicativos para conectar um ERP.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>ERP</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Token</TableHead>
            <TableHead>Refresh</TableHead>
            <TableHead>Conectado desde</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apps.map((app) => {
            const badge = statusBadge(app.status)
            const token = tokenStatus(app.token_expires_at)

            return (
              <TableRow key={app.id}>
                <TableCell className="font-medium">{app.client_name ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{app.provider_name ?? app.provider_slug ?? "—"}</span>
                    <Badge variant="outline" className="text-xs">
                      {app.auth_type === "oauth2" ? "OAuth2" : "API Key"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={badge.variant} className={badge.variant === "default" ? "bg-emerald-600 text-white" : ""}>
                    {badge.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <token.icon className={`h-3.5 w-3.5 ${token.className}`} />
                    <span className={`text-sm ${token.className}`}>{token.label}</span>
                  </div>
                  {app.has_refresh_token && (
                    <span className="ml-1 text-xs text-muted-foreground">(c/ refresh)</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {app.token_updated_at
                    ? new Date(app.token_updated_at).toLocaleString("pt-BR")
                    : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(app.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {app.status === "active" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => syncIntegration.mutate(app.id)}
                          disabled={syncIntegration.isPending}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${syncIntegration.isPending ? "animate-spin" : ""}`} />
                          Sincronizar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refreshToken.mutate(app.id)}
                          disabled={refreshToken.isPending}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${refreshToken.isPending ? "animate-spin" : ""}`} />
                          Refresh
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("Desativar esta integração?")) {
                          deleteIntegration.mutate(app.id)
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
