import { getAdapter } from "../shared/adapters/registry.ts";
import {
  getClient, upsertInvoice, upsertInvoiceItems, upsertProduct,
  handleCors, jsonResponse,
} from "../shared/db.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const provider = req.headers.get("x-erp-provider") || req.headers.get("x-provider");
    const appId = req.headers.get("x-app-id");

    if (!provider) {
      return jsonResponse({ error: "Header x-erp-provider é obrigatório." }, 400);
    }
    if (!appId) {
      return jsonResponse({ error: "Header x-app-id é obrigatório." }, 400);
    }

    const payload = await req.json();
    const adapter = getAdapter(provider);
    const { eventType, data: order } = await adapter.handleWebhook(payload, Object.fromEntries(req.headers));

    if (eventType === "unknown") {
      return jsonResponse({ message: "Evento ignorado (tipo desconhecido)." });
    }

    const supabase = getClient(req);

    const { data: app, error: appError } = await supabase
      .from("client_applications")
      .select("client_id, status")
      .eq("id", appId)
      .single();

    if (appError || !app) {
      return jsonResponse({ error: "Aplicação não encontrada." }, 404);
    }

    const invoiceId = await upsertInvoice(supabase, app.client_id, appId, order);

    for (const item of order.items) {
      await upsertProduct(supabase, app.client_id, appId, item);
    }

    await upsertInvoiceItems(supabase, invoiceId, order.items);

    return jsonResponse({
      success: true,
      eventType,
      invoiceId,
      itemsCount: order.items?.length || 0,
    });
  } catch (error: any) {
    return jsonResponse(
      { error: error.message || "Erro ao processar webhook." },
      500
    );
  }
});
