"use client"

import { useAuditLogs, useAuditLogActions, type AuditLogFilters } from "@/hooks/use-audit-logs"
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
import { useState } from "react"
import { Search, X } from "lucide-react"

export function AuditLogTable() {
  const [filters, setFilters] = useState<AuditLogFilters>({})
  const { data: logs, isLoading } = useAuditLogs(filters)
  const { data: actions } = useAuditLogActions()

  const hasFilters = filters.action || filters.entityType || filters.fromDate

  const clearFilters = () => setFilters({})

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.action ?? ""}
          onValueChange={(v) => setFilters((prev) => ({ ...prev, action: v || undefined }))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            {actions?.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
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
              <TableHead>Ação</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  </TableRow>
                ))
              : logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {log.action}
                      </code>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.entity_type}#{log.entity_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {log.payload ? JSON.stringify(log.payload).slice(0, 60) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
