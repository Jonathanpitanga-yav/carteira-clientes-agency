import { getAdapter } from "../shared/adapters/registry.ts";
import {
  getClient,
  upsertInvoice,
  upsertInvoiceItems,
  upsertProduct,
  loadAppDictionary,
  isDictionaryStale,
  syncAppDictionaries,
  handleCors,
  jsonResponse,
} from "../shared/db.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabase = getClient(req);

    console.log("[erp-process-webhook-queue] Iniciando processamento da fila");

    const { data: items, error: acquireError } = await supabase.rpc(
      "acquire_pending_webhook_invoices",
      { p_limit: 20 },
    );

    if (acquireError) {
      console.error("[erp-process-webhook-queue] Erro acquire:", acquireError);
      return jsonResponse({ error: `Erro ao adquirir itens: ${acquireError.message}` }, 500);
    }

    if (!items || items.length === 0) {
      return jsonResponse({ success: true, message: "Nenhum item pendente.", processed: 0 });
    }

    console.log(`[erp-process-webhook-queue] ${items.length} item(ns) adquiridos`);
    const results: Array<{
      id: string;
      app_id: string;
      status: string;
      error?: string;
      invoiceId?: string;
    }> = [];

    for (const item of items) {
      try {
        const integration = supabase.schema("integration");
        const { data: app, error: appError } = await integration
          .from("client_applications")
          .select(`
            id, client_id, status,
            erp_providers!provider_id(name)
          `)
          .eq("id", item.app_id)
          .single();

        if (appError || !app) {
          await supabase.rpc("complete_webhook_invoice", {
            p_id: item.id,
            p_status: "failed",
            p_error: `App not found: ${appError?.message}`,
          });
          results.push({ id: item.id, app_id: item.app_id, status: "failed", error: "App not found" });
          continue;
        }

        if (app.status !== "active") {
          await supabase.rpc("complete_webhook_invoice", {
            p_id: item.id,
            p_status: "failed",
            p_error: "App not active",
          });
          results.push({ id: item.id, app_id: item.app_id, status: "failed", error: "App not active" });
          continue;
        }

        const providerName = (app.erp_providers as { name?: string } | null)?.name || item.provider;
        const adapter = getAdapter(providerName);

        const { eventType, data: order } = await adapter.handleWebhook(
          item.payload,
          item.headers || {},
        );

        const supported = adapter.supportedWebhookEvents();
        if (supported.length > 0 && !supported.includes(eventType) && eventType !== "unknown") {
          await supabase.rpc("complete_webhook_invoice", {
            p_id: item.id,
            p_status: "processed",
          });
          results.push({ id: item.id, app_id: item.app_id, status: "processed" });
          continue;
        }

        if (eventType === "unknown") {
          await supabase.rpc("complete_webhook_invoice", {
            p_id: item.id,
            p_status: "processed",
          });
          results.push({ id: item.id, app_id: item.app_id, status: "processed" });
          continue;
        }

        const { data: tokenRow } = await integration
          .from("tokens")
          .select("access_token")
          .eq("app_id", item.app_id)
          .maybeSingle();

        const accessToken = tokenRow?.access_token;

        if (accessToken && await isDictionaryStale(supabase, item.app_id)) {
          const sales = supabase.schema("sales");
          const { data: existingServices } = await sales
            .from("erp_shipping_services")
            .select("service_external_id")
            .eq("app_id", item.app_id);
          const knownServiceIds = new Set((existingServices || []).map((s: { service_external_id: string }) => s.service_external_id));
          try {
            await syncAppDictionaries(supabase, item.app_id, providerName, accessToken, knownServiceIds);
          } catch (dictErr: unknown) {
            const msg = dictErr instanceof Error ? dictErr.message : String(dictErr);
            console.error(`[erp-process-webhook-queue] Erro sync dicionários: ${msg}`);
          }
        }

        const appDict = await loadAppDictionary(supabase, item.app_id, providerName);
        const invoiceId = await upsertInvoice(supabase, app.client_id, item.app_id, order, appDict);

        for (const it of order.items) {
          await upsertProduct(supabase, app.client_id, item.app_id, it);
        }
        await upsertInvoiceItems(supabase, invoiceId, order.items);

        await supabase.rpc("complete_webhook_invoice", {
          p_id: item.id,
          p_status: "processed",
          p_invoice_id: invoiceId,
        });

        results.push({ id: item.id, app_id: item.app_id, status: "processed", invoiceId });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[erp-process-webhook-queue] Erro no item ${item.id}: ${message}`);
        await supabase.rpc("complete_webhook_invoice", {
          p_id: item.id,
          p_status: "failed",
          p_error: message,
        });
        results.push({ id: item.id, app_id: item.app_id, status: "failed", error: message });
      }
    }

    return jsonResponse({ success: true, processed: results.length, results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[erp-process-webhook-queue] Erro geral:", message);
    return jsonResponse({ error: message || "Erro ao processar fila." }, 500);
  }
});
