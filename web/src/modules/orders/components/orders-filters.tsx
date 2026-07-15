"use client"

import { useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useClients } from "@/hooks/use-clients"
import { useConnectedApps } from "@/hooks/use-integrations"
import type { OrderFilters } from "@/hooks/use-orders"

type OrdersFiltersProps = {
  filters: OrderFilters
  onChange: (filters: OrderFilters) => void
  showClientFilter?: boolean
}

const ALL = "__all__"

export function OrdersFilters({ filters, onChange, showClientFilter }: OrdersFiltersProps) {
  const { data: clients } = useClients()
  const { data: apps } = useConnectedApps()
  const [searchInput, setSearchInput] = useState(filters.search ?? "")
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  useEffect(() => {
    setSearchInput(filters.search ?? "")
  }, [filters.search])

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim()
      if (trimmed !== (filtersRef.current.search ?? "")) {
        onChange({ ...filtersRef.current, search: trimmed || undefined })
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput, onChange])

  const erpOptions = (apps ?? []).filter((app) => {
    if (filters.clientId && app.client_id !== filters.clientId) return false
    return true
  })

  const hasActiveFilters = Boolean(filters.clientId || filters.appId || filters.search)

  const clearFilters = () => {
    setSearchInput("")
    onChange({})
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-[200px] flex-1 sm:max-w-xs">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Busca rápida
        </label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pedido, ID marketplace, ERP, rastreio…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {showClientFilter && (
        <div className="w-full sm:w-48">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Cliente
          </label>
          <Select
            value={filters.clientId ?? ALL}
            onValueChange={(v) => {
              const clientId = v === ALL ? undefined : v
              const appStillValid =
                !filters.appId ||
                !clientId ||
                (apps ?? []).some(
                  (a) => a.id === filters.appId && a.client_id === clientId,
                )
              onChange({
                ...filters,
                clientId,
                appId: appStillValid ? filters.appId : undefined,
              })
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os clientes</SelectItem>
              {(clients ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="w-full sm:w-56">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          ERP / Loja
        </label>
        <Select
          value={filters.appId ?? ALL}
          onValueChange={(v) =>
            onChange({ ...filters, appId: v === ALL ? undefined : v })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os ERPs</SelectItem>
            {erpOptions.map((app) => (
              <SelectItem key={app.id} value={app.id}>
                {showClientFilter && app.client_name
                  ? `${app.client_name} · `
                  : ""}
                {app.provider_name ?? app.provider_slug} ({app.app_name})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
          <X className="mr-1 h-4 w-4" />
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
