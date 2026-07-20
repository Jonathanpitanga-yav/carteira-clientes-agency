"use client"

import { useClients } from "@/hooks/use-clients"
import { useDashboardChannels, useDashboardLogistics } from "@/hooks/use-client-analytics"
import type { DashboardFilters } from "@/hooks/use-client-analytics"
import { DateRangePicker, getPresetRange, type DateRange, type PresetId } from "@/components/shared/date-range-picker"
import { Button } from "@/components/ui/button"
import { X, ChevronDown } from "lucide-react"
import { useState } from "react"

type Props = {
  filters: DashboardFilters
  onChange: (filters: DashboardFilters) => void
  showLogisticsFilter?: boolean
  showChannelFilter?: boolean
  showClientFilter?: boolean
}

export function AnalyticsFilters({ filters, onChange, showLogisticsFilter, showChannelFilter, showClientFilter = true }: Props) {
  const { data: clients } = useClients()
  const { data: channels } = useDashboardChannels(filters)
  const { data: logistics } = useDashboardLogistics(filters)
  const [showClientPicker, setShowClientPicker] = useState(false)
  const [showChannelPicker, setShowChannelPicker] = useState(false)
  const [showLogisticsPicker, setShowLogisticsPicker] = useState(false)

  const selectedClients = clients?.filter((c) => filters.clientIds?.includes(c.id)) ?? []
  const selectedChannels = channels?.filter((c) => filters.channelSlugs?.includes(c.channel_slug)) ?? []
  const selectedLogistics = logistics?.filter((l) => filters.logisticsSlugs?.includes(l.logistics_slug)) ?? []

  const dateRange: DateRange = filters.dateFrom && filters.dateTo
    ? { from: filters.dateFrom, to: filters.dateTo, preset: "custom" as PresetId }
    : getPresetRange("thisMonth")

  function handleDateChange(range: DateRange) {
    onChange({ ...filters, dateFrom: range.from, dateTo: range.to })
  }

  function toggleClient(id: string) {
    const current = filters.clientIds ?? []
    const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id]
    onChange({ ...filters, clientIds: next.length > 0 ? next : undefined })
  }

  function toggleChannel(slug: string) {
    const current = filters.channelSlugs ?? []
    const next = current.includes(slug) ? current.filter((c) => c !== slug) : [...current, slug]
    onChange({ ...filters, channelSlugs: next.length > 0 ? next : undefined })
  }

  function toggleLogistics(slug: string) {
    const current = filters.logisticsSlugs ?? []
    const next = current.includes(slug) ? current.filter((l) => l !== slug) : [...current, slug]
    onChange({ ...filters, logisticsSlugs: next.length > 0 ? next : undefined })
  }

  function clearFilters() {
    onChange({ clientIds: undefined, dateFrom: undefined, dateTo: undefined, channelSlugs: undefined, logisticsSlugs: undefined })
  }

  const hasFilters = filters.clientIds?.length || filters.dateFrom || filters.dateTo || filters.channelSlugs?.length || filters.logisticsSlugs?.length
  const totalActive = (filters.clientIds?.length ?? 0) + (filters.channelSlugs?.length ?? 0) + (filters.logisticsSlugs?.length ?? 0)

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Período</label>
          <DateRangePicker value={dateRange} onChange={handleDateChange} />
        </div>

        {showClientFilter && (
          <div className="w-full sm:w-auto">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Clientes</label>
            <div className="relative">
              <button
                onClick={() => { setShowClientPicker(!showClientPicker); setShowChannelPicker(false); setShowLogisticsPicker(false) }}
                className="flex h-8 w-full min-w-[160px] items-center justify-between rounded-md border bg-background px-2.5 text-sm text-left"
              >
                <span className="truncate text-xs">
                  {selectedClients.length === 0 ? "Todos" : `${selectedClients.length} cliente(s)`}
                </span>
                <ChevronDown className="ml-1 h-3 w-3 shrink-0 text-muted-foreground" />
              </button>
              {showClientPicker && (
                <div className="absolute z-10 mt-1 max-h-[180px] w-full overflow-y-auto rounded-md border bg-background shadow-lg">
                  {clients?.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/50">
                      <input type="checkbox" checked={filters.clientIds?.includes(c.id) ?? false} onChange={() => toggleClient(c.id)} className="h-3.5 w-3.5" />
                      {c.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {showChannelFilter && channels && channels.length > 0 && (
          <div className="w-full sm:w-auto">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Canal</label>
            <div className="relative">
              <button
                onClick={() => { setShowChannelPicker(!showChannelPicker); setShowClientPicker(false); setShowLogisticsPicker(false) }}
                className="flex h-8 w-full min-w-[140px] items-center justify-between rounded-md border bg-background px-2.5 text-sm text-left"
              >
                <span className="truncate text-xs">
                  {selectedChannels.length === 0 ? "Todos" : `${selectedChannels.length} canal(is)`}
                </span>
                <ChevronDown className="ml-1 h-3 w-3 shrink-0 text-muted-foreground" />
              </button>
              {showChannelPicker && (
                <div className="absolute z-10 mt-1 max-h-[180px] w-full overflow-y-auto rounded-md border bg-background shadow-lg">
                  {channels.map((c) => (
                    <label key={c.channel_slug} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/50">
                      <input type="checkbox" checked={filters.channelSlugs?.includes(c.channel_slug) ?? false} onChange={() => toggleChannel(c.channel_slug)} className="h-3.5 w-3.5" />
                      {c.channel_slug}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {showLogisticsFilter && logistics && logistics.length > 0 && (
          <div className="w-full sm:w-auto">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Logística</label>
            <div className="relative">
              <button
                onClick={() => { setShowLogisticsPicker(!showLogisticsPicker); setShowClientPicker(false); setShowChannelPicker(false) }}
                className="flex h-8 w-full min-w-[140px] items-center justify-between rounded-md border bg-background px-2.5 text-sm text-left"
              >
                <span className="truncate text-xs">
                  {selectedLogistics.length === 0 ? "Todos" : `${selectedLogistics.length} operador(es)`}
                </span>
                <ChevronDown className="ml-1 h-3 w-3 shrink-0 text-muted-foreground" />
              </button>
              {showLogisticsPicker && (
                <div className="absolute z-10 mt-1 max-h-[180px] w-full overflow-y-auto rounded-md border bg-background shadow-lg">
                  {logistics.map((l) => (
                    <label key={l.logistics_slug} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/50">
                      <input type="checkbox" checked={filters.logisticsSlugs?.includes(l.logistics_slug) ?? false} onChange={() => toggleLogistics(l.logistics_slug)} className="h-3.5 w-3.5" />
                      {l.logistics_slug}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {hasFilters && totalActive > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0 h-8">
            <X className="mr-1 h-3 w-3" />
            Limpar filtros
          </Button>
        )}
      </div>

      {selectedClients.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedClients.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {c.name}
              <button onClick={() => toggleClient(c.id)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
