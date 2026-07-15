import type { AppDictionary, MappingRule, CarrierRow, MarketplaceRow, ShippingServiceRow, StatusMappingRow, StatusLabelRule } from "./types.ts";

function getClientFromSchema(supabase: any, schema: string) {
  return supabase.schema ? supabase.schema(schema) : supabase;
}

export async function loadAppDictionary(
  supabase: any,
  appId: string,
  provider: string
): Promise<AppDictionary> {
  const sales = getClientFromSchema(supabase, "sales");

  const [rulesRes, labelRulesRes, statusRes, carriersRes, marketplacesRes, servicesRes] = await Promise.all([
    sales.from("erp_provider_mapping_rules").select("*").eq("provider", provider).eq("is_active", true),
    sales.from("erp_status_label_rules").select("pattern, global_status, priority, exclude_pattern").eq("is_active", true),
    sales.from("erp_status_mappings").select("erp_status_code, erp_status_label, global_status").eq("app_id", appId),
    sales.from("erp_carriers").select("id, external_id, name, provider_logistics_type, global_logistics_slug, carrier_type").eq("app_id", appId),
    sales.from("erp_marketplaces").select("id, external_id, name, global_marketplace_slug, canal_venda").eq("app_id", appId),
    sales.from("erp_shipping_services").select("id, logistics_external_id, service_external_id, name, aliases, provider_logistics_type, global_logistics_slug").eq("app_id", appId),
  ]);

  const rules: MappingRule[] = (rulesRes.data || []).map((r: any) => ({
    provider: r.provider,
    dimension: r.dimension,
    source_kind: r.source_kind,
    source_value: r.source_value,
    global_slug: r.global_slug,
    priority: r.priority ?? 100,
  }));

  const statusLabelRules: StatusLabelRule[] = (labelRulesRes.data || []).map((r: any) => ({
    pattern: r.pattern,
    global_status: r.global_status,
    priority: r.priority ?? 100,
    exclude_pattern: r.exclude_pattern ?? null,
  }));

  const statusMappings = new Map<string, StatusMappingRow>();
  for (const row of statusRes.data || []) {
    statusMappings.set(row.erp_status_code, row);
  }

  const carriers = new Map<string, CarrierRow>();
  for (const row of carriersRes.data || []) {
    carriers.set(row.external_id, row);
  }

  const marketplaces = new Map<string, MarketplaceRow>();
  for (const row of marketplacesRes.data || []) {
    marketplaces.set(row.external_id, row);
  }

  const shippingServices = new Map<string, ShippingServiceRow>();
  for (const row of servicesRes.data || []) {
    shippingServices.set(row.service_external_id, row);
  }

  return { appId, provider, rules, statusLabelRules, statusMappings, carriers, marketplaces, shippingServices };
}

export async function isDictionaryStale(supabase: any, appId: string): Promise<boolean> {
  const integration = getClientFromSchema(supabase, "integration");
  const { data } = await integration
    .from("dictionary_sync_state")
    .select("last_synced_at, ttl_days, sync_status")
    .eq("app_id", appId)
    .maybeSingle();

  if (!data || !data.last_synced_at) return true;
  if (data.sync_status !== "ok") return true;

  const ttlDays = data.ttl_days ?? 7;
  const lastSync = new Date(data.last_synced_at).getTime();
  const expiresAt = lastSync + ttlDays * 24 * 60 * 60 * 1000;
  return Date.now() > expiresAt;
}

export async function markDictionarySynced(
  supabase: any,
  appId: string,
  status: "ok" | "failed" | "stale" = "ok",
  error?: string
) {
  const integration = getClientFromSchema(supabase, "integration");
  const row: Record<string, unknown> = {
    app_id: appId,
    sync_status: status,
    last_error: error || null,
    updated_at: new Date().toISOString(),
  };
  if (status === "ok") {
    row.last_synced_at = new Date().toISOString();
  }

  await integration.from("dictionary_sync_state").upsert(row, { onConflict: "app_id" });
}
