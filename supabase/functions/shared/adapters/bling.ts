import { IERPAdapter, ERPTokenResponse, ERPOrder } from "./base.ts";
import { throttledFetch } from "../utils/rate-limiter.ts";
import { verifyBlingWebhookSignature } from "../utils/webhook-signature.ts";

const FREIGHT_PAID_BY_MAP: Record<string, string> = {
  "0": "CIF",
  "1": "FOB",
  "2": "terceiros",
  "3": "proprio_remetente",
  "4": "proprio_destinatario",
  "9": "sem_transporte",
};

const SITUACAO_LABEL: Record<string, string> = {
  "0": "Rascunho",
  "1": "Aprovada",
  "2": "Cancelada",
  "3": "Devolvida",
  "4": "Faturada",
  "5": "Enviada",
  "6": "Entregue",
  "7": "Pronto Envio",
  "9": "Pendente",
  "10": "Cancelado",
  "11": "Devolvido",
  "12": "Atendido",
};

function normalizeDocument(doc?: string): string {
  return (doc || "").replace(/\D/g, "");
}

const MARKETPLACE_BY_CNPJ: Record<string, string> = {
  "03007331000141": "Mercado Livre",
};

const MARKETPLACE_BY_LOJA_ID: Record<string, string> = {
  "206029062": "Mercado Livre",
  "205259199": "Magalu",
  "205207580": "Shopee",
};

function detectBlingMarketplace(o: any): { name: string; channel: string } | null {
  const lojaId = String(o.loja?.id || "");
  if (lojaId && MARKETPLACE_BY_LOJA_ID[lojaId]) {
    const name = MARKETPLACE_BY_LOJA_ID[lojaId];
    return { name, channel: name };
  }

  const intermediador = o.intermediador;
  const cnpj = normalizeDocument(intermediador?.cnpj);
  if (cnpj && MARKETPLACE_BY_CNPJ[cnpj]) {
    return { name: MARKETPLACE_BY_CNPJ[cnpj], channel: MARKETPLACE_BY_CNPJ[cnpj] };
  }

  const parcelasText = (o.parcelas || []).map((p: any) => p.observacoes || "").join(" ");
  const text = `${o.observacoes || ""} ${parcelasText}`;
  const servico = o.transporte?.volumes?.[0]?.servico || o.transporte?.formaEnvio || "";

  if (servico.includes("Magalu") || text.includes("Magalu")) {
    return { name: "Magalu", channel: "Magalu" };
  }
  if (servico.includes("Shopee") || text.includes("Shopee")) {
    return { name: "Shopee", channel: "Shopee" };
  }
  if (
    servico.includes("Mercado") ||
    text.includes("Mercado") ||
    text.includes("account_money") ||
    /^2000\d+/.test(String(o.numeroLoja || ""))
  ) {
    return { name: "Mercado Livre", channel: "Mercado Livre" };
  }

  return null;
}

function deriveSalesChannel(o: any): string | undefined {
  const detected = detectBlingMarketplace(o);
  if (detected) return detected.channel;

  const intermediador = o.intermediador;
  if (intermediador?.nomeUsuario) return intermediador.nomeUsuario;
  const transporte = o.transporte || {};
  const volumes = transporte.volumes || [];
  const servico = volumes[0]?.servico || transporte.formaEnvio || "";
  if (servico.includes("Magalu")) return "Magalu";
  if (servico.includes("Shopee")) return "Shopee";
  if (servico.includes("Mercado Envios") || servico.includes("MercadoLivre")) return "Mercado Livre";
  const obs = o.observacoes || "";
  if (obs.includes("Magalu")) return "Magalu";
  if (obs.includes("Shopee")) return "Shopee";
  if (obs.includes("Mercado")) return "Mercado Livre";
  return undefined;
}

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

function extractServiceIdFromLabel(servico: string): string | undefined {
  const match = servico.match(/\((\d+)\)/);
  return match ? match[1] : undefined;
}

function parseOrder(o: any): ERPOrder {
  const situacao = o.situacao || {};
  const situacaoId = String(situacao.id ?? situacao ?? "");
  const situacaoLabel = SITUACAO_LABEL[situacaoId]
    || situacao.nome
    || situacao.descricao
    || undefined;
  const loja = o.loja || {};
  const unidadeNegocio = loja.unidadeNegocio || {};
  const transporte = o.transporte || {};
  const contato = transporte.contato || {};
  const volumes = transporte.volumes || [];
  const taxas = o.taxas || {};
  const desconto = o.desconto || {};
  const intermediador = o.intermediador;

  const isMarketplace = !!(o.numeroLoja || intermediador);
  const detectedMarketplace = detectBlingMarketplace(o);

  let marketplaceName = unidadeNegocio.nome || loja.nome || detectedMarketplace?.name;
  if (!marketplaceName && isMarketplace) {
    const servico = volumes[0]?.servico || transporte.formaEnvio || "";
    const obs = o.observacoes || "";
    if (servico.includes("Magalu") || obs.includes("Magalu")) marketplaceName = "Magalu";
    else if (servico.includes("Shopee") || obs.includes("Shopee")) marketplaceName = "Shopee";
    else if (servico.includes("Mercado") || obs.includes("Mercado")) marketplaceName = "Mercado Livre";
  }

  let carrierExternalId: string | undefined;
  let carrierName: string | undefined;
  let logisticsIntegrationType: string | undefined;
  let shippingServiceExternalId: string | undefined;
  let shippingServiceName: string | undefined;

  const logisticsIntegration = transporte.logistica || {};
  if (logisticsIntegration.tipoIntegracao) {
    logisticsIntegrationType = String(logisticsIntegration.tipoIntegracao);
  } else if (logisticsIntegration.id) {
    carrierExternalId = String(logisticsIntegration.id);
    carrierName = logisticsIntegration.nome || logisticsIntegration.descricao || undefined;
  }

  if (contato.id && contato.nome) {
    carrierExternalId = String(contato.id);
    carrierName = contato.nome;
  } else if (volumes[0]?.servico) {
    const servicoLabel = volumes[0].servico;
    shippingServiceExternalId = extractServiceIdFromLabel(servicoLabel);
    shippingServiceName = servicoLabel;
    carrierName = servicoLabel;
  }

  const order: ERPOrder = {
    externalId: String(o.id),
    erpOrderNumber: o.numero ? String(o.numero) : undefined,
    invoiceNumber: o.numero ? String(o.numero) : undefined,
    issueDate: (o.data || o.dataEmissao || "").split("T")[0],
    totalAmount: Number(o.total) || 0,
    totalProducts: o.totalProdutos ? Number(o.totalProdutos) : undefined,
    marketplaceId: String(loja.id || unidadeNegocio.id || ""),
    marketplaceName,
    marketplaceChannel: detectedMarketplace?.channel,
    marketplaceOrderId: o.numeroLoja || undefined,
    orderType: isMarketplace ? "marketplace" : "store",
    salesChannel: deriveSalesChannel(o),
    freightValue: Number(taxas.custoFrete ?? transporte.frete ?? o.valorFrete ?? 0),
    freightPaidBy: FREIGHT_PAID_BY_MAP[String(transporte.fretePorConta ?? "")] || undefined,
    commissionFee: taxas.taxaComissao ? Number(taxas.taxaComissao) : undefined,
    commissionBase: taxas.valorBase ? Number(taxas.valorBase) : undefined,
    discountValue: desconto.valor ? Number(desconto.valor) : undefined,
    carrierExternalId,
    carrierName,
    trackingCode: volumes[0]?.codigoRastreamento || undefined,
    trackingUrl: transporte.urlRastreamento || undefined,
    shippingMethod: volumes[0]?.servico || transporte.formaEnvio || undefined,
    shippingMethodExternalId: shippingServiceExternalId,
    logisticsIntegrationType,
    shippingServiceExternalId,
    shippingServiceName,
    erpStatusCode: situacaoId,
    erpStatusLabel: situacaoLabel || String(situacao.valor || ""),
    globalStatus: "pending",
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
    appId: string,
    _options?: { knownServiceIds?: Set<string> }
  ): Promise<{
    carriers: { externalId: string; name: string; carrierType?: string; services?: unknown[] }[];
    marketplaces: { externalId: string; name: string }[];
    statuses: { erpStatusCode: string; erpStatusLabel: string; globalStatus: string }[];
    shippingServices: {
      externalId: string;
      name: string;
      logisticsExternalId?: string;
      aliases?: string[];
      providerLogisticsType?: string;
    }[];
  }> {
    const [logisticasRes, servicosRes] = await Promise.all([
      throttledFetch(
        "https://www.bling.com.br/Api/v3/logisticas",
        { headers: { Authorization: `Bearer ${accessToken}` } },
        this.provider,
        false,
        appId,
      ),
      throttledFetch(
        "https://www.bling.com.br/Api/v3/logisticas/servicos",
        { headers: { Authorization: `Bearer ${accessToken}` } },
        this.provider,
        false,
        appId,
      ),
    ]);

    const logisticasBody = await logisticasRes.json();
    const logisticas = logisticasBody.data || [];
    const servicosBody = await servicosRes.json();
    const servicosList = servicosBody.data || [];

    const logisticsById = new Map<string, any>();
    for (const l of logisticas) {
      logisticsById.set(String(l.id), l);
    }

    const carriers = logisticas.map((l: any) => ({
      externalId: String(l.id),
      name: l.descricao || "",
      carrierType: l.tipoIntegracao || undefined,
      services: l.servicos || [],
    }));

    const shippingServices = servicosList.map((s: any) => {
      const logisticaId = String(s.logistica?.id ?? s.logistica_id ?? "");
      const parent = logisticsById.get(logisticaId);
      const aliasesRaw = s.aliases || s.servicos_aliases || "";
      const aliases = typeof aliasesRaw === "string"
        ? aliasesRaw.split(",").map((a: string) => a.trim()).filter(Boolean)
        : Array.isArray(aliasesRaw) ? aliasesRaw : [];
      return {
        externalId: String(s.id),
        name: s.descricao || s.servicos_descricao || "",
        logisticsExternalId: logisticaId || undefined,
        aliases,
        providerLogisticsType: parent?.tipoIntegracao || undefined,
      };
    });

    const statusByCode = new Map<string, { erpStatusCode: string; erpStatusLabel: string; globalStatus: string }>();
    let apiStatusesLoaded = false;

    try {
      const modRes = await throttledFetch(
        "https://www.bling.com.br/Api/v3/situacoes/modulos",
        { headers: { Authorization: `Bearer ${accessToken}` } },
        this.provider,
        false,
        appId,
      );
      const modBody = await modRes.json();
      const modules = modBody.data || [];
      const salesModule = modules.find((m: any) => {
        const name = String(m.descricao || m.nome || m.modulo || "").toLowerCase();
        return name.includes("pedido") && name.includes("venda");
      });

      if (salesModule?.id) {
        const sitRes = await throttledFetch(
          `https://www.bling.com.br/Api/v3/situacoes/modulos/${salesModule.id}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
          this.provider,
          false,
          appId,
        );
        const sitBody = await sitRes.json();
        for (const s of sitBody.data || []) {
          const code = String(s.id);
          const label = s.nome || s.descricao || s.nomeSituacao || s.titulo || s.label || code;
          statusByCode.set(code, {
            erpStatusCode: code,
            erpStatusLabel: label,
            globalStatus: "pending",
          });
        }
        apiStatusesLoaded = statusByCode.size > 0;
      }
    } catch {
      // API de situações é opcional; fallback para mapa estático.
    }

    if (!apiStatusesLoaded) {
      for (const [code, label] of Object.entries(SITUACAO_LABEL)) {
        statusByCode.set(code, {
          erpStatusCode: code,
          erpStatusLabel: label,
          globalStatus: "pending",
        });
      }
    }

    const statuses = [...statusByCode.values()];

    let marketplaces: { externalId: string; name: string; canalVenda?: string }[] = [];
    const lojaEndpoints = [
      "https://www.bling.com.br/Api/v3/canais-venda",
      "https://www.bling.com.br/Api/v3/lojas",
    ];
    for (const url of lojaEndpoints) {
      if (marketplaces.length > 0) break;
      try {
        const lojasRes = await throttledFetch(
          url,
          { headers: { Authorization: `Bearer ${accessToken}` } },
          this.provider,
          false,
          appId,
        );
        if (!lojasRes.ok) continue;
        const lojasBody = await lojasRes.json();
        const rows = lojasBody.data || lojasBody.itens || [];
        marketplaces = rows.map((l: any) => ({
          externalId: String(l.id),
          name: l.descricao || l.nome || l.tipo || String(l.id),
          canalVenda: l.tipo || l.canalVenda || l.descricao || undefined,
        }));
      } catch {
        // endpoint opcional
      }
    }

    return { carriers, marketplaces, statuses, shippingServices };
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

  extractCompanyId(payload: unknown): string | null {
    const p = payload as Record<string, unknown>;
    if (p?.companyId != null) return String(p.companyId);
    return null;
  }

  async verifyWebhookSignature(
    rawBody: string,
    headers: Record<string, string>,
    clientSecret: string,
  ): Promise<boolean> {
    const signature = headers["x-bling-signature-256"]
      || headers["X-Bling-Signature-256"];
    return verifyBlingWebhookSignature(rawBody, signature, clientSecret);
  }

  supportedWebhookEvents(): string[] {
    return ["order.created", "order.updated", "order.deleted"];
  }

  buildIdempotencyKey(payload: unknown): string {
    const p = payload as Record<string, unknown>;
    if (p?.eventId) return String(p.eventId);
    const event = String(p?.event || "unknown");
    const companyId = String(p?.companyId || "");
    const data = p?.data as Record<string, unknown> | undefined;
    const orderId = data?.id != null ? String(data.id) : "";
    const date = String(p?.date || "");
    return `${event}:${companyId}:${orderId}:${date}`;
  }

  async fetchCompanyProfile(
    accessToken: string,
  ): Promise<{ companyExternalId: string; companyName?: string }> {
    const response = await throttledFetch(
      "https://www.bling.com.br/Api/v3/empresas/me/dados-basicos",
      { headers: { Authorization: `Bearer ${accessToken}` } },
      this.provider,
    );

    if (!response.ok) {
      throw new Error(`Falha ao buscar dados da empresa Bling: HTTP ${response.status}`);
    }

    const body = await response.json();
    const company = body.data || body;
    const companyExternalId = String(company.id ?? company.companyId ?? "");
    if (!companyExternalId) {
      throw new Error("Resposta Bling sem company id.");
    }

    return {
      companyExternalId,
      companyName: company.nome || company.razaoSocial || company.nomeFantasia,
    };
  }
}
