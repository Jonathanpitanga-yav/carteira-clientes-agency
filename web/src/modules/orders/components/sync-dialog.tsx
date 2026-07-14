"use client"

import { useState, useMemo } from "react"
import { useClients } from "@/hooks/use-clients"
import { useEnqueueSync } from "@/hooks/use-orders"
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
import { RefreshCw, Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export function SyncDialog() {
  const { data: clients, isLoading } = useClients()
  const enqueueSync = useEnqueueSync()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!clients) return []
    return clients.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()),
    )
  }, [clients, search])

  const activeClients = useMemo(
    () => clients?.filter((c) => c.status === "active") ?? [],
    [clients],
  )

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.filter(c => c.status === "active").map((c) => c.id)))
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

  const handleSync = () => {
    if (selected.size === 0) return
    enqueueSync.mutate(Array.from(selected), {
      onSuccess: () => setOpen(false),
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button><RefreshCw className="mr-2 h-4 w-4" />Sincronizar Pedidos</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sincronizar Pedidos</DialogTitle>
          <DialogDescription>
            Selecione os clientes cujos pedidos serão sincronizados dos ERPs.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))
          ) : filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum cliente encontrado.
            </p>
          ) : (
            <>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-muted">
                <Checkbox
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onCheckedChange={toggleAll}
                />
                <span>Selecionar todos</span>
              </label>
              <div className="border-t border-border" />
              {filtered.map((client) => {
                const isActive = client.status === "active"
                return (
                  <label
                    key={client.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted ${!isActive ? "opacity-50" : ""}`}
                  >
                    <Checkbox
                      checked={selected.has(client.id)}
                      onCheckedChange={() => toggle(client.id)}
                      disabled={!isActive}
                    />
                    <span className="flex-1">{client.name}</span>
                    {!isActive && (
                      <span className="text-xs text-muted-foreground">inativo</span>
                    )}
                  </label>
                )
              })}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={selected.size === 0 || enqueueSync.isPending}
            onClick={handleSync}
          >
            {enqueueSync.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sincronizar ({selected.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
