import { IERPAdapter, ERPTokenResponse, ERPOrder } from "./base.ts";
import { throttledFetch } from "../utils/rate-limiter.ts";

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

    const statusMap: Record<string, ERPOrder["status"]> = {
      "0": "pending",
      "1": "approved",
      "2": "canceled",
      "3": "refunded",
      "9": "pending",
    };

    const orders: ERPOrder[] = rawOrders.map((o: any) => ({
      externalId: String(o.id),
      invoiceNumber: o.numero,
      issueDate: o.dataEmissao?.split("T")[0] || o.dataEmissao,
      totalAmount: Number(o.total) || 0,
      status: statusMap[String(o.situacao)] || "pending",
      items: (o.itens || []).map((i: any) => ({
        externalProductId: String(i.idProduto || i.codigo),
        description: i.descricao || "",
        quantity: Number(i.quantidade) || 1,
        unitPrice: Number(i.valorUnitario) || 0,
        totalAmount: Number(i.valorTotal) || 0,
      })),
      rawPayload: o,
    }));

    return {
      orders,
      hasMore: rawOrders.length >= 100,
    };
  }

  async handleWebhook(
    payload: any,
    _headers: Record<string, string>
  ): Promise<{ eventType: string; data: ERPOrder }> {
    const eventType = payload.event || "unknown";
    const data = payload.data || payload;
    return {
      eventType,
      data: {
        externalId: String(data.id),
        invoiceNumber: data.numero,
        issueDate: data.dataEmissao?.split("T")[0] || data.dataEmissao,
        totalAmount: Number(data.total) || 0,
        status: "approved",
        items: (data.itens || []).map((i: any) => ({
          externalProductId: String(i.idProduto || i.codigo),
          description: i.descricao || "",
          quantity: Number(i.quantidade) || 1,
          unitPrice: Number(i.valorUnitario) || 0,
          totalAmount: Number(i.valorTotal) || 0,
        })),
        rawPayload: data,
      },
    };
  }
}
