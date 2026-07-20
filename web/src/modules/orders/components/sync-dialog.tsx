"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { useClients } from "@/hooks/use-clients"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { RefreshCw, Loader2, Search, CheckCircle2, XCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { DateRangePicker, getPresetRange } from "@/components/shared/date-range-picker"
import type { DateRange } from "@/components/shared/date-range-picker"
import { SyncProgressPanel } from "./sync-progress-panel"
import { cn } from "@/lib/utils"

type SyncRun = {
  clientId: string
  clientName: string
  key: number
}

export function SyncDialog() {
  const { data: clients, isLoading } = useClients()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange("thisMonth"))
  const [activeSyncs, setActiveSyncs] = useState<SyncRun[]>([])
  const syncKeyRef = useRef(0)

  const filtered = useMemo(() => {
    if (!clients) return []
    return clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
  }, [clients, search])

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.filter((c) => c.status === "active").map((c) => c.id)))
    }
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSync = useCallback(() => {
    if (selected.size === 0) return

    const selectedClients = (clients ?? []).filter((c) => selected.has(c.id))
    const newSyncs = selectedClients.map((c) => ({
      clientId: c.id,
      clientName: c.name,
      key: ++syncKeyRef.current,
    }))

    setActiveSyncs((prev) => [...prev, ...newSyncs])
    setOpen(false)
    setSelected(new Set())
  }, [selected, clients])

  const removeSync = useCallback((key: number) => {
    setActiveSyncs((prev) => prev.filter((s) => s.key !== key))
  }, [])

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button><RefreshCw className="mr-2 h-4 w-4" />Sincronizar Pedidos</Button>} />
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sincronizar Pedidos</DialogTitle>
            <DialogDescription>
              Selecione os clientes e o período. A sincronização começa em tempo real ao confirmar.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          <div className="max-h-48 space-y-1 overflow-y-auto">
            {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
            : filtered.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
            : <>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-muted">
                  <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                  <span>Selecionar todos</span>
                </label>
                <div className="border-t border-border" />
                {filtered.map((client) => {
                  const isActive = client.status === "active"
                  return (
                    <label key={client.id} className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted ${!isActive ? "opacity-50" : ""}`}>
                      <Checkbox checked={selected.has(client.id)} onCheckedChange={() => toggle(client.id)} disabled={!isActive} />
                      <span className="flex-1">{client.name}</span>
                      {!isActive && <span className="text-xs text-muted-foreground">inativo</span>}
                    </label>
                  )
                })}
              </>
            }
          </div>

          <div className="rounded-lg border bg-muted/30 p-3">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Período dos pedidos</label>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>

          <DialogFooter>
            <Button disabled={selected.size === 0} onClick={handleSync}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar ({selected.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeSyncs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Sincronizações em andamento
          </div>
          {activeSyncs.map((sync) => (
            <SyncProgressPanel
              key={sync.key}
              clientId={sync.clientId}
              clientName={sync.clientName}
              dateFrom={dateRange.from}
              dateTo={dateRange.to}
              onClose={() => removeSync(sync.key)}
              onComplete={() => {}}
            />
          ))}
        </div>
      )}
    </>
  )
}
