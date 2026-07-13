export interface ERPTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  rawResponse: any;
}

export interface ERPOrder {
  externalId: string;
  invoiceNumber?: string;
  issueDate: string;
  totalAmount: number;
  status: "pending" | "approved" | "canceled" | "refunded";
  items: ERPOrderItem[];
  rawPayload: any;
}

export interface ERPOrderItem {
  externalProductId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface IERPAdapter {
  name: string;

  getAuthUrl(
    clientId: string,
    redirectUri: string,
    state: string
  ): string;

  exchangeCodeForToken(
    code: string,
    redirectUri: string,
    credentials: { clientId?: string; clientSecret?: string }
  ): Promise<ERPTokenResponse>;

  refreshToken(
    refreshToken: string,
    credentials: { clientId?: string; clientSecret?: string }
  ): Promise<ERPTokenResponse>;

  fetchOrders(
    accessToken: string,
    options: { fromDate?: string; toDate?: string; page?: number }
  ): Promise<{ orders: ERPOrder[]; hasMore: boolean }>;

  handleWebhook(
    payload: any,
    headers: Record<string, string>
  ): Promise<{ eventType: string; data: ERPOrder }>;
}
