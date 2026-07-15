import { useQuery } from "@tanstack/react-query"
import { createSchemaClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"
import {
  classifyEventName,
  type LogSeverity,
  type LogSource,
  type SystemLogEntry,
} from "@/lib/logs/classify-log"

export type SystemLogFilters = {
  severity?: LogSeverity | "all"
  source?: LogSource | "all"
  category?: string
  search?: string
  fromDate?: string
  toDate?: string
}

export type LogStats = Record<LogSeverity, number> & { total: number }

function summarizePayload(payload: Record<string, unknown> | null | undefined): string | null {
  if (!payload || Object.keys(payload).length === 0) return null
  const parts: string[] = []
  if (typeof payload.error === "string") parts.push(payload.error)
  if (typeof payload.provider === "string") parts.push(`provider=${payload.provider}`)
  if (typeof payload.queue === "string") parts.push(`queue=${payload.queue}`)
  if (typeof payload.companyExternalId === "string") parts.push(`company=${payload.companyExternalId}`)
  if (typeof payload.eventType === "string") parts.push(`event=${payload.eventType}`)
  if (parts.length > 0) return parts.join(" · ")
  const raw = JSON.stringify(payload)
  return raw.length > 120 ? `${raw.slice(0, 120)}…` : raw
}

async function fetchSystemLogs(): Promise<SystemLogEntry[]> {
  const integration = createSchemaClient("integration")
  const core = createSchemaClient("core")
  const jobs = createSchemaClient("jobs")

  const [integrationRes, coreRes, webhookRes, syncRes, pgmqRes] = await Promise.all([
    integration
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    core
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    jobs
      .from("webhook_invoices_queue_status")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80),
    jobs
      .from("sync_queue_status")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80),
    jobs.from("queue_status").select("*"),
  ])

  const failures: string[] = []
  if (integrationRes.error) failures.push(`integration.audit_logs: ${integrationRes.error.message}`)
  if (coreRes.error) failures.push(`core.audit_logs: ${coreRes.error.message}`)
  if (webhookRes.error) failures.push(`webhook_invoices_queue_status: ${webhookRes.error.message}`)
  if (syncRes.error) failures.push(`sync_queue_status: ${syncRes.error.message}`)
  if (pgmqRes.error) failures.push(`queue_status: ${pgmqRes.error.message}`)

  if (failures.length === 5) {
    throw new Error(failures.join(" · "))
  }

  const entries: SystemLogEntry[] = []

  for (const row of integrationRes.data ?? []) {
    const event = row.event_type as string
    entries.push({
      id: `integration:${row.id}`,
      source: "integration",
      severity: classifyEventName(event, { erpErrorCode: row.erp_error_code }),
      timestamp: row.created_at,
      event,
      category: row.category,
      provider: row.provider,
      appId: row.app_id,
      message: summarizePayload(row.payload as Record<string, unknown> | null),
      error: row.erp_error_code,
      payload: row.payload as Record<string, unknown> | null,
    })
  }

  for (const row of coreRes.data ?? []) {
    const event = row.action as string
    entries.push({
      id: `system:${row.id}`,
      source: "system",
      severity: classifyEventName(event),
      timestamp: row.created_at,
      event,
      category: row.entity_type,
      message: summarizePayload(row.payload as Record<string, unknown> | null),
      payload: row.payload as Record<string, unknown> | null,
    })
  }

  for (const row of webhookRes.data ?? []) {
    const event = row.event_type
      ? `webhook.${row.event_type}`
      : `webhook.queue.${row.status}`
    entries.push({
      id: `webhook:${row.id}`,
      source: "webhook",
      severity: classifyEventName(event, { queueStatus: row.status }),
      timestamp: row.completed_at ?? row.started_at ?? row.created_at,
      event,
      provider: row.provider_slug ?? row.provider,
      appId: row.app_id,
      clientName: row.client_name ?? row.app_name,
      message: row.error ?? `${row.provider_name ?? row.provider} · ${row.status}`,
      error: row.error,
      payload: {
        status: row.status,
        companyExternalId: row.company_external_id,
        retryCount: row.retry_count,
        invoiceId: row.invoice_id,
      },
    })
  }

  for (const row of syncRes.data ?? []) {
    const event = `sync.queue.${row.status}`
    entries.push({
      id: `sync:${row.id}`,
      source: "sync",
      severity: classifyEventName(event, { queueStatus: row.status }),
      timestamp: row.completed_at ?? row.started_at ?? row.created_at,
      event,
      provider: row.provider_slug,
      appId: row.app_id,
      clientName: row.client_name ?? row.app_name,
      message: row.error ?? `${row.provider_name ?? "sync"} · ${row.status}`,
      error: row.error,
      payload: {
        status: row.status,
        retryCount: row.retry_count,
      },
    })
  }

  const now = new Date().toISOString()
  for (const row of pgmqRes.data ?? []) {
    const pending = Number(row.pending ?? 0)
    const archived = Number(row.archived ?? 0)
    if (pending === 0 && archived === 0) continue

    entries.push({
      id: `pgmq:${row.queue_name}`,
      source: "pgmq",
      severity: archived > 0 ? "warning" : pending > 10 ? "warning" : "info",
      timestamp: now,
      event: `pgmq.${row.queue_name}`,
      message: `${pending} pendente(s) · ${archived} arquivada(s)`,
      payload: { pending, archived, queueName: row.queue_name },
    })
  }

  return entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
}

function applyFilters(entries: SystemLogEntry[], filters?: SystemLogFilters): SystemLogEntry[] {
  let result = entries

  if (filters?.severity && filters.severity !== "all") {
    result = result.filter((e) => e.severity === filters.severity)
  }
  if (filters?.source && filters.source !== "all") {
    result = result.filter((e) => e.source === filters.source)
  }
  if (filters?.category) {
    result = result.filter((e) => e.category === filters.category)
  }
  if (filters?.fromDate) {
    const from = new Date(filters.fromDate).getTime()
    result = result.filter((e) => new Date(e.timestamp).getTime() >= from)
  }
  if (filters?.toDate) {
    const to = new Date(`${filters.toDate}T23:59:59`).getTime()
    result = result.filter((e) => new Date(e.timestamp).getTime() <= to)
  }
  if (filters?.search?.trim()) {
    const q = filters.search.trim().toLowerCase()
    result = result.filter((e) =>
      [e.event, e.message, e.error, e.clientName, e.provider, e.category]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }

  return result
}

function computeStats(entries: SystemLogEntry[]): LogStats {
  const stats: LogStats = { total: entries.length, success: 0, error: 0, warning: 0, info: 0 }
  for (const e of entries) stats[e.severity]++
  return stats
}

export function useSystemLogs(filters?: SystemLogFilters) {
  return useQuery({
    queryKey: [QUERY_KEYS.SYSTEM_LOGS, filters],
    queryFn: async () => {
      const all = await fetchSystemLogs()
      const filtered = applyFilters(all, filters)
      return {
        entries: filtered.slice(0, 200),
        stats: computeStats(all),
        filteredStats: computeStats(filtered),
      }
    },
    refetchInterval: 15_000,
  })
}
