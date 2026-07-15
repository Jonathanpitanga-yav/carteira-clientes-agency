"use client"

import { useMemo, useState } from "react"
import { useSystemLogs, type SystemLogFilters } from "@/hooks/use-system-logs"
import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  SOURCE_LABELS,
  type LogSeverity,
  type LogSource,
  type SystemLogEntry,
} from "@/lib/logs/classify-log"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Info,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react"

const SEVERITY_STYLES: Record<
  LogSeverity,
  { badge: string; icon: typeof CheckCircle2 }
> = {
  success: { badge: "bg-emerald-600 text-white hover:bg-emerald-600", icon: CheckCircle2 },
  error: { badge: "bg-red-600 text-white hover:bg-red-600", icon: CircleAlert },
  warning: { badge: "bg-amber-600 text-white hover:bg-amber-600", icon: AlertTriangle },
  info: { badge: "bg-slate-500 text-white hover:bg-slate-500", icon: Info },
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function LogRow({
  entry,
  onSelect,
}: {
  entry: SystemLogEntry
  onSelect: (entry: SystemLogEntry) => void
}) {
  const style = SEVERITY_STYLES[entry.severity]
  const Icon = style.icon

  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      className="flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/40"
    >
      <span className="w-[130px] shrink-0 font-mono text-[11px] text-muted-foreground">
        {formatTimestamp(entry.timestamp)}
      </span>
      <Badge className={cn("shrink-0 gap-1", style.badge)}>
        <Icon className="h-3 w-3" />
        {SEVERITY_LABELS[entry.severity]}
      </Badge>
      <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">
        {SOURCE_LABELS[entry.source]}
      </span>
      <code className="max-w-[220px] shrink-0 truncate rounded bg-muted px-1.5 py-0.5 text-[11px]">
        {entry.event}
      </code>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground/90">
        {entry.message ?? entry.clientName ?? entry.provider ?? "—"}
      </span>
      {entry.error && (
        <span className="max-w-[180px] shrink-0 truncate text-xs text-red-500">
          {entry.error}
        </span>
      )}
    </button>
  )
}

export function LogsCenter() {
  const [filters, setFilters] = useState<SystemLogFilters>({ severity: "all", source: "all" })
  const [selected, setSelected] = useState<SystemLogEntry | null>(null)
  const { data, isLoading, isFetching, refetch, error } = useSystemLogs(filters)

  const hasFilters = useMemo(
    () =>
      (filters.severity && filters.severity !== "all") ||
      (filters.source && filters.source !== "all") ||
      !!filters.category ||
      !!filters.search ||
      !!filters.fromDate,
    [filters],
  )

  const clearFilters = () =>
    setFilters({ severity: "all", source: "all" })

  const stats = data?.stats

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(["success", "error", "warning", "info"] as LogSeverity[]).map((severity) => {
          const style = SEVERITY_STYLES[severity]
          const Icon = style.icon
          const count = stats?.[severity] ?? 0
          const total = stats?.total ?? 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0

          return (
            <Card key={severity}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {SEVERITY_LABELS[severity]}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{count}</div>
                <p className="text-xs text-muted-foreground">{pct}% do total ({total})</p>
              </CardContent>
            </Card>
          )
        })}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Atualização
            </CardTitle>
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Atualizar agora
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">Auto-refresh a cada 15s</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <Tabs
          value={filters.severity ?? "all"}
          onValueChange={(v) =>
            setFilters((prev) => ({ ...prev, severity: v as SystemLogFilters["severity"] }))
          }
        >
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="success">Sucesso</TabsTrigger>
            <TabsTrigger value="error">Erro</TabsTrigger>
            <TabsTrigger value="warning">Aviso</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar evento, cliente, erro..."
              className="pl-8"
              value={filters.search ?? ""}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value || undefined }))
              }
            />
          </div>

          <Select
            value={filters.source ?? "all"}
            onValueChange={(v) =>
              setFilters((prev) => ({ ...prev, source: v as SystemLogFilters["source"] }))
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              {(Object.keys(SOURCE_LABELS) as LogSource[]).map((source) => (
                <SelectItem key={source} value={source}>
                  {SOURCE_LABELS[source]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.category ?? "all"}
            onValueChange={(v) =>
              setFilters((prev) => ({ ...prev, category: v === "all" ? undefined : v } as SystemLogFilters))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            className="w-40"
            value={filters.fromDate ?? ""}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, fromDate: e.target.value || undefined }))
            }
          />

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs text-muted-foreground">
          <span>Stream de eventos</span>
          <span>
            {data?.filteredStats.total ?? 0} registro(s)
            {data?.filteredStats.total !== data?.stats.total &&
              ` · ${data?.stats.total ?? 0} no total`}
          </span>
        </div>

        {error ? (
          <div className="px-4 py-8 text-sm text-destructive">
            <p>Erro ao carregar logs. Verifique permissões de admin.</p>
            {error instanceof Error && error.message && (
              <p className="mt-2 font-mono text-xs text-muted-foreground">{error.message}</p>
            )}
          </div>
        ) : isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data?.entries.length ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            Nenhum log encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="max-h-[620px] overflow-y-auto">
            {data.entries.map((entry) => (
              <LogRow key={entry.id} entry={entry} onSelect={setSelected} />
            ))}
          </div>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono text-sm">{selected.event}</SheetTitle>
                <SheetDescription>
                  {formatTimestamp(selected.timestamp)} · {SOURCE_LABELS[selected.source]}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge className={SEVERITY_STYLES[selected.severity].badge}>
                    {SEVERITY_LABELS[selected.severity]}
                  </Badge>
                  {selected.category && (
                    <Badge variant="outline">
                      {CATEGORY_LABELS[selected.category] ?? selected.category}
                    </Badge>
                  )}
                  {selected.provider && <Badge variant="secondary">{selected.provider}</Badge>}
                </div>

                {selected.clientName && (
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p>{selected.clientName}</p>
                  </div>
                )}
                {selected.appId && (
                  <div>
                    <p className="text-xs text-muted-foreground">App ID</p>
                    <p className="font-mono text-xs break-all">{selected.appId}</p>
                  </div>
                )}
                {selected.message && (
                  <div>
                    <p className="text-xs text-muted-foreground">Resumo</p>
                    <p>{selected.message}</p>
                  </div>
                )}
                {selected.error && (
                  <div>
                    <p className="text-xs text-muted-foreground">Erro</p>
                    <p className="text-red-500">{selected.error}</p>
                  </div>
                )}
                {selected.payload && (
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">Payload</p>
                    <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs">
                      {JSON.stringify(selected.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
