"use client"

import { useActivityLogs, useActivityEventTypes, type ActivityFilters } from "@/hooks/use-activity-logs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { X } from "lucide-react"

const CATEGORY_LABELS: Record<string, string> = {
  credentials: "Credenciais",
  access: "Acesso e Permissões",
  queues: "Filas e Sincronização",
}

const CATEGORY_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  credentials: "secondary",
  access: "default",
  queues: "outline",
}

export function ActivityHistoryTable() {
  const [filters, setFilters] = useState<ActivityFilters>({})
  const { data: logs, isLoading } = useActivityLogs(filters)
  const { data: eventTypes } = useActivityEventTypes()

  const hasFilters = filters.category || filters.event_type || filters.fromDate || filters.provider

  const clearFilters = () => setFilters({})

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.category ?? ""}
          onValueChange={(v) => setFilters((prev) => ({ ...prev, category: v || undefined }))}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.event_type ?? ""}
          onValueChange={(v) => setFilters((prev) => ({ ...prev, event_type: v || undefined }))}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tipo de evento" />
          </SelectTrigger>
          <SelectContent>
            {eventTypes?.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Data início"
          type="date"
          className="w-40"
          value={filters.fromDate ?? ""}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, fromDate: e.target.value || undefined }))
          }
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" /> Limpar
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  </TableRow>
                ))
              : logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={CATEGORY_VARIANTS[log.category] || "outline"}>
                        {CATEGORY_LABELS[log.category] || log.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {log.event_type}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-muted-foreground">
                      <div className="space-y-0.5">
                        {log.provider && <span className="block">ERP: {log.provider}</span>}
                        {log.erp_error_code && (
                          <span className="block text-red-500">Erro: {log.erp_error_code}</span>
                        )}
                        {log.payload && (
                          <span className="block truncate" title={JSON.stringify(log.payload)}>
                            {JSON.stringify(log.payload).slice(0, 80)}
                          </span>
                        )}
                        {!log.provider && !log.payload && <span className="text-muted-foreground/50">—</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
