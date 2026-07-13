import { IERPAdapter, ERPTokenResponse } from "./base.ts";

export class TinyAdapter implements IERPAdapter {
  name = "tiny";

  // Tiny utiliza chaves de API (tokens estáticos), logo não há fluxo de code exchange tradicional.
  // Podemos utilizar este método para validar/salvar a chave de API inserida.
  async exchangeCodeForToken(
    code: string,
    _redirectUri: string,
    _credentials: any
  ): Promise<ERPTokenResponse> {
    return {
      accessToken: code, // No caso do Tiny, o token/code inserido é a própria chave de API.
      rawResponse: { info: "Token estático de API do Tiny configurado." },
    };
  }

  async refreshToken(
    refreshToken: string,
    _credentials: any
  ): Promise<ERPTokenResponse> {
    // API Keys estáticas não expiram da mesma forma que tokens OAuth2.
    // Retornamos o próprio token existente.
    return {
      accessToken: refreshToken,
      refreshToken: refreshToken,
      rawResponse: { info: "Refresh estático do Tiny (API Key)." },
    };
  }

  async handleWebhook(
    payload: any,
    _headers: Record<string, string>
  ): Promise<{ eventType: string; data: any }> {
    const eventType = payload.dados?.situacao || "unknown";
    return {
      eventType,
      data: payload,
    };
  }
}
