"use client"

import { useEffect, useState } from "react"
import { useUserClientLinks, useUpdateClientLinks } from "@/hooks/use-users"
import type { UserWithClients } from "@/hooks/use-users"
import type { Client } from "@/hooks/use-clients"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Props = {
  user: UserWithClients
  allClients: Client[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LinkClientsDialog({ user, allClients, open, onOpenChange }: Props) {
  const { data: linkedIds, isLoading: linksLoading } = useUserClientLinks(user.id)
  const updateLinks = useUpdateClientLinks()
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (linkedIds) setSelected(linkedIds)
  }, [linkedIds])

  const filtered = allClients
    .filter((c) => c.status === "active")
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

  const toggle = (clientId: string) => {
    setSelected((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    )
  }

  const handleSave = async () => {
    await updateLinks.mutateAsync({ userId: user.id, clientIds: selected })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular clientes</DialogTitle>
          <DialogDescription>
            Selecione os clientes que {user.full_name ?? "o usuário"} poderá visualizar.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border p-2">
          {linksLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum cliente encontrado.
            </p>
          ) : (
            filtered.map((client) => (
              <label
                key={client.id}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <Checkbox
                  checked={selected.includes(client.id)}
                  onCheckedChange={() => toggle(client.id)}
                />
                {client.name}
              </label>
            ))
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {selected.length} de {allClients.filter((c) => c.status === "active").length} cliente(s) selecionado(s)
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateLinks.isPending}>
            {updateLinks.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
