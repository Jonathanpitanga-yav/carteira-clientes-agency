import { getAdapter } from "./adapters/registry.ts";
import { upsertDictionary } from "./db.ts";
import { resolveLogistics, resolveMarketplace, resolveStatus } from "./translations/resolve.ts";
import type { AppDictionary } from "./translations/types.ts";
import { loadAppDictionary, markDictionarySynced } from "./translations/load-dictionary.ts";

function getClientFromSchema(supabase: any, schema: string) {
  return supabase.schema ? supabase.schema(schema) : supabase;
}

export interface DictionaryFetchResult {
  carriers: number;
  marketplaces: number;
  statuses: number;
  shippingServices: number;
}

export async function syncAppDictionaries(
  supabase: any,
  appId: string,
  providerName: string,
  accessToken: string,
  knownServiceIds: Set<string> = new Set()
): Promise<DictionaryFetchResult> {
  const adapter = getAdapter(providerName);
  const sales = getClientFromSchema(supabase, "sales");
  const result: DictionaryFetchResult = { carriers: 0, marketplaces: 0, statuses: 0, shippingServices: 0 };

  if (!adapter.fetchDictionaries) {
    await markDictionarySynced(supabase, appId, "ok");
    return result;
  }

  try {
    const dicts = await adapter.fetchDictionaries(accessToken, appId, { knownServiceIds });

    const tempDict: AppDictionary = {
      appId,
      provider: providerName,
      rules: [],
      statusLabelRules: [],
      statusMappings: new Map(),
      carriers: new Map(),
      marketplaces: new Map(),
      shippingServices: new Map(),
    };

    const [rulesRes, labelRulesRes] = await Promise.all([
      sales.from("erp_provider_mapping_rules").select("*").eq("provider", providerName).eq("is_active", true),
      sales.from("erp_status_label_rules").select("pattern, global_status, priority, exclude_pattern").eq("is_active", true),
    ]);
    tempDict.rules = (rulesRes.data || []).map((r: any) => ({
      provider: r.provider,
      dimension: r.dimension,
      source_kind: r.source_kind,
      source_value: r.source_value,
      global_slug: r.global_slug,
      priority: r.priority ?? 100,
    }));
    tempDict.statusLabelRules = (labelRulesRes.data || []).map((r: any) => ({
      pattern: r.pattern,
      global_status: r.global_status,
      priority: r.priority ?? 100,
      exclude_pattern: r.exclude_pattern ?? null,
    }));

    if (dicts.statuses.length > 0) {
      await upsertDictionary(supabase, appId, "status",
        dicts.statuses.map((s) => ({
          externalId: s.erpStatusCode,
          name: s.erpStatusLabel,
          extra: { globalStatus: resolveStatus(tempDict, s.erpStatusCode, undefined, s.erpStatusLabel) },
        }))
      );
      result.statuses = dicts.statuses.length;
    }

    if (dicts.carriers.length > 0) {
      await upsertDictionary(supabase, appId, "carrier",
        dicts.carriers.map((c) => ({
          externalId: c.externalId,
          name: c.name,
          extra: {
            carrierType: c.carrierType,
            providerLogisticsType: c.carrierType,
            services: c.services,
            globalLogisticsSlug: resolveLogistics(tempDict, {
              logisticsExternalId: c.externalId,
              logisticsIntegrationType: c.carrierType,
              carrierName: c.name,
            }),
            sourceKind: "logistics_integration",
          },
        }))
      );
      result.carriers = dicts.carriers.length;
    }

    if (dicts.marketplaces.length > 0) {
      await upsertDictionary(supabase, appId, "marketplace",
        dicts.marketplaces.map((m) => ({
          externalId: m.externalId,
          name: m.name,
          extra: {
            canalVenda: m.canalVenda,
            globalMarketplaceSlug: resolveMarketplace(tempDict, {
              marketplaceExternalId: m.externalId,
              marketplaceName: m.name,
              marketplaceChannel: m.canalVenda,
            }),
          },
        }))
      );
      result.marketplaces = dicts.marketplaces.length;
    }

    if (dicts.shippingServices && dicts.shippingServices.length > 0) {
      await upsertShippingServices(supabase, appId, dicts.shippingServices, tempDict);
      result.shippingServices = dicts.shippingServices.length;
    }

    await markDictionarySynced(supabase, appId, "ok");
  } catch (err: any) {
    await markDictionarySynced(supabase, appId, "failed", err.message);
    throw err;
  }

  return result;
}

async function upsertShippingServices(
  supabase: any,
  appId: string,
  services: Array<{
    externalId: string;
    name: string;
    logisticsExternalId?: string;
    aliases?: string[];
    providerLogisticsType?: string;
  }>,
  dict: AppDictionary
) {
  const sales = getClientFromSchema(supabase, "sales");
  const rows = services.map((s) => ({
    app_id: appId,
    service_external_id: s.externalId,
    logistics_external_id: s.logisticsExternalId || null,
    name: s.name,
    aliases: s.aliases || [],
    provider_logistics_type: s.providerLogisticsType || null,
    global_logistics_slug: resolveLogistics(dict, {
      serviceExternalId: s.externalId,
      logisticsExternalId: s.logisticsExternalId,
      logisticsIntegrationType: s.providerLogisticsType,
      shippingServiceName: s.name,
    }),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await sales.from("erp_shipping_services").upsert(rows, {
    onConflict: "app_id, service_external_id",
  });
  if (error) throw new Error(`Erro ao salvar shipping services: ${error.message}`);
}

export async function applyLazyDictionaryEntries(
  supabase: any,
  appId: string,
  provider: string,
  lazy: {
    carriers: Array<{ externalId: string; name: string; extra?: Record<string, unknown> }>;
    marketplaces: Array<{ externalId: string; name: string; extra?: Record<string, unknown> }>;
    shippingServices: Array<{ externalId: string; name: string; extra?: Record<string, unknown> }>;
    statuses: Array<{ externalId: string; name: string; extra?: Record<string, unknown> }>;
  }
) {
  if (lazy.carriers.length > 0) {
    await upsertDictionary(supabase, appId, "carrier", lazy.carriers);
  }
  if (lazy.marketplaces.length > 0) {
    await upsertDictionary(supabase, appId, "marketplace", lazy.marketplaces);
  }
  if (lazy.statuses.length > 0) {
    const dict = await loadAppDictionary(supabase, appId, provider);
    await upsertDictionary(supabase, appId, "status",
      lazy.statuses.map((s) => ({
        externalId: s.externalId,
        name: s.name,
        extra: {
          globalStatus: resolveStatus(dict, s.externalId, undefined, s.name),
        },
      }))
    );
  }
  if (lazy.shippingServices.length > 0) {
    const sales = getClientFromSchema(supabase, "sales");
    const rows = lazy.shippingServices.map((s) => ({
      app_id: appId,
      service_external_id: s.externalId,
      name: s.name,
      logistics_external_id: (s.extra?.logisticsExternalId as string) || null,
      provider_logistics_type: (s.extra?.providerLogisticsType as string) || null,
      global_logistics_slug: (s.extra?.globalLogisticsSlug as string) || "unknown",
      last_seen_at: new Date().toISOString(),
    }));
    await sales.from("erp_shipping_services").upsert(rows, { onConflict: "app_id, service_external_id" });
  }
}
