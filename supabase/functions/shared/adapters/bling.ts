import { IERPAdapter, ERPTokenResponse, ERPOrder } from "./base.ts";
import { throttledFetch } from "../utils/rate-limiter.ts";

const FREIGHT_PAID_BY_MAP: Record<string, string> = {
  "0": "CIF",
  "1": "FOB",
  "2": "terceiros",
  "3": "proprio_remetente",
  "4": "proprio_destinatario",
  "9": "sem_transporte",
};

const SITUACAO_TO_GLOBAL: Record<string, string> = {
  "0": "draft",
  "1": "approved",
  "2": "canceled",
  "3": "refunded",
  "4": "invoiced",
  "5": "shipped",
  "6": "delivered",
  "7": "shipped",
  "9": "pending",
};

function parseItem(i: any): ERPOrder["items"][number] {
  return {
    externalProductId: String(i.id || i.idProduto || i.codigo || i.produto?.id || ""),
    sku: i.codigo || null,
    description: i.descricaoDetalhada || i.descricao || "",
    quantity: Number(i.quantidade) || 1,
    unitPrice: Number(i.valor) || 0,
    totalAmount: Number(i.valorTotal || (Number(i.quantidade) * Number(i.valor))) || 0,
  };
}

function parseOrder(o: any): ERPOrder {
  const situacao = o.situacao || {};
  const situacaoId = String(situacao.id ?? situacao ?? "");
  const loja = o.loja || {};
  const unidadeNegocio = loja.unidadeNegocio || {};
  const transporte = o.transporte || {};
  const contato = transporte.contato || {};
  const volumes = transporte.volumes || [];
  const taxas = o.taxas || {};
  const desconto = o.desconto || {};

  const order: ERPOrder = {
    externalId: String(o.id),
    erpOrderNumber: o.numero ? String(o.numero) : undefined,
    invoiceNumber: o.numero ? String(o.numero) : undefined,
    issueDate: (o.data || o.dataEmissao || "").split("T")[0],
    totalAmount: Number(o.total) || 0,
    totalProducts: o.totalProdutos ? Number(o.totalProdutos) : undefined,
    marketplaceId: String(loja.id || unidadeNegocio.id || ""),
    marketplaceName: unidadeNegocio.nome || loja.nome || undefined,
    marketplaceOrderId: o.numeroLoja || undefined,
    freightValue: Number(transporte.frete ?? o.valorFrete ?? 0),
    freightPaidBy: FREIGHT_PAID_BY_MAP[String(transporte.fretePorConta ?? "")] || undefined,
    commissionFee: taxas.taxaComissao ? Number(taxas.taxaComissao) : undefined,
    commissionBase: taxas.valorBase ? Number(taxas.valorBase) : undefined,
    discountValue: desconto.valor ? Number(desconto.valor) : undefined,
    carrierExternalId: contato.id ? String(contato.id) : undefined,
    carrierName: contato.nome || undefined,
    trackingCode: volumes[0]?.codigoRastreamento || undefined,
    trackingUrl: transporte.urlRastreamento || undefined,
    shippingMethod: volumes[0]?.servico || transporte.formaEnvio || undefined,
    shippingMethodExternalId: volumes[0]?.id ? String(volumes[0]?.id) : undefined,
    erpStatusCode: situacaoId,
    erpStatusLabel: situacao.valor || undefined,
    globalStatus: SITUACAO_TO_GLOBAL[situacaoId] || "pending",
    items: (o.itens || []).map(parseItem),
    notes: o.observacoes || undefined,
    rawPayload: o,
  };

  return order;
}

export class BlingAdapter implements IERPAdapter {
  name = "bling";
  private provider = "bling";

  getAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    });
    return `https://www.bling.com.br/Api/v3/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(
    code: string,
    redirectUri: string,
    credentials: { clientId?: string; clientSecret?: string }
  ): Promise<ERPTokenResponse> {
    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error("Credenciais do Bling incompletas.");
    }

    const authHeader = btoa(`${credentials.clientId}:${credentials.clientSecret}`);
    const response = await throttledFetch(
      "https://www.bling.com.br/Api/v3/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${authHeader}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      },
      this.provider,
      true
    );

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      rawResponse: data,
    };
  }

  async refreshToken(
    refreshToken: string,
    credentials: { clientId?: string; clientSecret?: string }
  ): Promise<ERPTokenResponse> {
    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error("Credenciais do Bling incompletas.");
    }

    const authHeader = btoa(`${credentials.clientId}:${credentials.clientSecret}`);
    const response = await throttledFetch(
      "https://www.bling.com.br/Api/v3/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${authHeader}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      },
      this.provider,
      true
    );

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      rawResponse: data,
    };
  }

  async fetchOrders(
    accessToken: string,
    options: { fromDate?: string; toDate?: string; page?: number } = {}
  ): Promise<{ orders: ERPOrder[]; hasMore: boolean }> {
    const params = new URLSearchParams();
    if (options.fromDate) params.set("dataEmissaoInicial", options.fromDate);
    if (options.toDate) params.set("dataEmissaoFinal", options.toDate);
    params.set("pagina", String(options.page || 1));
    params.set("limite", "100");

    const response = await throttledFetch(
      `https://www.bling.com.br/Api/v3/pedidos/vendas?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      this.provider
    );

    const body = await response.json();
    const rawOrders = body.data || [];

    const orders: ERPOrder[] = rawOrders.map(parseOrder);

    return {
      orders,
      hasMore: rawOrders.length >= 100,
    };
  }

  async fetchOrderById(
    accessToken: string,
    externalId: string
  ): Promise<ERPOrder> {
    const response = await throttledFetch(
      `https://www.bling.com.br/Api/v3/pedidos/vendas/${externalId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      this.provider
    );

    const body = await response.json();
    const data = body.data || {};
    return parseOrder(data);
  }

  async fetchDictionaries(
    accessToken: string,
    appId: string
  ): Promise<{
    carriers: { externalId: string; name: string; carrierType?: string; services?: unknown[] }[];
    marketplaces: { externalId: string; name: string }[];
    statuses: { erpStatusCode: string; erpStatusLabel: string; globalStatus: string }[];
  }> {
    const [logisticasRes] = await Promise.all([
      throttledFetch(
        "https://www.bling.com.br/Api/v3/logisticas",
        { headers: { Authorization: `Bearer ${accessToken}` } },
        this.provider
      ),
    ]);

    const logisticasBody = await logisticasRes.json();
    const logisticas = logisticasBody.data || [];

    const carriers = logisticas.map((l: any) => ({
      externalId: String(l.id),
      name: l.descricao || "",
      carrierType: l.tipoIntegracao || undefined,
      services: l.servicos || [],
    }));

    const statuses = Object.entries(SITUACAO_TO_GLOBAL).map(([code, global]) => ({
      erpStatusCode: code,
      erpStatusLabel: {
        "0": "Rascunho", "1": "Aprovada", "2": "Cancelada", "3": "Devolvida",
        "4": "Faturada", "5": "Enviada", "6": "Entregue", "7": "Pronto Envio",
        "9": "Pendente",
      }[code] || code,
      globalStatus: global,
    }));

    return { carriers, marketplaces: [], statuses };
  }

  async handleWebhook(
    payload: any,
    _headers: Record<string, string>
  ): Promise<{ eventType: string; data: ERPOrder }> {
    const eventType = payload.event || "unknown";
    const data = payload.data || payload;
    return {
      eventType,
      data: parseOrder(data),
    };
  }
}
