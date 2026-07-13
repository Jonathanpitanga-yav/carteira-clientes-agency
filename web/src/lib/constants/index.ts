export const ROLES = ["admin", "leader", "analyst", "client"] as const

export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  leader: "Líder",
  analyst: "Analista",
  client: "Cliente",
}

export const QUERY_KEYS = {
  CLIENTS: "clients",
  CLIENT: "client",
  USERS: "users",
  USER: "user",
  BILLING: "billing",
  DAILY_BILLING: "daily-billing",
  PRODUCTS: "products",
  INTEGRATIONS: "integrations",
  AUDIT_LOGS: "audit-logs",
  API_TOKENS: "api-tokens",
  QUEUES: "queues",
  PROFILE: "profile",
} as const

export const ROUTES = {
  LOGIN: "/login",
  ADMIN: "/admin",
  LEADER: "/leader",
  ANALYST: "/analyst",
  CLIENT: "/client",
} as const

export const ROLE_HOME: Record<Role, string> = {
  admin: ROUTES.ADMIN,
  leader: ROUTES.LEADER,
  analyst: ROUTES.ANALYST,
  client: ROUTES.CLIENT,
}
