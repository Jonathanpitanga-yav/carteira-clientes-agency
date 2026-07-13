import { IERPAdapter, ERPTokenResponse, ERPOrder } from "./base.ts";
import { throttledFetch } from "../utils/rate-limiter.ts";

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

    const statusMap: Record<string, ERPOrder["status"]> = {
      "0": "pending",
      "1": "approved",
      "3": "approved",
      "4": "approved",
      "5": "approved",
      "6": "approved",
      "7": "approved",
      "2": "canceled",
      "8": "pending",
      "9": "pending",
    };

    const orders: ERPOrder[] = rawOrders.map((o: any) => ({
      externalId: String(o.id),
      invoiceNumber: String(o.numeroPedido || ""),
      issueDate: o.data?.split("T")[0] || o.data,
      totalAmount: Number(o.valor) || 0,
      status: statusMap[String(o.situacao)] || "pending",
      items: [],
      rawPayload: o,
    }));

    return {
      orders,
      hasMore: offset + 100 < total,
    };
  }

  async handleWebhook(
    payload: any,
    _headers: Record<string, string>
  ): Promise<{ eventType: string; data: ERPOrder }> {
    const o = payload;
    return {
      eventType: String(o.situacao || "unknown"),
      data: {
        externalId: String(o.id),
        invoiceNumber: String(o.numeroPedido || ""),
        issueDate: o.data?.split("T")[0] || o.data,
        totalAmount: Number(o.valor) || 0,
        status: "approved",
        items: (o.itens || []).map((i: any) => ({
          externalProductId: String(i.idProduto || i.codigo),
          description: i.descricao || "",
          quantity: Number(i.quantidade) || 1,
          unitPrice: Number(i.valorUnitario) || 0,
          totalAmount: Number(i.valorTotal) || 0,
        })),
        rawPayload: o,
      },
    };
  }
}
