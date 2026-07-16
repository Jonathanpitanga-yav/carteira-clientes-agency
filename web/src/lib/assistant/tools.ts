import { createCoreClient, createSalesClient } from "@/lib/supabase/server"
import type { ChatCompletionTool } from "openai/resources/index.mjs"

export const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_wallet_clients",
      description: "Lista os clientes da carteira do usuário logado (nome, documento, status)",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_client_kpis",
      description: "Retorna KPIs de faturamento de um ou mais clientes em um período",
      parameters: {
        type: "object",
        properties: {
          client_ids: { type: "array", items: { type: "string" }, description: "IDs dos clientes (vazio = todos da carteira)" },
          date_from: { type: "string", description: "Data início (YYYY-MM-DD)" },
          date_to: { type: "string", description: "Data fim (YYYY-MM-DD)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_monthly_billing",
      description: "Retorna o faturamento mensal consolidado dos clientes",
      parameters: {
        type: "object",
        properties: {
          client_ids: { type: "array", items: { type: "string" }, description: "IDs dos clientes (vazio = todos)" },
          date_from: { type: "string", description: "Data início (YYYY-MM-DD)" },
          date_to: { type: "string", description: "Data fim (YYYY-MM-DD)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_abc_items",
      description: "Retorna a classificação ABC (Curva ABC) dos produtos dos clientes",
      parameters: {
        type: "object",
        properties: {
          client_ids: { type: "array", items: { type: "string" }, description: "IDs dos clientes (vazio = todos)" },
          date_from: { type: "string", description: "Data início (YYYY-MM-DD)" },
          date_to: { type: "string", description: "Data fim (YYYY-MM-DD)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_orders",
      description: "Retorna os pedidos recentes dos clientes",
      parameters: {
        type: "object",
        properties: {
          client_ids: { type: "array", items: { type: "string" }, description: "IDs dos clientes (vazio = todos)" },
          limit: { type: "number", description: "Quantidade máxima de pedidos (padrão 10)" },
          status: { type: "string", description: "Filtrar por status global (approved, canceled, pending, refunded)" },
        },
        required: [],
      },
    },
  },
]

type ToolResult = { role: "tool"; tool_call_id: string; content: string }

export async function executeToolCall(name: string, args: Record<string, unknown>, toolCallId: string): Promise<ToolResult> {
  try {
    let result: unknown

    switch (name) {
      case "get_wallet_clients": {
        const core = await createCoreClient()
        const { data } = await core.from("clients").select("id, name, document, status").order("name")
        result = data ?? []
        break
      }

      case "get_client_kpis": {
        const sales = await createSalesClient()
        const { data } = await sales.rpc("get_dashboard_kpis", {
          p_client_ids: (args.client_ids as string[]) ?? [],
          p_date_from: (args.date_from as string) ?? null,
          p_date_to: (args.date_to as string) ?? null,
        })
        result = data ?? []
        break
      }

      case "get_monthly_billing": {
        const sales = await createSalesClient()
        let query = sales.from("client_monthly_billing").select("*").order("year_month", { ascending: false })
        if (args.client_ids && (args.client_ids as string[]).length > 0) {
          query = query.in("client_id", args.client_ids as string[])
        }
        if (args.date_from) query = query.gte("year_month", (args.date_from as string).slice(0, 7))
        if (args.date_to) query = query.lte("year_month", (args.date_to as string).slice(0, 7))
        const { data } = await query.limit(50)
        result = data ?? []
        break
      }

      case "get_abc_items": {
        const sales = await createSalesClient()
        let query = sales.from("client_item_abc_curve").select("*").order("abc_class").order("rank")
        if (args.client_ids && (args.client_ids as string[]).length > 0) {
          query = query.in("client_id", args.client_ids as string[])
        }
        if (args.date_from) query = query.gte("year_month", (args.date_from as string).slice(0, 7))
        if (args.date_to) query = query.lte("year_month", (args.date_to as string).slice(0, 7))
        const { data } = await query.limit(100)
        result = data ?? []
        break
      }

      case "get_recent_orders": {
        const sales = await createSalesClient()
        const limit = (args.limit as number) ?? 10
        let query = sales.from("invoices").select("id, invoice_number, issue_date, total_amount, global_status, marketplace_name, client_id").order("issue_date", { ascending: false })
        if (args.client_ids && (args.client_ids as string[]).length > 0) {
          query = query.in("client_id", args.client_ids as string[])
        }
        if (args.status) query = query.eq("global_status", args.status)
        const { data } = await query.limit(limit)
        result = data ?? []
        break
      }

      default:
        result = { error: `Ferramenta '${name}' desconhecida` }
    }

    return { role: "tool", tool_call_id: toolCallId, content: JSON.stringify(result) }
  } catch (err) {
    return { role: "tool", tool_call_id: toolCallId, content: JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }) }
  }
}
