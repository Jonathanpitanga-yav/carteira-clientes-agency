import { IERPAdapter, ERPTokenResponse, ERPOrder } from "./base.ts";
import { throttledFetch } from "../utils/rate-limiter.ts";
import { verifyTinyWebhookSignature } from "../utils/webhook-signature.ts";

const FREIGHT_PAID_BY_MAP: Record<string, string> = {
  "0": "CIF",
  "1": "FOB",
  "2": "terceiros",
  "3": "proprio_remetente",
  "4": "proprio_destinatario",
  "9": "sem_transporte",
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
  const formaEnvio = transportador.formaEnvio || {};
  const formaFrete = transportador.formaFrete || {};

  const isMarketplace = !!(ecommerce.id || ecommerce.nome);

  const formaEnvioId = formaEnvio.id ?? (typeof transportador.formaEnvio === "object" ? formaEnvio.id : undefined);
  const formaFreteId = formaFrete.id ?? transportador.formaFrete;
  const formaEnvioNome = formaEnvio.nome ?? (typeof transportador.formaEnvio === "string" ? transportador.formaEnvio : undefined);
  const formaFreteNome = formaFrete.nome ?? (typeof transportador.formaFrete === "string" ? undefined : formaFrete.nome);

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
    marketplaceChannel: ecommerce.canalVenda || undefined,
    orderType: isMarketplace ? "marketplace" : "store",
    orderOrigin: o.origemPedido != null ? String(o.origemPedido) : undefined,
    salesChannel: ecommerce.canalVenda || ecommerce.nome || undefined,
    freightValue: Number(o.valorFrete ?? 0),
    freightPaidBy: FREIGHT_PAID_BY_MAP[String(transportador.fretePorConta ?? "")] || undefined,
    discountValue: Number(o.valorDesconto ?? 0),
    carrierExternalId: formaEnvioId ? String(formaEnvioId) : (transportador.id ? String(transportador.id) : undefined),
    carrierName: transportador.nome || formaEnvioNome || undefined,
    trackingCode: transportador.codigoRastreamento || undefined,
    trackingUrl: transportador.urlRastreamento || undefined,
    shippingMethod: formaFreteNome || formaEnvioNome || undefined,
    shippingMethodExternalId: formaFreteId ? String(formaFreteId) : undefined,
    logisticsIntegrationType: formaEnvio.tipo != null ? String(formaEnvio.tipo) : undefined,
    shippingServiceExternalId: formaFreteId ? String(formaFreteId) : (formaEnvioId ? String(formaEnvioId) : undefined),
    shippingServiceName: formaFreteNome || formaEnvioNome || undefined,
    erpStatusCode: situacao,
    erpStatusLabel: SITUACAO_LABEL[situacao] || undefined,
    globalStatus: "pending",
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
    _appId: string,
    options?: { knownServiceIds?: Set<string> }
  ): Promise<{
    carriers: { externalId: string; name: string; carrierType?: string; services?: unknown[] }[];
    marketplaces: { externalId: string; name: string; canalVenda?: string }[];
    statuses: { erpStatusCode: string; erpStatusLabel: string; globalStatus: string }[];
    shippingServices: {
      externalId: string;
      name: string;
      logisticsExternalId?: string;
      aliases?: string[];
      providerLogisticsType?: string;
    }[];
  }> {
    const knownIds = options?.knownServiceIds ?? new Set<string>();
    const allFormas: any[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const formasEnvioRes = await throttledFetch(
        `${this.baseUrl}/formas-envio?situacao=1&limit=${limit}&offset=${offset}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
        this.provider
      );
      const formasBody = await formasEnvioRes.json();
      const batch = formasBody.itens || [];
      allFormas.push(...batch);
      const total = formasBody.paginacao?.total ?? batch.length;
      offset += limit;
      if (offset >= total || batch.length === 0) break;
    }

    const carriers = allFormas.map((f: any) => ({
      externalId: String(f.id),
      name: f.nome || "",
      carrierType: f.tipo != null ? String(f.tipo) : undefined,
      services: f.gatewayLogistico ? [f.gatewayLogistico] : [],
    }));

    const shippingServices: {
      externalId: string;
      name: string;
      logisticsExternalId?: string;
      aliases?: string[];
      providerLogisticsType?: string;
    }[] = [];

    for (const f of allFormas) {
      const tipo = f.tipo != null ? String(f.tipo) : undefined;
      if (f.formasFrete && Array.isArray(f.formasFrete)) {
        for (const ff of f.formasFrete) {
          shippingServices.push({
            externalId: String(ff.id),
            name: ff.nome || f.nome || "",
            logisticsExternalId: String(f.id),
            providerLogisticsType: tipo,
          });
        }
      } else {
        shippingServices.push({
          externalId: String(f.id),
          name: f.nome || "",
          logisticsExternalId: String(f.id),
          providerLogisticsType: tipo,
        });
      }
    }

    // Budget: fetch detail only for new unknown IDs (max 5 per cold sync)
    let detailBudget = 5;
    for (const f of allFormas) {
      if (detailBudget <= 0) break;
      const id = String(f.id);
      if (knownIds.has(id) || (f.formasFrete && f.formasFrete.length > 0)) continue;
      try {
        const detailRes = await throttledFetch(
          `${this.baseUrl}/formas-envio/${id}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
          this.provider
        );
        const detail = await detailRes.json();
        detailBudget--;
        const tipo = detail.tipo != null ? String(detail.tipo) : undefined;
        if (detail.formasFrete && Array.isArray(detail.formasFrete)) {
          for (const ff of detail.formasFrete) {
            shippingServices.push({
              externalId: String(ff.id),
              name: ff.nome || detail.nome || "",
              logisticsExternalId: id,
              providerLogisticsType: tipo,
            });
          }
        }
      } catch {
        // skip failed detail fetch
      }
    }

    const statuses = Object.entries(SITUACAO_LABEL).map(([code, label]) => ({
      erpStatusCode: code,
      erpStatusLabel: label,
      globalStatus: "pending",
    }));

    return { carriers, marketplaces: [], statuses, shippingServices };
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

  extractCompanyId(payload: unknown): string | null {
    const p = payload as Record<string, unknown>;
    if (p?.idEmpresa != null) return String(p.idEmpresa);
    if (p?.companyId != null) return String(p.companyId);
    const empresa = p?.empresa as Record<string, unknown> | undefined;
    if (empresa?.id != null) return String(empresa.id);
    return null;
  }

  async verifyWebhookSignature(
    rawBody: string,
    headers: Record<string, string>,
    clientSecret: string,
  ): Promise<boolean> {
    const signature = headers["x-tiny-signature"] || headers["X-Tiny-Signature"];
    return verifyTinyWebhookSignature(rawBody, signature, clientSecret);
  }

  supportedWebhookEvents(): string[] {
    return [];
  }

  buildIdempotencyKey(payload: unknown): string {
    const p = payload as Record<string, unknown>;
    if (p?.id != null) return `tiny:${p.id}`;
    const orderId = p?.idPedido ?? p?.numero ?? p?.numeroPedido;
    const situacao = p?.situacao ?? "";
    const updatedAt = p?.dataAlteracao ?? p?.dataAtualizacao ?? "";
    return `tiny:${orderId}:${situacao}:${updatedAt}`;
  }

  async fetchCompanyProfile(
    accessToken: string,
  ): Promise<{ companyExternalId: string; companyName?: string }> {
    const response = await throttledFetch(
      `${this.baseUrl}/info`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      this.provider,
    );

    if (!response.ok) {
      throw new Error(`Falha ao buscar dados da empresa Tiny: HTTP ${response.status}`);
    }

    const company = await response.json();
    const companyExternalId = String(
      company.id ?? company.idEmpresa ?? company.companyId ?? (company.cpfCnpj || "").replace(/\D/g, ""),
    );
    if (!companyExternalId) {
      throw new Error("Resposta Tiny sem company id.");
    }

    return {
      companyExternalId,
      companyName: company.razaoSocial || company.nome || company.fantasia,
    };
  }
}
