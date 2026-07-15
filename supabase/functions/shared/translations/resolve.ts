import type { AppDictionary } from "./types.ts";
import { matchesNamePattern } from "./normalize.ts";

function findRule(
  dict: AppDictionary,
  dimension: string,
  sourceKind: string,
  sourceValue: string
): string | null {
  const matches = dict.rules
    .filter((r) => r.dimension === dimension && r.source_kind === sourceKind && r.source_value === sourceValue)
    .sort((a, b) => a.priority - b.priority);
  return matches[0]?.global_slug ?? null;
}

function findNamePatternRule(dict: AppDictionary, dimension: string, name: string): string | null {
  const matches = dict.rules
    .filter((r) => r.dimension === dimension && r.source_kind === "name_pattern")
    .filter((r) => matchesNamePattern(name, r.source_value))
    .sort((a, b) => a.priority - b.priority);
  return matches[0]?.global_slug ?? null;
}

function matchesExcludePattern(label: string, excludePattern: string | null): boolean {
  if (!excludePattern) return false;
  return excludePattern.split("|").some((part) => matchesNamePattern(label, part.trim()));
}

function resolveStatusFromLabelRules(dict: AppDictionary, label: string): string | null {
  const rules = [...dict.statusLabelRules]
    .filter((r) => r.pattern)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of rules) {
    if (!matchesNamePattern(label, rule.pattern)) continue;
    if (matchesExcludePattern(label, rule.exclude_pattern)) continue;
    return rule.global_status;
  }
  return null;
}

export function resolveStatus(
  dict: AppDictionary,
  erpStatusCode: string,
  fallback?: string,
  erpStatusLabel?: string
): string {
  const mapped = dict.statusMappings.get(erpStatusCode);
  const label = erpStatusLabel || mapped?.erp_status_label;

  if (label) {
    const fromLabelRules = resolveStatusFromLabelRules(dict, label);
    if (fromLabelRules) return fromLabelRules;
  }

  if (mapped?.global_status) return mapped.global_status;

  return fallback || "pending";
}

function resolveLogisticsFromCatalogService(
  dict: AppDictionary,
  serviceName: string
): string | null {
  for (const svc of dict.shippingServices.values()) {
    const matchesName = svc.name === serviceName || svc.aliases?.some((a) => a === serviceName);
    if (!matchesName) continue;

    const fromPattern = findNamePatternRule(dict, "logistics", serviceName);
    if (fromPattern) return fromPattern;

    if (svc.logistics_external_id) {
      const carrier = dict.carriers.get(svc.logistics_external_id);
      const integrationType = carrier?.provider_logistics_type || carrier?.carrier_type;
      if (integrationType) {
        const fromType = findRule(dict, "logistics", "enum_code", integrationType);
        if (fromType) return fromType;
      }
      if (carrier?.global_logistics_slug) return carrier.global_logistics_slug;
    }

    if (svc.provider_logistics_type) {
      const fromType = findRule(dict, "logistics", "enum_code", svc.provider_logistics_type);
      if (fromType) return fromType;
    }
    if (svc.global_logistics_slug) return svc.global_logistics_slug;
  }
  return null;
}

export function resolveLogistics(
  dict: AppDictionary,
  opts: {
    serviceExternalId?: string;
    logisticsExternalId?: string;
    logisticsIntegrationType?: string;
    shippingServiceName?: string;
    carrierName?: string;
    shippingMethod?: string;
  }
): string {
  const namesToTry = [opts.shippingServiceName, opts.shippingMethod, opts.carrierName].filter(Boolean) as string[];

  // Padrões no nome do serviço são mais específicos que enum genérico do ERP
  for (const name of namesToTry) {
    const fromPattern = findNamePatternRule(dict, "logistics", name);
    if (fromPattern) return fromPattern;
  }

  if (opts.serviceExternalId) {
    const svc = dict.shippingServices.get(opts.serviceExternalId);
    if (svc?.global_logistics_slug && svc.global_logistics_slug !== "unknown") {
      return svc.global_logistics_slug;
    }
  }

  if (opts.logisticsExternalId) {
    const carrier = dict.carriers.get(opts.logisticsExternalId);
    if (carrier?.global_logistics_slug && carrier.global_logistics_slug !== "unknown") {
      return carrier.global_logistics_slug;
    }
    if (carrier?.provider_logistics_type) {
      const fromType = findRule(dict, "logistics", "enum_code", carrier.provider_logistics_type);
      if (fromType) return fromType;
    }
  }

  if (opts.logisticsIntegrationType) {
    const fromType = findRule(dict, "logistics", "enum_code", opts.logisticsIntegrationType);
    if (fromType) return fromType;
  }

  for (const name of namesToTry) {
    const fromCatalog = resolveLogisticsFromCatalogService(dict, name);
    if (fromCatalog) return fromCatalog;
  }

  return "unknown";
}

export function resolveMarketplace(
  dict: AppDictionary,
  opts: {
    marketplaceExternalId?: string;
    marketplaceName?: string;
    marketplaceChannel?: string;
    salesChannel?: string;
  }
): string {
  if (opts.marketplaceExternalId) {
    const mp = dict.marketplaces.get(opts.marketplaceExternalId);
    if (mp?.global_marketplace_slug) return mp.global_marketplace_slug;
    if (mp?.name) {
      const fromDictName = findNamePatternRule(dict, "marketplace", mp.name);
      if (fromDictName) return fromDictName;
    }
    if (mp?.canal_venda) {
      const fromChannel = findNamePatternRule(dict, "marketplace", mp.canal_venda);
      if (fromChannel) return fromChannel;
    }
  }

  const namesToTry = [opts.marketplaceChannel, opts.marketplaceName, opts.salesChannel].filter(Boolean) as string[];
  for (const name of namesToTry) {
    const fromPattern = findNamePatternRule(dict, "marketplace", name);
    if (fromPattern) return fromPattern;
  }

  return "unknown";
}

const MARKETPLACE_DEFAULT_LOGISTICS: Record<string, string> = {
  mercado_livre: "mercado_envios",
  magalu: "magalu_entregas",
  shopee: "shopee_envios",
  amazon: "amazon_dba",
  shopify: "gateway_logistico",
  nuvemshop: "gateway_logistico",
  woocommerce: "gateway_logistico",
};

export function inferLogisticsFromMarketplace(marketplaceSlug: string | null | undefined): string | null {
  if (!marketplaceSlug || marketplaceSlug === "unknown") return null;
  return MARKETPLACE_DEFAULT_LOGISTICS[marketplaceSlug] ?? null;
}

export function resolveOrderType(
  dict: AppDictionary,
  opts: {
    orderType?: string;
    orderOrigin?: string;
    isMarketplace?: boolean;
    marketplaceSlug?: string;
    marketplaceName?: string;
  }
): string {
  if (opts.orderOrigin === "1") return "physical_store";

  const ecommerceSlugs = new Set(["shopify", "nuvemshop", "woocommerce"]);
  if (opts.marketplaceSlug && ecommerceSlugs.has(opts.marketplaceSlug)) return "ecommerce";

  const name = (opts.marketplaceName || "").toLowerCase();
  if (name.includes("shopify") || name.includes("nuvem") || name.includes("woocommerce")) {
    return "ecommerce";
  }

  if (opts.isMarketplace || opts.orderType === "marketplace") return "marketplace";
  if (opts.orderType === "store") return "ecommerce";
  return "unknown";
}
