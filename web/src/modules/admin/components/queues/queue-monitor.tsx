"use client"

import { useQueueStatus } from "@/hooks/use-queues"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Activity } from "lucide-react"

export function QueueMonitor() {
  const { data: queues, isLoading, error } = useQueueStatus()

  if (error) {
    return <div className="text-destructive">Erro ao carregar filas.</div>
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    )
  }

  if (!queues?.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
        <Activity className="h-8 w-8" />
        <p>Nenhuma fila encontrada.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {queues.map((queue) => (
        <Card key={queue.queue_name}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading">
              {queue.queue_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pendentes</span>
              <span className="font-mono font-medium">{queue.pending}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-muted-foreground">Arquivadas</span>
              <span className="font-mono text-muted-foreground">
                {queue.archived}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
