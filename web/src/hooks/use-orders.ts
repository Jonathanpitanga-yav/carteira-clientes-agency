import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient, createSchemaClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"
import { humanError } from "@/lib/utils/errors"
import { toast } from "sonner"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export type Invoice = {
  id: string
  client_id: string
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
  marketplace_order_id: string | null
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

const GLOBAL_STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-gray-400 text-white" },
  pending: { label: "Pendente", color: "bg-orange-500 text-white" },
  approved: { label: "Aprovado", color: "bg-emerald-600 text-white" },
  in_production: { label: "Em Produção", color: "bg-blue-500 text-white" },
  invoiced: { label: "Faturado", color: "bg-violet-600 text-white" },
  shipped: { label: "Enviado", color: "bg-cyan-600 text-white" },
  delivered: { label: "Entregue", color: "bg-green-600 text-white" },
  canceled: { label: "Cancelado", color: "bg-red-600 text-white" },
  refunded: { label: "Reembolsado", color: "bg-pink-600 text-white" },
  unknown: { label: "Desconhecido", color: "bg-gray-400 text-white" },
}

export function getGlobalStatusDisplay(slug: string | null) {
  return GLOBAL_STATUS_MAP[slug ?? ""] ?? { label: slug ?? "—", color: "bg-gray-400 text-white" }
}

type UseOrdersOptions = {
  clientId?: string
  page?: number
  pageSize?: number
}

export function useOrders(options: UseOrdersOptions = {}) {
  const page = options.page ?? 1
  const pageSize = options.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  return useQuery({
    queryKey: [QUERY_KEYS.BILLING, "orders", { clientId: options.clientId, page, pageSize }],
    queryFn: async () => {
      const sales = createSchemaClient("sales")

      const baseQuery = sales.from("invoices").select("*", { count: "exact" })
      if (options.clientId) {
        baseQuery.eq("client_id", options.clientId)
      }

      const { data, error, count } = await baseQuery
        .order("issue_date", { ascending: false })
        .range(from, to)

      if (error) throw error

      return { orders: data as Invoice[], count: count ?? 0 }
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
