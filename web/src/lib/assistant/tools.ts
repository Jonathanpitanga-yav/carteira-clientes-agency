import type { ChatCompletionTool } from "openai/resources/index.mjs"

export const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_wallet_clients",
      description: "Lista os clientes da carteira do usuário logado (nome, documento, status). Use os parâmetros limit e offset para paginação.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Máximo de registros por página (padrão 50)" },
          offset: { type: "number", description: "Deslocamento para paginação (padrão 0)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_client_kpis",
      description: "Retorna KPIs de faturamento de um ou mais clientes em um período (receita, pedidos, ticket médio, comparativo com período anterior)",
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
      description: "Retorna o faturamento mensal consolidado dos clientes. Use limit e offset para paginação.",
      parameters: {
        type: "object",
        properties: {
          client_ids: { type: "array", items: { type: "string" }, description: "IDs dos clientes (vazio = todos)" },
          date_from: { type: "string", description: "Data início (YYYY-MM-DD)" },
          date_to: { type: "string", description: "Data fim (YYYY-MM-DD)" },
          limit: { type: "number", description: "Máximo de registros (padrão 60)" },
          offset: { type: "number", description: "Deslocamento para paginação (padrão 0)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_abc_items",
      description: "Retorna a classificação ABC (Curva ABC) dos produtos dos clientes. Use limit e offset para paginação.",
      parameters: {
        type: "object",
        properties: {
          client_ids: { type: "array", items: { type: "string" }, description: "IDs dos clientes (vazio = todos)" },
          date_from: { type: "string", description: "Data início (YYYY-MM-DD)" },
          date_to: { type: "string", description: "Data fim (YYYY-MM-DD)" },
          limit: { type: "number", description: "Máximo de registros (padrão 100)" },
          offset: { type: "number", description: "Deslocamento para paginação (padrão 0)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_orders",
      description: "Retorna os pedidos recentes dos clientes. Use limit e offset para paginação.",
      parameters: {
        type: "object",
        properties: {
          client_ids: { type: "array", items: { type: "string" }, description: "IDs dos clientes (vazio = todos)" },
          limit: { type: "number", description: "Máximo de pedidos por página (padrão 20)" },
          offset: { type: "number", description: "Deslocamento para paginação (padrão 0)" },
          status: { type: "string", description: "Filtrar por status global (approved, canceled, pending, refunded)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_channel_breakdown",
      description: "Retorna o faturamento separado por canal/marketplace por cliente. Útil para comparar Marketplace vs E-commerce.",
      parameters: {
        type: "object",
        properties: {
          client_ids: { type: "array", items: { type: "string" }, description: "IDs dos clientes (vazio = todos)" },
          date_from: { type: "string", description: "Data início (YYYY-MM-DD)" },
          date_to: { type: "string", description: "Data fim (YYYY-MM-DD)" },
          limit: { type: "number", description: "Máximo de registros (padrão 60)" },
          offset: { type: "number", description: "Deslocamento para paginação (padrão 0)" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_ranking",
      description: "Retorna o ranking de produtos por faturamento para um cliente. Detalha por SKU, categoria, quantidade vendida e receita. Use limit e offset para paginação.",
      parameters: {
        type: "object",
        properties: {
          client_ids: { type: "array", items: { type: "string" }, description: "IDs dos clientes (vazio = todos)" },
          limit: { type: "number", description: "Máximo de produtos por página (padrão 20)" },
          offset: { type: "number", description: "Deslocamento para paginação (padrão 0)" },
        },
        required: [],
      },
    },
  },
]

export const TOOL_LABELS: Record<string, string> = {
  get_wallet_clients: "Consultando clientes",
  get_client_kpis: "Calculando KPIs",
  get_monthly_billing: "Buscando faturamento mensal",
  get_abc_items: "Analisando curva ABC",
  get_recent_orders: "Buscando pedidos",
  get_channel_breakdown: "Analisando canais de venda",
  get_product_ranking: "Buscando ranking de produtos",
}

type ToolResult = { role: "tool"; tool_call_id: string; content: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeToolCall(name: string, args: Record<string, unknown>, toolCallId: string, core: any, sales: any): Promise<ToolResult> {
  try {
    let result: unknown

    switch (name) {
      case "get_wallet_clients": {
        const limit = (args.limit as number) ?? 50
        const offset = (args.offset as number) ?? 0
        const { data } = await core.from("clients").select("id, name, document, status").order("name").range(offset, offset + limit - 1)
        result = data ?? []
        break
      }

      case "get_client_kpis": {
        const { data } = await sales.rpc("get_dashboard_kpis", {
          p_client_ids: (args.client_ids as string[]) ?? [],
          p_date_from: (args.date_from as string) ?? null,
          p_date_to: (args.date_to as string) ?? null,
        })
        result = data ?? []
        break
      }

      case "get_monthly_billing": {
        const limit = (args.limit as number) ?? 60
        const offset = (args.offset as number) ?? 0
        let query = sales.from("client_monthly_billing").select("*").order("year_month", { ascending: false })
        if (args.client_ids && (args.client_ids as string[]).length > 0) {
          query = query.in("client_id", args.client_ids as string[])
        }
        if (args.date_from) query = query.gte("year_month", (args.date_from as string).slice(0, 7))
        if (args.date_to) query = query.lte("year_month", (args.date_to as string).slice(0, 7))
        const { data } = await query.range(offset, offset + limit - 1)
        result = data ?? []
        break
      }

      case "get_abc_items": {
        const limit = (args.limit as number) ?? 100
        const offset = (args.offset as number) ?? 0
        let query = sales.from("client_item_abc_curve").select("*").order("abc_class").order("rank")
        if (args.client_ids && (args.client_ids as string[]).length > 0) {
          query = query.in("client_id", args.client_ids as string[])
        }
        if (args.date_from) query = query.gte("year_month", (args.date_from as string).slice(0, 7))
        if (args.date_to) query = query.lte("year_month", (args.date_to as string).slice(0, 7))
        const { data } = await query.range(offset, offset + limit - 1)
        result = data ?? []
        break
      }

      case "get_recent_orders": {
        const limit = (args.limit as number) ?? 20
        const offset = (args.offset as number) ?? 0
        let query = sales
          .from("invoices")
          .select("id, invoice_number, issue_date, total_amount, global_status, marketplace_name, carrier_name, client_id")
          .order("issue_date", { ascending: false })
        if (args.client_ids && (args.client_ids as string[]).length > 0) {
          query = query.in("client_id", args.client_ids as string[])
        }
        if (args.status) query = query.eq("global_status", args.status)
        const { data } = await query.range(offset, offset + limit - 1)
        result = data ?? []
        break
      }

      case "get_channel_breakdown": {
        const limit = (args.limit as number) ?? 60
        const offset = (args.offset as number) ?? 0
        let query = sales.from("client_channel_breakdown").select("*")
        if (args.client_ids && (args.client_ids as string[]).length > 0) {
          query = query.in("client_id", args.client_ids as string[])
        }
        if (args.date_from) query = query.gte("year_month", (args.date_from as string).slice(0, 7))
        if (args.date_to) query = query.lte("year_month", (args.date_to as string).slice(0, 7))
        const { data } = await query.order("year_month", { ascending: false }).range(offset, offset + limit - 1)
        result = data ?? []
        break
      }

      case "get_product_ranking": {
        const limit = (args.limit as number) ?? 20
        const offset = (args.offset as number) ?? 0
        let query = sales.from("client_item_abc_curve").select("*").order("total_revenue", { ascending: false })
        if (args.client_ids && (args.client_ids as string[]).length > 0) {
          query = query.in("client_id", args.client_ids as string[])
        }
        const { data } = await query.range(offset, offset + limit - 1)
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
