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
  marketplaceChannel?: string;
  orderType?: 'marketplace' | 'store';
  orderOrigin?: string;
  salesChannel?: string;
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
  logisticsIntegrationType?: string;
  shippingServiceExternalId?: string;
  shippingServiceName?: string;
  shippingServiceAliases?: string[];
  erpStatusCode: string;
  erpStatusLabel?: string;
  globalStatus: string;
  globalMarketplaceSlug?: string;
  globalLogisticsSlug?: string;
  globalOrderTypeSlug?: string;
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
    appId: string,
    options?: { knownServiceIds?: Set<string> }
  ): Promise<{
    carriers: { externalId: string; name: string; carrierType?: string; services?: unknown[] }[];
    marketplaces: { externalId: string; name: string; canalVenda?: string }[];
    statuses: { erpStatusCode: string; erpStatusLabel: string; globalStatus: string }[];
    shippingServices?: {
      externalId: string;
      name: string;
      logisticsExternalId?: string;
      aliases?: string[];
      providerLogisticsType?: string;
    }[];
  }>;

  handleWebhook(
    payload: any,
    headers: Record<string, string>
  ): Promise<{ eventType: string; data: ERPOrder }>;

  extractCompanyId(payload: unknown): string | null;

  verifyWebhookSignature(
    rawBody: string,
    headers: Record<string, string>,
    clientSecret: string
  ): Promise<boolean>;

  supportedWebhookEvents(): string[];

  buildIdempotencyKey(payload: unknown): string;

  fetchCompanyProfile?(
    accessToken: string
  ): Promise<{ companyExternalId: string; companyName?: string }>;
}
