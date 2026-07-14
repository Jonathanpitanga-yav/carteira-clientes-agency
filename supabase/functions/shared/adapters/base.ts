export interface ERPTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  rawResponse: any;
}

export interface ERPOrder {
  externalId: string;
  erpOrderNumber?: string;
  invoiceNumber?: string;
  issueDate: string;
  totalAmount: number;
  totalProducts?: number;
  marketplaceId?: string;
  marketplaceName?: string;
  marketplaceOrderId?: string;
  freightValue: number;
  freightPaidBy?: string;
  commissionFee?: number;
  commissionBase?: number;
  discountValue?: number;
  carrierExternalId?: string;
  carrierName?: string;
  trackingCode?: string;
  trackingUrl?: string;
  shippingMethod?: string;
  shippingMethodExternalId?: string;
  erpStatusCode: string;
  erpStatusLabel?: string;
  globalStatus: string;
  items: ERPOrderItem[];
  notes?: string;
  rawPayload: any;
}

export interface ERPOrderItem {
  externalProductId: string;
  sku?: string;
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

  fetchOrderById?(
    accessToken: string,
    externalId: string
  ): Promise<ERPOrder>;

  fetchDictionaries?(
    accessToken: string,
    appId: string
  ): Promise<{
    carriers: { externalId: string; name: string; carrierType?: string; services?: unknown[] }[];
    marketplaces: { externalId: string; name: string }[];
    statuses: { erpStatusCode: string; erpStatusLabel: string; globalStatus: string }[];
  }>;

  handleWebhook(
    payload: any,
    headers: Record<string, string>
  ): Promise<{ eventType: string; data: ERPOrder }>;
}
