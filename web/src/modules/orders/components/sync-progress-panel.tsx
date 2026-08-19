"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, XCircle, ArrowRight, SkipForward } from "lucide-react"
import { cn } from "@/lib/utils"

type BatchItem = { number: string; status: string }

type SyncProgress = {
  status: "idle" | "connecting" | "streaming" | "complete" | "error"
  page: number
  synced: number
  errors: number
  batch: BatchItem[]
  message?: string
  pages: number
}

type Props = {
  clientName: string
  clientId: string
  dateFrom: string
  dateTo: string
  onClose: () => void
  onComplete: (synced: number) => void
}

export function SyncProgressPanel({ clientName, clientId, dateFrom, dateTo, onClose, onComplete }: Props) {
  const [progress, setProgress] = useState<SyncProgress>({
    status: "idle", page: 0, synced: 0, errors: 0, batch: [], pages: 0,
  })
  const abortRef = useRef<AbortController | null>(null)

  const startSync = useCallback(async () => {
    setProgress((p) => ({ ...p, status: "connecting" }))
    abortRef.current = new AbortController()

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/erp-stream-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await createClient().auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ clientIds: [clientId], dateFrom, dateTo }),
          signal: abortRef.current.signal,
        },
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        setProgress((p) => ({ ...p, status: "error", message: err.error }))
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setProgress((p) => ({ ...p, status: "error", message: "Sem resposta do servidor" }))
        return
      }

      const decoder = new TextDecoder()
      let buffer = ""

      setProgress((p) => ({ ...p, status: "streaming" }))

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("event: ")) continue
          if (!line.startsWith("data: ")) continue

          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === "page" || data.type === "progress") {
              setProgress((p) => ({
                ...p,
                page: data.page,
                synced: data.synced,
                errors: data.errors,
                batch: data.batch || p.batch,
                pages: data.page,
              }))
            } else if (data.type === "complete") {
              setProgress((p) => ({
                ...p, status: "complete", synced: data.synced,
                errors: data.errors, pages: data.pages,
              }))
              onComplete(data.synced)
            } else if (data.type === "error") {
              setProgress((p) => ({ ...p, status: "error", message: data.message }))
            } else if (data.type === "start") {
              setProgress((p) => ({ ...p, status: "streaming", page: 0 }))
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setProgress((p) => ({ ...p, status: "error", message: err.message }))
      }
    }
  }, [clientId, dateFrom, dateTo, onComplete])

  useEffect(() => {
    startSync()
    return () => abortRef.current?.abort()
  }, [startSync])

  const isRunning = progress.status === "connecting" || progress.status === "streaming"

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin text-brand-purple" />
          ) : progress.status === "complete" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : progress.status === "error" ? (
            <XCircle className="h-4 w-4 text-red-500" />
          ) : null}
          <span className="text-sm font-medium">{clientName}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
          <Badge variant="outline" className="text-xs">
            {progress.synced} sinc.
          </Badge>
          {progress.errors > 0 && (
            <Badge variant="outline" className="text-xs text-red-500 border-red-200">
              {progress.errors} erro(s)
            </Badge>
          )}
        </div>
      </div>

      {isRunning && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="tabular-nums">Página {progress.page}</span>
          <span className="tabular-nums">{progress.synced} pedidos</span>
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-purple transition-all duration-300"
              style={{ width: `${Math.min((progress.page / Math.max(progress.pages, 1)) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {progress.batch.length > 0 && (
        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
          {progress.batch.slice(-10).map((item, i) => (
            <span
              key={`${item.number}-${i}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
                item.status === "synced" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                item.status === "skipped" && "bg-muted text-muted-foreground",
                item.status === "error" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
              )}
            >
              {item.status === "synced" && <CheckCircle2 className="h-2.5 w-2.5" />}
              {item.status === "error" && <XCircle className="h-2.5 w-2.5" />}
              {item.status === "skipped" && <SkipForward className="h-2.5 w-2.5" />}
              {item.number}
            </span>
          ))}
        </div>
      )}

      {progress.status === "complete" && (
        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {progress.synced} pedidos sincronizados em {progress.pages} página(s)
        </div>
      )}

      {progress.status === "error" && (
        <div className="flex items-center gap-2 text-xs text-red-500">
          <XCircle className="h-3.5 w-3.5" />
          {progress.message || "Erro na sincronização"}
        </div>
      )}

      {(progress.status === "complete" || progress.status === "error") && (
        <Button variant="outline" size="sm" onClick={onClose} className="w-full">
          Fechar
        </Button>
      )}
    </div>
  )
}
