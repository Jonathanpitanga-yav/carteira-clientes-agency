"use client"

import { useClients } from "@/hooks/use-clients"
import type { DashboardFilters } from "@/hooks/use-client-analytics"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

type Props = {
  filters: DashboardFilters
  onChange: (filters: DashboardFilters) => void
}

export function ClientDashboardFilters({ filters, onChange }: Props) {
  const { data: clients } = useClients()
  const [showClientPicker, setShowClientPicker] = useState(false)

  const selectedClients = clients?.filter((c) => filters.clientIds?.includes(c.id)) ?? []

  function toggleClient(id: string) {
    const current = filters.clientIds ?? []
    const next = current.includes(id)
      ? current.filter((c) => c !== id)
      : [...current, id]
    onChange({ ...filters, clientIds: next.length > 0 ? next : undefined })
  }

  function clearFilters() {
    onChange({ clientIds: undefined, dateFrom: undefined, dateTo: undefined })
  }

  const hasFilters = filters.clientIds?.length || filters.dateFrom || filters.dateTo

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Período</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
            <span className="text-xs text-muted-foreground">até</span>
            <input
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </div>
        </div>

        <div className="w-full sm:w-auto">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Clientes</label>
          <div className="relative">
            <button
              onClick={() => setShowClientPicker(!showClientPicker)}
              className="flex h-9 w-full min-w-[180px] items-center justify-between rounded-md border bg-background px-3 text-sm text-left"
            >
              <span className="truncate">
                {selectedClients.length === 0
                  ? "Todos os clientes"
                  : selectedClients.length === 1
                    ? selectedClients[0].name
                    : `${selectedClients.length} clientes selecionados`}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">▼</span>
            </button>
            {showClientPicker && (
              <div className="absolute z-10 mt-1 max-h-[200px] w-full overflow-y-auto rounded-md border bg-background shadow-lg">
                {clients?.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={filters.clientIds?.includes(c.id) ?? false}
                      onChange={() => toggleClient(c.id)}
                      className="h-4 w-4"
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
            <X className="mr-1 h-3 w-3" />
            Limpar filtros
          </Button>
        )}
      </div>

      {selectedClients.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedClients.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {c.name}
              <button onClick={() => toggleClient(c.id)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
