"use client"

import { useWebhookQueue, useWebhookQueueCounts } from "@/hooks/use-queues"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2 } from "lucide-react"

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-orange-500 text-white" },
  processing: { label: "Processando", color: "bg-brand-purple text-white" },
  processed: { label: "Processado", color: "bg-emerald-600 text-white" },
  failed: { label: "Falhou", color: "bg-red-600 text-white" },
  dead_letter: { label: "Dead Letter", color: "bg-red-900 text-white" },
  unmapped: { label: "Sem mapping", color: "bg-amber-600 text-white" },
}

export function WebhookQueueStatus() {
  const { data: items, isLoading } = useWebhookQueue()
  const { data: counts } = useWebhookQueueCounts()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  const activeItems = items?.filter((i) =>
    i.status === "pending" || i.status === "processing"
  ) ?? []

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-medium">Fila de Webhooks</h3>
        {activeItems.length > 0 && (
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {activeItems.length} ativo(s)
          </Badge>
        )}
      </div>

      {counts && counts.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-border px-4 py-2">
          {counts.map((c) => {
            const s = STATUS_MAP[c.status] ?? { label: c.status, color: "bg-gray-400 text-white" }
            return (
              <Badge key={c.status} className={s.color}>
                {s.label}: {c.count}
              </Badge>
            )
          })}
        </div>
      )}

      {(!items || items.length === 0) ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum webhook recente na fila.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.slice(0, 20).map((item) => {
            const s = STATUS_MAP[item.status] ?? { label: item.status, color: "bg-gray-400 text-white" }
            return (
              <div key={item.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {item.client_name ?? item.company_external_id ?? item.provider}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.provider_name ?? item.provider_slug ?? item.provider}
                    {item.event_type ? ` — ${item.event_type}` : ""}
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
