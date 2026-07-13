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

  const { data, error } = await integration
    .from("client_applications")
    .select(`
      id, client_id, provider_id,
      erp_providers!provider_id(name, auth_type, auth_config),
      credentials(client_identifier, client_secret),
      tokens(access_token, refresh_token, expires_at)
    `)
    .eq("id", appId)
    .single();

  if (error || !data) {
    throw new Error(`Aplicação não encontrada: ${appId}`);
  }
  return data;
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

  const payload = {
    client_id: clientId,
    app_id: appId,
    external_id: order.externalId,
    invoice_number: order.invoiceNumber || null,
    issue_date: order.issueDate,
    total_amount: order.totalAmount,
    status: order.status,
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
