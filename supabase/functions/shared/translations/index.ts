import type { AppDictionary, TranslationResult } from "./types.ts";
import { resolveStatus, resolveLogistics, resolveMarketplace, resolveOrderType, inferLogisticsFromMarketplace } from "./resolve.ts";

export interface OrderForTranslation {
  externalId: string;
  marketplaceId?: string;
  marketplaceName?: string;
  marketplaceChannel?: string;
  salesChannel?: string;
  orderType?: string;
  orderOrigin?: string;
  carrierExternalId?: string;
  carrierName?: string;
  shippingMethod?: string;
  shippingMethodExternalId?: string;
  logisticsIntegrationType?: string;
  shippingServiceExternalId?: string;
  shippingServiceName?: string;
  erpStatusCode: string;
  erpStatusLabel?: string;
  globalStatus?: string;
  rawPayload?: any;
}

export function resolveOrderTranslations(
  dict: AppDictionary,
  order: OrderForTranslation
): TranslationResult {
  const isMarketplace = order.orderType === "marketplace" ||
    !!(order.marketplaceId && order.marketplaceName) ||
    !!(order.rawPayload?.ecommerce?.id || order.rawPayload?.numeroLoja);

  const marketplaceRow = order.marketplaceId ? dict.marketplaces.get(order.marketplaceId) : undefined;
  const marketplaceName = order.marketplaceName || marketplaceRow?.name;
  const marketplaceChannel = order.marketplaceChannel || marketplaceRow?.canal_venda || undefined;
  const salesChannel = order.salesChannel || marketplaceChannel;

  const globalStatus = resolveStatus(dict, order.erpStatusCode, undefined, order.erpStatusLabel);
  let globalLogisticsSlug = resolveLogistics(dict, {
    serviceExternalId: order.shippingServiceExternalId || order.shippingMethodExternalId,
    logisticsExternalId: order.carrierExternalId,
    logisticsIntegrationType: order.logisticsIntegrationType,
    shippingServiceName: order.shippingServiceName || order.shippingMethod,
    carrierName: order.carrierName,
    shippingMethod: order.shippingMethod,
  });
  const globalMarketplaceSlug = resolveMarketplace(dict, {
    marketplaceExternalId: order.marketplaceId,
    marketplaceName,
    marketplaceChannel,
    salesChannel,
  });
  if (globalLogisticsSlug === "unknown") {
    const inferred = inferLogisticsFromMarketplace(globalMarketplaceSlug);
    if (inferred) globalLogisticsSlug = inferred;
  }
  const globalOrderTypeSlug = resolveOrderType(dict, {
    orderType: order.orderType,
    orderOrigin: order.orderOrigin,
    isMarketplace,
    marketplaceSlug: globalMarketplaceSlug !== "unknown" ? globalMarketplaceSlug : undefined,
    marketplaceName,
  });

  const carrierRow = order.carrierExternalId ? dict.carriers.get(order.carrierExternalId) : undefined;
  const serviceId = order.shippingServiceExternalId || order.shippingMethodExternalId;

  const lazyEntries: TranslationResult["lazyEntries"] = {
    carriers: [],
    marketplaces: [],
    shippingServices: [],
    statuses: [],
  };

  if (order.carrierExternalId && order.carrierName && !carrierRow) {
    lazyEntries.carriers.push({
      externalId: order.carrierExternalId,
      name: order.carrierName,
      extra: {
        providerLogisticsType: order.logisticsIntegrationType,
        globalLogisticsSlug: globalLogisticsSlug,
        sourceKind: "lazy_discovery",
      },
    });
  }

  if (order.marketplaceId && marketplaceName && !marketplaceRow) {
    lazyEntries.marketplaces.push({
      externalId: order.marketplaceId,
      name: marketplaceName,
      extra: {
        canalVenda: order.marketplaceChannel,
        globalMarketplaceSlug: globalMarketplaceSlug,
      },
    });
  }

  if (serviceId && (order.shippingServiceName || order.shippingMethod) && !dict.shippingServices.get(serviceId)) {
    lazyEntries.shippingServices.push({
      externalId: serviceId,
      name: order.shippingServiceName || order.shippingMethod || serviceId,
      extra: {
        logisticsExternalId: order.carrierExternalId,
        providerLogisticsType: order.logisticsIntegrationType,
        globalLogisticsSlug: globalLogisticsSlug,
      },
    });
  }

  if (order.erpStatusCode && !dict.statusMappings.has(order.erpStatusCode)) {
    lazyEntries.statuses.push({
      externalId: order.erpStatusCode,
      name: order.erpStatusLabel || order.erpStatusCode,
      extra: { globalStatus },
    });
  }

  return {
    globalStatus,
    globalMarketplaceSlug,
    globalLogisticsSlug,
    globalOrderTypeSlug,
    marketplaceId: marketplaceRow?.id ?? null,
    carrierId: carrierRow?.id ?? null,
    erpMarketplaceExternalId: order.marketplaceId || null,
    erpLogisticsExternalId: serviceId || order.carrierExternalId || null,
    erpLogisticsName: order.shippingServiceName || order.shippingMethod || order.carrierName || null,
    lazyEntries,
  };
}

export { loadAppDictionary, isDictionaryStale, markDictionarySynced } from "./load-dictionary.ts";
export type { AppDictionary, TranslationResult } from "./types.ts";
