import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  resolveOrderTranslations,
  loadAppDictionary,
  type AppDictionary,
} from "./translations/index.ts";
import { applyLazyDictionaryEntries } from "./dictionary-sync.ts";

export function getClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

export function getIntegrationClient(req: Request) {
  return getClient(req).schema("integration");
}

export function getSalesClient(req: Request) {
  return getClient(req).schema("sales");
}

export function getCoreClient(req: Request) {
  return getClient(req).schema("core");
}

function getClientFromSchema(supabase: any, schema: string) {
  return supabase.schema ? supabase.schema(schema) : supabase;
}

export async function getAppCredentials(supabase: any, appId: string) {
  const integration = getClientFromSchema(supabase, "integration");

  const { data: appRow, error: appErr } = await integration
    .from("client_applications")
    .select("id, client_id, provider_id")
    .eq("id", appId)
    .single();

  if (appErr || !appRow) {
    throw new Error(`Aplicação não encontrada: ${appId}`);
  }

  const [providerRes, credRes, tokenRes] = await Promise.all([
    integration.from("erp_providers").select("name, auth_type, auth_config").eq("id", appRow.provider_id).single(),
    integration.from("credentials").select("client_identifier, client_secret").eq("app_id", appId).maybeSingle(),
    integration.from("tokens").select("access_token, refresh_token, expires_at").eq("app_id", appId).maybeSingle(),
  ]);

  return {
    ...appRow,
    erp_providers: providerRes.error ? null : providerRes.data,
    credentials: credRes.data || null,
    tokens: tokenRes.data || null,
  };
}

export async function saveTokens(
  supabase: any,
  appId: string,
  accessToken: string,
  refreshToken: string | undefined,
  expiresIn: number | undefined,
  rawResponse: any
) {
  const integration = getClientFromSchema(supabase, "integration");

  // Check if this is an update (existing token) or insert (new)
  const { data: existing } = await integration
    .from("tokens")
    .select("id")
    .eq("app_id", appId)
    .maybeSingle();

  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  const { error } = await integration.from("tokens").upsert(
    {
      app_id: appId,
      access_token: accessToken,
      refresh_token: refreshToken || null,
      expires_at: expiresAt,
      raw_payload_response: rawResponse,
    },
    { onConflict: "app_id" }
  );

  if (error) throw new Error(`Erro ao salvar tokens: ${error.message}`);

  // Log credential lifecycle event
  await createAuditLog(
    supabase,
    existing ? "tokens.updated" : "tokens.created",
    appId,
    null,
    {
      has_refresh: !!refreshToken,
      expires_in: expiresIn,
      expires_at: expiresAt,
    },
    { category: "credentials" }
  );
}

const RAW_PAYLOAD_PRESERVE_KEYS = [
  "transporte",
  "intermediador",
  "itens",
  "parcelas",
  "taxas",
  "desconto",
] as const;

function mergeRawPayload(existing: unknown, incoming: unknown): Record<string, unknown> {
  const prev = (existing && typeof existing === "object" ? existing : {}) as Record<string, unknown>;
  const next = (incoming && typeof incoming === "object" ? incoming : {}) as Record<string, unknown>;
  const merged = { ...prev, ...next };
  for (const key of RAW_PAYLOAD_PRESERVE_KEYS) {
    if (next[key] == null && prev[key] != null) {
      merged[key] = prev[key];
    }
  }
  return merged;
}

export async function upsertInvoice(
  supabase: any,
  clientId: string,
  appId: string,
  order: any,
  dict?: AppDictionary
) {
  const sales = getClientFromSchema(supabase, "sales");

  let appDict = dict;
  if (!appDict) {
    const integration = getClientFromSchema(supabase, "integration");
    const { data: appRow } = await integration
      .from("client_applications")
      .select("erp_providers!provider_id(name)")
      .eq("id", appId)
      .single();
    const provider = (appRow?.erp_providers as { name?: string } | null)?.name || "unknown";
    appDict = await loadAppDictionary(supabase, appId, provider);
  }

  const translation = resolveOrderTranslations(appDict, order);
  const statusFromDict = appDict.statusMappings.get(order.erpStatusCode);
  const erpStatusLabel = statusFromDict?.erp_status_label || order.erpStatusLabel || null;
  const marketplaceRow = order.marketplaceId ? appDict.marketplaces.get(order.marketplaceId) : undefined;

  if (
    translation.lazyEntries.carriers.length > 0 ||
    translation.lazyEntries.marketplaces.length > 0 ||
    translation.lazyEntries.shippingServices.length > 0 ||
    translation.lazyEntries.statuses.length > 0
  ) {
    await applyLazyDictionaryEntries(supabase, appId, appDict.provider, translation.lazyEntries);
  }

  const { data: existing } = await sales
    .from("invoices")
    .select("id, raw_payload")
    .eq("app_id", appId)
    .eq("external_id", order.externalId)
    .maybeSingle();

  const payload: Record<string, unknown> = {
    client_id: clientId,
    app_id: appId,
    external_id: order.externalId,
    invoice_number: order.invoiceNumber || null,
    issue_date: order.issueDate,
    total_amount: order.totalAmount,
    status: order.erpStatusCode || null,
    erp_order_number: order.erpOrderNumber || null,
    erp_marketplace_external_id: translation.erpMarketplaceExternalId,
    marketplace_id: translation.marketplaceId,
    marketplace_name: order.marketplaceName || marketplaceRow?.name || null,
    marketplace_order_id: order.marketplaceOrderId || null,
    order_type: order.orderType || null,
    sales_channel: order.salesChannel || null,
    freight_value: order.freightValue ?? 0,
    freight_paid_by: order.freightPaidBy || null,
    commission_fee: order.commissionFee ?? 0,
    commission_base: order.commissionBase ?? 0,
    discount_value: order.discountValue ?? 0,
    carrier_id: translation.carrierId,
    carrier_name: order.carrierName || null,
    tracking_code: order.trackingCode || null,
    tracking_url: order.trackingUrl || null,
    shipping_method: order.shippingMethod || null,
    shipping_method_external_id: order.shippingMethodExternalId || null,
    global_status: translation.globalStatus,
    global_marketplace_slug: translation.globalMarketplaceSlug,
    global_logistics_slug: translation.globalLogisticsSlug,
    global_order_type_slug: translation.globalOrderTypeSlug,
    erp_logistics_external_id: translation.erpLogisticsExternalId,
    erp_logistics_name: translation.erpLogisticsName,
    erp_status_code: order.erpStatusCode || null,
    erp_status_label: erpStatusLabel,
    notes: order.notes || null,
    raw_payload: existing
      ? mergeRawPayload(existing.raw_payload, order.rawPayload)
      : order.rawPayload,
    synced_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await sales
      .from("invoices")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(`Erro ao atualizar fatura: ${error.message}`);
    return existing.id;
  } else {
    const { data, error } = await sales
      .from("invoices")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(`Erro ao inserir fatura: ${error.message}`);
    return data.id;
  }
}

export async function upsertInvoiceItems(
  supabase: any,
  invoiceId: string,
  items: any[]
) {
  const sales = getClientFromSchema(supabase, "sales");

  const rows = items.map((item: any) => ({
    invoice_id: invoiceId,
    external_product_id: item.externalProductId,
    sku: item.sku || null,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_amount: item.totalAmount,
  }));

  const { error } = await sales.from("invoice_items").upsert(rows, {
    onConflict: undefined,
    ignoreDuplicates: false,
  });

  if (error) throw new Error(`Erro ao salvar itens da fatura: ${error.message}`);
}

export async function upsertDictionary(
  supabase: any,
  appId: string,
  dictType: "carrier" | "marketplace" | "status",
  entries: { externalId: string; name: string; extra?: Record<string, unknown> }[]
) {
  const sales = getClientFromSchema(supabase, "sales");

  if (entries.length === 0) return;

  const table =
    dictType === "carrier" ? "erp_carriers" :
    dictType === "marketplace" ? "erp_marketplaces" :
    "erp_status_mappings";

  const conflictCol =
    dictType === "status" ? "erp_status_code" : "external_id";

  const rows = entries.map((e) => {
    const base: Record<string, unknown> = {
      app_id: appId,
      [conflictCol]: e.externalId,
    };
    if (dictType === "status") {
      base.erp_status_label = e.name;
      base.global_status = (e.extra?.globalStatus as string) || "pending";
    } else {
      base.name = e.name;
    }
    if (dictType === "carrier") {
      base.carrier_type = (e.extra?.carrierType as string) || null;
      base.external_code = (e.extra?.externalCode as string) || null;
      base.services = (e.extra?.services as unknown[]) || [];
      base.metadata = (e.extra?.metadata as Record<string, unknown>) || {};
      base.provider_logistics_type = (e.extra?.providerLogisticsType as string) || base.carrier_type;
      base.global_logistics_slug = (e.extra?.globalLogisticsSlug as string) || null;
      base.source_kind = (e.extra?.sourceKind as string) || "logistics_integration";
    }
    if (dictType === "marketplace") {
      base.metadata = (e.extra?.metadata as Record<string, unknown>) || {};
      base.global_marketplace_slug = (e.extra?.globalMarketplaceSlug as string) || null;
      base.canal_venda = (e.extra?.canalVenda as string) || null;
    }
    return base;
  });

  const { error } = await sales.from(table).upsert(rows, {
    onConflict: `app_id,${conflictCol}`,
    ignoreDuplicates: false,
  });

  if (error) {
    throw new Error(`[upsertDictionary] Erro ao salvar ${dictType}: ${error.message}`);
  }
}

export async function upsertProduct(
  supabase: any,
  clientId: string,
  appId: string,
  item: any
) {
  const sales = getClientFromSchema(supabase, "sales");

  const { data: existing } = await sales
    .from("products")
    .select("id")
    .eq("app_id", appId)
    .eq("external_id", item.externalProductId)
    .maybeSingle();

  const payload = {
    client_id: clientId,
    app_id: appId,
    external_id: item.externalProductId,
    name: item.description,
    sku: item.externalProductId,
    price: item.unitPrice,
    raw_payload: {},
  };

  if (!existing) {
    await sales.from("products").insert(payload).maybeSingle();
  }
}

export async function createAuditLog(
  supabase: any,
  event: string,
  appId: string | null,
  provider: string | null,
  metadata: Record<string, unknown> = {},
  options: { actorId?: string | null; category?: string; erpErrorCode?: string } = {}
) {
  const integration = getClientFromSchema(supabase, "integration");
  const { error } = await integration.from("audit_logs").insert({
    event_type: event,
    app_id: appId,
    provider,
    actor_id: options.actorId || null,
    category: options.category || "credentials",
    erp_error_code: options.erpErrorCode || null,
    payload: metadata,
  });
  if (error) {
    console.error(`[audit] Falha ao salvar log: ${error.message}`);
  }
}

export async function enqueueRetry(
  supabase: any,
  queue: string,
  appId: string,
  error: string,
  payload: any = {}
) {
  const { error: rpcError } = await supabase.rpc("enqueue_retry", {
    p_queue: queue,
    p_app_id: appId,
    p_error: error,
    p_payload: payload,
  });
  if (rpcError) {
    console.error(`Falha ao enfileirar retry: ${rpcError.message}`);
  }

  // Also log queue event to activity log
  await createAuditLog(
    supabase,
    `queue.enqueued`,
    appId,
    null,
    { queue, error, payload },
    { category: "queues" }
  );
}

export async function resolveCompanyMapping(
  supabase: any,
  provider: string,
  companyExternalId: string,
) {
  const integration = getClientFromSchema(supabase, "integration");
  const { data, error } = await integration
    .from("erp_company_mappings")
    .select("app_id, client_id, company_name")
    .eq("provider", provider)
    .eq("company_external_id", companyExternalId)
    .maybeSingle();

  if (error) throw new Error(`Erro ao resolver company mapping: ${error.message}`);
  return data;
}

export async function upsertCompanyMapping(
  supabase: any,
  provider: string,
  companyExternalId: string,
  appId: string,
  clientId: string,
  companyName?: string,
) {
  const integration = getClientFromSchema(supabase, "integration");
  const { error } = await integration.from("erp_company_mappings").upsert(
    {
      provider,
      company_external_id: companyExternalId,
      app_id: appId,
      client_id: clientId,
      company_name: companyName || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider,company_external_id" },
  );

  if (error) throw new Error(`Erro ao salvar company mapping: ${error.message}`);

  await supabase.rpc("reprocess_unmapped_webhooks", {
    p_provider: provider,
    p_company_external_id: companyExternalId,
    p_app_id: appId,
    p_client_id: clientId,
  });
}

export async function enqueueWebhookInvoice(
  supabase: any,
  params: {
    appId: string | null;
    clientId: string | null;
    provider: string;
    companyExternalId: string | null;
    eventType: string | null;
    idempotencyKey: string;
    payload: unknown;
    headers: Record<string, string>;
    status?: string;
  },
): Promise<string | null> {
  const { data, error } = await supabase.rpc("enqueue_webhook_invoice", {
    p_app_id: params.appId,
    p_client_id: params.clientId,
    p_provider: params.provider,
    p_company_external_id: params.companyExternalId,
    p_event_type: params.eventType,
    p_idempotency_key: params.idempotencyKey,
    p_payload: params.payload,
    p_headers: params.headers,
    p_status: params.status || "pending",
  });

  if (error) throw new Error(`Erro ao enfileirar webhook: ${error.message}`);
  return data as string | null;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }
  return null;
}

export function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

export { loadAppDictionary, isDictionaryStale } from "./translations/load-dictionary.ts";
export { syncAppDictionaries, applyLazyDictionaryEntries } from "./dictionary-sync.ts";
export type { AppDictionary } from "./translations/types.ts";
