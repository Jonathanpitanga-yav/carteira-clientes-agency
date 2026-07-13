import { IERPAdapter, ERPTokenResponse } from "./base.ts";

export class BlingAdapter implements IERPAdapter {
  name = "bling";

  async exchangeCodeForToken(
    code: string,
    redirectUri: string,
    credentials: { clientId?: string; clientSecret?: string }
  ): Promise<ERPTokenResponse> {
    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error("Credenciais do Bling incompletas.");
    }

    const authHeader = btoa(`${credentials.clientId}:${credentials.clientSecret}`);
    const response = await fetch("https://www.bling.com.br/Api/v3/oauth/token", {
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
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro Bling OAuth: ${response.status} - ${errText}`);
    }

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
    const response = await fetch("https://www.bling.com.br/Api/v3/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${authHeader}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro Bling Refresh: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      rawResponse: data,
    };
  }

  async handleWebhook(
    payload: any,
    _headers: Record<string, string>
  ): Promise<{ eventType: string; data: any }> {
    // Normalização básica do payload recebido do webhook do Bling
    const eventType = payload.event || "unknown";
    return {
      eventType,
      data: payload.data || payload,
    };
  }
}
