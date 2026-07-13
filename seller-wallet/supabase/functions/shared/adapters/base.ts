export interface ERPTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number; // em segundos
  rawResponse: any;
}

export interface IERPAdapter {
  name: string;
  exchangeCodeForToken(
    code: string, 
    redirectUri: string, 
    credentials: { clientId?: string; clientSecret?: string }
  ): Promise<ERPTokenResponse>;

  refreshToken(
    refreshToken: string, 
    credentials: { clientId?: string; clientSecret?: string }
  ): Promise<ERPTokenResponse>;

  handleWebhook(
    payload: any, 
    headers: Record<string, string>
  ): Promise<{ eventType: string; data: any }>;
}
