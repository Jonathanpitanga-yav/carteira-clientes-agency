"use client"

import { useSyncQueue } from "@/hooks/use-orders"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2 } from "lucide-react"

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-orange-500 text-white" },
  processing: { label: "Processando", color: "bg-brand-purple text-white" },
  completed: { label: "Concluído", color: "bg-emerald-600 text-white" },
  failed: { label: "Falhou", color: "bg-red-600 text-white" },
}

export function SyncQueueStatus() {
  const { data: items, isLoading } = useSyncQueue()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  const activeItems = items?.filter((i) => i.status === "pending" || i.status === "processing") ?? []
  const hasActive = activeItems.length > 0

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-medium">Fila de Sincronização</h3>
        {hasActive && (
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {activeItems.length} ativo(s)
          </Badge>
        )}
      </div>
      {(!items || items.length === 0) ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhuma sincronização recente.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.slice(0, 20).map((item) => {
            const s = STATUS_MAP[item.status] ?? { label: item.status, color: "bg-gray-400 text-white" }
            return (
              <div key={item.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.client_name ?? item.client_id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.provider_name ?? item.provider_slug ?? "ERP"} — {item.app_name ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {item.error && (
                    <span className="max-w-40 truncate text-xs text-muted-foreground" title={item.error}>
                      {item.error}
                    </span>
                  )}
                  <Badge className={s.color}>{s.label}</Badge>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
