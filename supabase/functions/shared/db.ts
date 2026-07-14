import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

export async function upsertInvoice(
  supabase: any,
  clientId: string,
  appId: string,
  order: any
) {
  const sales = getClientFromSchema(supabase, "sales");

  const { data: existing } = await sales
    .from("invoices")
    .select("id")
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
    marketplace_id: order.marketplaceId || null,
    marketplace_name: order.marketplaceName || null,
    marketplace_order_id: order.marketplaceOrderId || null,
    order_type: order.orderType || null,
    sales_channel: order.salesChannel || null,
    freight_value: order.freightValue ?? 0,
    freight_paid_by: order.freightPaidBy || null,
    commission_fee: order.commissionFee ?? 0,
    commission_base: order.commissionBase ?? 0,
    discount_value: order.discountValue ?? 0,
    carrier_name: order.carrierName || null,
    tracking_code: order.trackingCode || null,
    tracking_url: order.trackingUrl || null,
    shipping_method: order.shippingMethod || null,
    shipping_method_external_id: order.shippingMethodExternalId || null,
    global_status: order.globalStatus || "pending",
    erp_status_code: order.erpStatusCode || null,
    erp_status_label: order.erpStatusLabel || null,
    notes: order.notes || null,
    raw_payload: order.rawPayload,
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
      name: e.name,
    };
    if (dictType === "carrier") {
      base.carrier_type = (e.extra?.carrierType as string) || null;
      base.external_code = (e.extra?.externalCode as string) || null;
      base.services = (e.extra?.services as unknown[]) || [];
      base.metadata = (e.extra?.metadata as Record<string, unknown>) || {};
    }
    if (dictType === "marketplace") {
      base.metadata = (e.extra?.metadata as Record<string, unknown>) || {};
    }
    if (dictType === "status") {
      base.erp_status_label = e.name;
      base.global_status = (e.extra?.globalStatus as string) || "pending";
    }
    return base;
  });

  const { error } = await sales.from(table).upsert(rows, {
    onConflict: `app_id, ${conflictCol}`,
    ignoreDuplicates: false,
  });

  if (error) {
    console.error(`[upsertDictionary] Erro ao salvar ${dictType}: ${error.message}`);
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
