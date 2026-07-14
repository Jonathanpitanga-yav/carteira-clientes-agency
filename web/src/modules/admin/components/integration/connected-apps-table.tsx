"use client"

import { useConnectedApps, useDeleteIntegration, useRefreshToken } from "@/hooks/use-integrations"
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Plug, Trash2, RefreshCw, Info, Loader2 } from "lucide-react"

function statusBadge(status: string, tokenExpiresAt: string | null) {
  const isTokenExpired = tokenExpiresAt && new Date(tokenExpiresAt).getTime() < Date.now()
  const hasNoToken = !tokenExpiresAt

  if (status === "active" && isTokenExpired) {
    return { label: "Token Expirado", className: "bg-orange-500 text-white hover:bg-orange-500" }
  }
  if (status === "active" && hasNoToken) {
    return { label: "Sem Token", className: "bg-red-600 text-white hover:bg-red-600" }
  }

  const map: Record<string, { label: string; className: string }> = {
    active: { label: "Ativo", className: "bg-emerald-600 text-white hover:bg-emerald-600" },
    expired: { label: "Expirado", className: "bg-orange-500 text-white hover:bg-orange-500" },
    error: { label: "Erro", className: "bg-red-600 text-white hover:bg-red-600" },
    pending: { label: "Pendente", className: "bg-gray-400 text-white hover:bg-gray-400" },
  }
  return map[status] ?? { label: status, className: "" }
}

function tokenLabel(expiresAt: string | null) {
  if (!expiresAt) return { label: "Sem token", className: "text-red-500 font-medium" }
  const diff = new Date(expiresAt).getTime() - Date.now()

  if (diff < 0) return { label: "Expirado", className: "text-orange-500 font-medium" }

  const totalHours = Math.floor(diff / 3600000)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24

  const label = days > 0 ? `${days}d ${hours}h` : `${hours}h`
  return { label, className: "text-emerald-600 font-medium" }
}

export function ConnectedAppsTable() {
  const { data: apps, isLoading, error } = useConnectedApps()
  const deleteIntegration = useDeleteIntegration()
  const refreshToken = useRefreshToken()

  const handleRefresh = (appId: string) => {
    refreshToken.mutate(appId)
  }

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
            <TableHead>Conectado desde</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apps.map((app) => {
            const badge = statusBadge(app.status, app.token_expires_at)
            const isTokenExpired = app.token_expires_at && new Date(app.token_expires_at).getTime() < Date.now()
            const token = tokenLabel(app.token_expires_at)

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
                  <div className="flex items-center gap-1">
                    <Badge className={badge.className}>{badge.label}</Badge>
                    {app.status === "active" && isTokenExpired && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs text-xs">
                          Token expirou e aguarda renovação automática. A renovação é verificada a cada 30 minutos.
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={token.className}>{token.label}</span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(app.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {app.auth_type === "oauth2" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={refreshToken.isPending && refreshToken.variables === app.id}
                        onClick={() => handleRefresh(app.id)}
                        title="Renovar token manualmente"
                      >
                        {refreshToken.isPending && refreshToken.variables === app.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                      </Button>
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
