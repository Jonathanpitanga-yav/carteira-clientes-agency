"use client"

import { useEffect, useMemo, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSyncQueue } from "@/hooks/use-orders"
import { QUERY_KEYS } from "@/lib/constants"
import { toast } from "sonner"

/**
 * Componente invisível: monitora a fila de sync e emite toasts ao concluir ou falhar.
 */
export function SyncQueueNotifier() {
  const { data: items } = useSyncQueue()
  const qc = useQueryClient()
  const statusById = useRef<Map<string, string>>(new Map())
  const initialized = useRef(false)

  const itemsRef = useRef(items)
  itemsRef.current = items

  const itemsSnapshot = useMemo(
    () =>
      items
        ?.map((item) => `${item.id}:${item.status}:${item.error ?? ""}`)
        .join("|") ?? "",
    [items],
  )

  useEffect(() => {
    const queue = itemsRef.current
    if (!queue?.length) return

    if (!initialized.current) {
      for (const item of queue) {
        statusById.current.set(item.id, item.status)
      }
      initialized.current = true
      return
    }

    for (const item of queue) {
      const prev = statusById.current.get(item.id)
      statusById.current.set(item.id, item.status)

      if (prev !== "pending" && prev !== "processing") continue

      const label = item.client_name ?? "Cliente"
      if (item.status === "completed") {
        toast.success(`Sincronização concluída: ${label}`)
        qc.invalidateQueries({ queryKey: [QUERY_KEYS.ORDERS] })
      } else if (item.status === "failed") {
        toast.error(`Falha na sincronização: ${label}`, {
          description: item.error ?? undefined,
        })
      }
    }
  }, [itemsSnapshot, qc])

  return null
}
