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
  "0": "pending",
  "1": "invoiced",
  "2": "canceled",
  "3": "approved",
  "4": "in_production",
  "5": "shipped",
  "6": "delivered",
  "7": "shipped",
  "8": "draft",
  "9": "pending",
};

const SITUACAO_LABEL: Record<string, string> = {
  "0": "Aberta",
  "1": "Faturada",
  "2": "Cancelada",
  "3": "Aprovada",
  "4": "Preparando Envio",
  "5": "Enviada",
  "6": "Entregue",
  "7": "Pronto Envio",
  "8": "Dados Incompletos",
  "9": "Não Entregue",
};

function parseItem(i: any): ERPOrder["items"][number] {
  const prod = i.produto || {};
  const qty = Number(i.quantidade) || 1;
  const unitPrice = Number(i.valorUnitario) || 0;
  return {
    externalProductId: String(prod.id || i.idProduto || i.codigo || ""),
    sku: prod.sku || prod.codigo || null,
    description: prod.descricao || i.descricao || "",
    quantity: qty,
    unitPrice,
    totalAmount: qty * unitPrice,
  };
}

function parseOrder(o: any): ERPOrder {
  const situacao = String(o.situacao ?? "");
  const ecommerce = o.ecommerce || {};
  const transportador = o.transportador || {};

  const isMarketplace = !!(ecommerce.id || ecommerce.nome);

  const order: ERPOrder = {
    externalId: String(o.id),
    erpOrderNumber: o.numeroPedido ? String(o.numeroPedido) : undefined,
    invoiceNumber: o.numeroPedido ? String(o.numeroPedido) : undefined,
    issueDate: (o.data || o.dataCriacao || "").split("T")[0],
    totalAmount: Number(o.valorTotalPedido ?? o.valor ?? 0),
    totalProducts: o.valorTotalProdutos ? Number(o.valorTotalProdutos) : undefined,
    marketplaceId: String(ecommerce.id ?? ""),
    marketplaceName: ecommerce.nome || undefined,
    marketplaceOrderId: ecommerce.numeroPedidoEcommerce || undefined,
    orderType: isMarketplace ? "marketplace" : "store",
    salesChannel: ecommerce.nome || undefined,
    freightValue: Number(o.valorFrete ?? 0),
    freightPaidBy: FREIGHT_PAID_BY_MAP[String(transportador.fretePorConta ?? "")] || undefined,
    discountValue: Number(o.valorDesconto ?? 0),
    carrierExternalId: transportador.id ? String(transportador.id) : undefined,
    carrierName: transportador.nome || undefined,
    trackingCode: transportador.codigoRastreamento || undefined,
    trackingUrl: transportador.urlRastreamento || undefined,
    shippingMethod: transportador.formaEnvio || undefined,
    shippingMethodExternalId: transportador.formaFrete || undefined,
    erpStatusCode: situacao,
    erpStatusLabel: SITUACAO_LABEL[situacao] || undefined,
    globalStatus: SITUACAO_TO_GLOBAL[situacao] || "pending",
    items: (o.itens || []).map(parseItem),
    notes: o.observacoes || undefined,
    rawPayload: o,
  };

  return order;
}

export class TinyAdapter implements IERPAdapter {
  name = "tiny";
  private provider = "tiny";

  private readonly baseUrl = "https://api.tiny.com.br/public-api/v3";
  private readonly accountsUrl = "https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect";

  getAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "openid",
      response_type: "code",
      state,
    });
    return `${this.accountsUrl}/auth?${params.toString()}`;
  }

  async exchangeCodeForToken(
    code: string,
    redirectUri: string,
    credentials: { clientId?: string; clientSecret?: string }
  ): Promise<ERPTokenResponse> {
    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error("Credenciais do Tiny incompletas.");
    }

    const response = await throttledFetch(
      `${this.accountsUrl}/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          redirect_uri: redirectUri,
          code,
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
      throw new Error("Credenciais do Tiny incompletas.");
    }

    const response = await throttledFetch(
      `${this.accountsUrl}/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
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
    if (options.fromDate) params.set("dataInicial", options.fromDate);
    if (options.toDate) params.set("dataFinal", options.toDate);
    const offset = ((options.page || 1) - 1) * 100;
    params.set("limit", "100");
    params.set("offset", String(offset));

    const response = await throttledFetch(
      `${this.baseUrl}/pedidos?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      this.provider
    );

    const body = await response.json();
    const rawOrders = body.itens || [];
    const pagination = body.paginacao || {};
    const total = pagination.total || 0;

    const orders: ERPOrder[] = rawOrders.map(parseOrder);

    return {
      orders,
      hasMore: offset + 100 < total,
    };
  }

  async fetchOrderById(
    accessToken: string,
    externalId: string
  ): Promise<ERPOrder> {
    const response = await throttledFetch(
      `${this.baseUrl}/pedidos/${externalId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      this.provider
    );

    const body = await response.json();
    return parseOrder(body);
  }

  async fetchDictionaries(
    accessToken: string,
    appId: string
  ): Promise<{
    carriers: { externalId: string; name: string; carrierType?: string; services?: unknown[] }[];
    marketplaces: { externalId: string; name: string }[];
    statuses: { erpStatusCode: string; erpStatusLabel: string; globalStatus: string }[];
  }> {
    const [formasEnvioRes] = await Promise.all([
      throttledFetch(
        `${this.baseUrl}/formas-envio?situacao=1`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
        this.provider
      ),
    ]);

    const formasBody = await formasEnvioRes.json();
    const formas = formasBody.itens || [];

    const carriers = formas.map((f: any) => ({
      externalId: String(f.id),
      name: f.nome || "",
      carrierType: f.tipo ? String(f.tipo) : undefined,
      services: f.gatewayLogistico ? [f.gatewayLogistico] : [],
    }));

    const statuses = Object.entries(SITUACAO_TO_GLOBAL).map(([code, global]) => ({
      erpStatusCode: code,
      erpStatusLabel: SITUACAO_LABEL[code] || code,
      globalStatus: global,
    }));

    return { carriers, marketplaces: [], statuses };
  }

  async handleWebhook(
    payload: any,
    _headers: Record<string, string>
  ): Promise<{ eventType: string; data: ERPOrder }> {
    const eventType = String(payload.situacao ?? "unknown");
    return {
      eventType,
      data: parseOrder(payload),
    };
  }
}
