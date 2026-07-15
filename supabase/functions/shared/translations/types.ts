export interface MappingRule {
  provider: string;
  dimension: string;
  source_kind: string;
  source_value: string;
  global_slug: string;
  priority: number;
}

export interface StatusLabelRule {
  pattern: string;
  global_status: string;
  priority: number;
  exclude_pattern: string | null;
}

export interface StatusMappingRow {
  erp_status_code: string;
  erp_status_label: string;
  global_status: string;
}

export interface CarrierRow {
  id: string;
  external_id: string;
  name: string;
  provider_logistics_type: string | null;
  global_logistics_slug: string | null;
  carrier_type: string | null;
}

export interface MarketplaceRow {
  id: string;
  external_id: string;
  name: string;
  global_marketplace_slug: string | null;
  canal_venda: string | null;
}

export interface ShippingServiceRow {
  id: string;
  logistics_external_id: string | null;
  service_external_id: string;
  name: string;
  aliases: string[] | null;
  provider_logistics_type: string | null;
  global_logistics_slug: string | null;
}

export interface AppDictionary {
  appId: string;
  provider: string;
  rules: MappingRule[];
  statusLabelRules: StatusLabelRule[];
  statusMappings: Map<string, StatusMappingRow>;
  carriers: Map<string, CarrierRow>;
  marketplaces: Map<string, MarketplaceRow>;
  shippingServices: Map<string, ShippingServiceRow>;
}

export interface TranslationResult {
  globalStatus: string;
  globalMarketplaceSlug: string;
  globalLogisticsSlug: string;
  globalOrderTypeSlug: string;
  marketplaceId: string | null;
  carrierId: string | null;
  erpMarketplaceExternalId: string | null;
  erpLogisticsExternalId: string | null;
  erpLogisticsName: string | null;
  lazyEntries: {
    carriers: Array<{ externalId: string; name: string; extra?: Record<string, unknown> }>;
    marketplaces: Array<{ externalId: string; name: string; extra?: Record<string, unknown> }>;
    shippingServices: Array<{ externalId: string; name: string; extra?: Record<string, unknown> }>;
    statuses: Array<{ externalId: string; name: string; extra?: Record<string, unknown> }>;
  };
}
