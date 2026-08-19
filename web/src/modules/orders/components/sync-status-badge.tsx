"use client"

import { useSyncQueue } from "@/hooks/use-orders"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { subMinutes } from "date-fns"

export function SyncStatusBadge() {
  const { data: items } = useSyncQueue()

  const recentActiveItems = (items ?? []).filter((i) => {
    if (i.status !== "pending" && i.status !== "processing") return false
    const createdAt = new Date(i.created_at)
    return createdAt > subMinutes(new Date(), 30)
  })

  if (recentActiveItems.length === 0) return null

  return (
    <Badge variant="outline" className="gap-1.5 text-xs animate-pulse border-brand-purple/30 bg-brand-purple/10 dark:border-brand-purple/40 dark:bg-brand-purple/10">
      <Loader2 className="h-3 w-3 animate-spin text-brand-purple" />
      <span className="tabular-nums">{recentActiveItems.length}</span>
      sincronizando
    </Badge>
  )
}
