export type LogSeverity = "success" | "error" | "warning" | "info"

export type LogSource =
  | "integration"
  | "system"
  | "webhook"
  | "sync"
  | "pgmq"

export type SystemLogEntry = {
  id: string
  source: LogSource
  severity: LogSeverity
  timestamp: string
  event: string
  category?: string | null
  provider?: string | null
  appId?: string | null
  clientName?: string | null
  message?: string | null
  error?: string | null
  payload?: Record<string, unknown> | null
}

const ERROR_PATTERN = /error|failed|failure|signature_invalid|dead_letter|invalid/i
const WARNING_PATTERN = /unmapped|missing_|queue\.enqueued|no_refresh_token|retry/i
const SUCCESS_PATTERN =
  /success|complete|created|updated|saved|processed|received|authorize_success|tokens_saved/i

export function classifyEventName(
  event: string,
  options?: { erpErrorCode?: string | null; queueStatus?: string | null },
): LogSeverity {
  if (options?.erpErrorCode) return "error"

  const status = options?.queueStatus
  if (status === "failed" || status === "dead_letter") return "error"
  if (status === "unmapped") return "warning"
  if (status === "completed" || status === "processed") return "success"

  if (ERROR_PATTERN.test(event)) return "error"
  if (WARNING_PATTERN.test(event)) return "warning"
  if (SUCCESS_PATTERN.test(event)) return "success"
  return "info"
}

export const SEVERITY_LABELS: Record<LogSeverity, string> = {
  success: "Sucesso",
  error: "Erro",
  warning: "Aviso",
  info: "Info",
}

export const SOURCE_LABELS: Record<LogSource, string> = {
  integration: "Integração ERP",
  system: "Sistema",
  webhook: "Webhook",
  sync: "Sincronização",
  pgmq: "Fila PGMQ",
}

export const CATEGORY_LABELS: Record<string, string> = {
  credentials: "Credenciais",
  access: "Acesso",
  queues: "Filas",
}
