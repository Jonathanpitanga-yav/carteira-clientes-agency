import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient, createSchemaClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"
import { humanError } from "@/lib/utils/errors"
import { toast } from "sonner"
import { getSupabaseEnv } from "@/lib/env"

const SUPABASE_URL = getSupabaseEnv().url

export type Invoice = {
  id: string
  client_id: string
  client_name?: string | null
  app_id: string
  external_id: string
  erp_order_number: string | null
  invoice_number: string | null
  issue_date: string
  total_amount: number
  status: string
  global_status: string | null
  erp_status_code: string | null
  erp_status_label: string | null
  freight_value: number | null
  freight_paid_by: string | null
  commission_fee: number | null
  commission_base: number | null
  discount_value: number | null
  marketplace_id: string | null
  marketplace_name: string | null
  erp_marketplace_name?: string | null
  erp_marketplace_catalog_slug?: string | null
  marketplace_order_id: string | null
  global_marketplace_slug: string | null
  global_logistics_slug: string | null
  global_order_type_slug: string | null
  erp_logistics_name: string | null
  order_type: string | null
  sales_channel: string | null
  carrier_name: string | null
  tracking_code: string | null
  tracking_url: string | null
  shipping_method: string | null
  notes: string | null
  created_at: string
  synced_at: string | null
}

export type SyncQueueItem = {
  id: string
  app_id: string
  client_id: string
  status: "pending" | "processing" | "completed" | "failed"
  created_at: string
  started_at: string | null
  completed_at: string | null
  error: string | null
  retry_count: number
  client_name: string | null
  provider_name: string | null
  provider_slug: string | null
  app_name: string | null
}

export const GLOBAL_STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-slate-500 text-white" },
  pending: { label: "Pendente", color: "bg-amber-500 text-white" },
  approved: { label: "Aprovado", color: "bg-emerald-600 text-white" },
  in_production: { label: "Em preparação", color: "bg-blue-600 text-white" },
  invoiced: { label: "Faturado", color: "bg-violet-600 text-white" },
  shipped: { label: "Enviado", color: "bg-sky-600 text-white" },
  delivered: { label: "Entregue", color: "bg-green-600 text-white" },
  canceled: { label: "Cancelado", color: "bg-red-600 text-white" },
  returned: { label: "Devolvido", color: "bg-rose-500 text-white" },
  refunded: { label: "Reembolsado", color: "bg-fuchsia-600 text-white" },
  unknown: { label: "Desconhecido", color: "bg-gray-400 text-white" },
}

export function getGlobalStatusDisplay(slug: string | null | undefined) {
  const key = slug && GLOBAL_STATUS_MAP[slug] ? slug : "unknown"
  return GLOBAL_STATUS_MAP[key]
}

const GLOBAL_MARKETPLACE_MAP: Record<string, string> = {
  mercado_livre: "Mercado Livre",
  magalu: "Magalu",
  shopee: "Shopee",
  amazon: "Amazon",
  americanas: "Americanas",
  shein: "Shein",
  tiktok: "TikTok Shop",
  kwai: "Kwai",
  temu: "Temu",
  aliexpress: "AliExpress",
  nuvemshop: "Nuvemshop",
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  unknown: "Desconhecido",
}

const GLOBAL_LOGISTICS_MAP: Record<string, string> = {
  mercado_envios: "Mercado Envios",
  mercado_envios_flex: "Mercado Envios Flex",
  mercado_envios_full: "Mercado Envios Full",
  magalu_entregas: "Magalu Entregas",
  magalu_fulfillment: "Magalu Fulfillment",
  shopee_envios: "Shopee Envios",
  amazon_dba: "Amazon DBA",
  correios: "Correios",
  transportadora: "Transportadora",
  gateway_logistico: "Gateway Logístico",
  sem_frete: "Sem Frete",
  unknown: "Desconhecido",
}

const GLOBAL_ORDER_TYPE_MAP: Record<string, string> = {
  marketplace: "Marketplace",
  ecommerce: "E-commerce",
  physical_store: "Loja Física",
  wholesale: "Atacado",
  manual: "Manual",
  unknown: "Desconhecido",
}

const ECOMMERCE_PLATFORM_SLUGS = new Set(["shopify", "nuvemshop", "woocommerce"])

/** Plataformas de loja própria (Shopify etc.) → E-commerce, não Marketplace. */
export function resolveStoreTypeSlug(order: {
  global_order_type_slug?: string | null
  global_marketplace_slug?: string | null
  marketplace_name?: string | null
  order_type?: string | null
}): string {
  const marketplaceSlug = order.global_marketplace_slug
  if (marketplaceSlug && ECOMMERCE_PLATFORM_SLUGS.has(marketplaceSlug)) return "ecommerce"

  const name = (order.marketplace_name || "").toLowerCase()
  if (name.includes("shopify") || name.includes("nuvem") || name.includes("woocommerce")) {
    return "ecommerce"
  }

  if (order.global_order_type_slug === "ecommerce") return "ecommerce"
  if (order.global_order_type_slug === "marketplace") return "marketplace"
  if (order.order_type === "store") return "ecommerce"
  if (order.order_type === "marketplace") return "marketplace"
  return order.global_order_type_slug || "unknown"
}

export function getStoreTypeDisplay(order: {
  global_order_type_slug?: string | null
  global_marketplace_slug?: string | null
  marketplace_name?: string | null
  order_type?: string | null
}) {
  return getGlobalOrderTypeDisplay(resolveStoreTypeSlug(order), order.order_type)
}

export function getGlobalMarketplaceDisplay(
  slug: string | null,
  fallback?: string | null,
  orderType?: string | null,
  catalogName?: string | null,
) {
  if (slug && slug !== "unknown" && GLOBAL_MARKETPLACE_MAP[slug]) return GLOBAL_MARKETPLACE_MAP[slug]
  if (fallback?.trim()) return fallback.trim()
  if (catalogName?.trim()) return catalogName.trim()
  if (orderType === "store") return "Loja própria"
  return "—"
}

const MARKETPLACE_DEFAULT_LOGISTICS: Record<string, string> = {
  mercado_livre: "mercado_envios",
  magalu: "magalu_entregas",
  shopee: "shopee_envios",
  amazon: "amazon_dba",
}

export function getGlobalLogisticsDisplay(
  slug: string | null,
  fallback?: string | null,
  marketplaceSlug?: string | null,
) {
  if (slug && slug !== "unknown" && GLOBAL_LOGISTICS_MAP[slug]) return GLOBAL_LOGISTICS_MAP[slug]
  if (fallback?.trim()) return fallback.trim()
  if (marketplaceSlug && marketplaceSlug !== "unknown") {
    const inferred = MARKETPLACE_DEFAULT_LOGISTICS[marketplaceSlug]
    if (inferred && GLOBAL_LOGISTICS_MAP[inferred]) return GLOBAL_LOGISTICS_MAP[inferred]
  }
  return "—"
}

export function getGlobalOrderTypeDisplay(slug: string | null, fallback?: string | null) {
  if (slug && GLOBAL_ORDER_TYPE_MAP[slug]) return GLOBAL_ORDER_TYPE_MAP[slug]
  if (fallback === "store") return "E-commerce"
  if (fallback === "marketplace") return "Marketplace"
  return fallback || "—"
}

type UseOrdersOptions = {
  clientId?: string
  appId?: string
  search?: string
  page?: number
  pageSize?: number
}

export type OrderFilters = Pick<UseOrdersOptions, "clientId" | "appId" | "search">

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, (c) => `\\${c}`)
}

export function useOrders(options: UseOrdersOptions = {}) {
  const page = options.page ?? 1
  const pageSize = options.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  return useQuery({
    queryKey: [
      QUERY_KEYS.ORDERS,
      {
        clientId: options.clientId,
        appId: options.appId,
        search: options.search,
        page,
        pageSize,
      },
    ],
    queryFn: async () => {
      const sales = createSchemaClient("sales")

      let baseQuery = sales.from("invoices").select("*", { count: "exact" })

      if (options.clientId) {
        baseQuery = baseQuery.eq("client_id", options.clientId)
      }
      if (options.appId) {
        baseQuery = baseQuery.eq("app_id", options.appId)
      }

      const search = options.search?.trim()
      if (search) {
        const pattern = `%${escapeIlike(search)}%`
        baseQuery = baseQuery.or(
          [
            `invoice_number.ilike.${pattern}`,
            `erp_order_number.ilike.${pattern}`,
            `external_id.ilike.${pattern}`,
            `marketplace_order_id.ilike.${pattern}`,
            `tracking_code.ilike.${pattern}`,
            `marketplace_name.ilike.${pattern}`,
          ].join(","),
        )
      }

      const { data, error, count } = await baseQuery
        .order("issue_date", { ascending: false })
        .range(from, to)

      if (error) throw error

      const rows = (data ?? []) as Invoice[]
      const clientIds = [...new Set(rows.map((r) => r.client_id).filter(Boolean))]
      const marketplaceIds = [...new Set(rows.map((r) => r.marketplace_id).filter(Boolean))]

      let clientNameById = new Map<string, string>()
      if (clientIds.length > 0) {
        const core = createSchemaClient("core")
        const { data: clients, error: clientsError } = await core
          .from("clients")
          .select("id, name")
          .in("id", clientIds)

        if (!clientsError && clients) {
          clientNameById = new Map(clients.map((c: { id: string; name: string }) => [c.id, c.name]))
        }
      }

      let marketplaceById = new Map<string, { name: string; global_marketplace_slug: string | null }>()
      if (marketplaceIds.length > 0) {
        const { data: marketplaces, error: marketplacesError } = await sales
          .from("erp_marketplaces")
          .select("id, name, global_marketplace_slug")
          .in("id", marketplaceIds)

        if (!marketplacesError && marketplaces) {
          marketplaceById = new Map(
            marketplaces.map((m: { id: string; name: string; global_marketplace_slug: string | null }) => [
              m.id,
              { name: m.name, global_marketplace_slug: m.global_marketplace_slug },
            ]),
          )
        }
      }

      const orders = rows.map((row) => {
        const catalog = row.marketplace_id ? marketplaceById.get(row.marketplace_id) : undefined
        return {
          ...row,
          client_name: clientNameById.get(row.client_id) ?? null,
          erp_marketplace_name: catalog?.name ?? null,
          erp_marketplace_catalog_slug: catalog?.global_marketplace_slug ?? null,
        }
      })

      return { orders, count: count ?? 0 }
    },
  })
}

export function useSyncQueue() {
  return useQuery({
    queryKey: [QUERY_KEYS.QUEUES, "sync"],
    queryFn: async () => {
      const jobs = createSchemaClient("jobs")
      const { data, error } = await jobs
        .from("sync_queue_status")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error
      return data as SyncQueueItem[]
    },
    refetchInterval: 10_000,
  })
}

export function useEnqueueSync() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (clientIds: string[]) => {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/erp-enqueue-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await createClient().auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ clientIds }),
        },
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || "Erro ao iniciar sincronização")
      }

      return res.json()
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.QUEUES, "sync"] })
      toast.success(data.message || "Sincronização enfileirada!")
    },
    onError: (err) => toast.error(humanError(err)),
  })
}
