import { getAdapter } from "../shared/adapters/registry.ts";
import {
  getClient,
  upsertInvoice, upsertInvoiceItems, upsertProduct,
  loadAppDictionary, isDictionaryStale, syncAppDictionaries,
  handleCors, jsonResponse,
} from "../shared/db.ts";
import { enrichOrderWithDetail, orderNeedsDetailFetch } from "../shared/order-enrichment.ts";

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabase = getClient(req);

    console.log("[erp-process-sync-queue] Iniciando processamento da fila");

    const { data: items, error: acquireError } = await supabase.rpc(
      "acquire_pending_syncs",
      { p_limit: 3 }
    );

    if (acquireError) {
      console.error("[erp-process-sync-queue] Erro acquire_pending_syncs:", acquireError);
      return jsonResponse({ error: `Erro ao adquirir itens: ${acquireError.message}` }, 500);
    }

    if (!items || items.length === 0) {
      console.log("[erp-process-sync-queue] Nenhum item pendente.");
      return jsonResponse({ success: true, message: "Nenhum item pendente.", processed: 0 });
    }

    console.log(`[erp-process-sync-queue] ${items.length} item(ns) adquiridos`);
    const results: Array<{ id: string; app_id: string; status: string; error?: string; synced?: number }> = [];

    for (const item of items) {
      console.log(`[erp-process-sync-queue] Processando item ${item.id}, app_id=${item.app_id}`);
      try {
        const integration = supabase.schema("integration");
        const { data: app, error: appError } = await integration
          .from("client_applications")
          .select(`
            id, client_id, status,
            erp_providers!provider_id(name),
            tokens(access_token, refresh_token),
            credentials(client_identifier, client_secret)
          `)
          .eq("id", item.app_id)
          .single();

        if (appError) {
          console.error(`[erp-process-sync-queue] App ${item.app_id} não encontrada:`, appError);
          await supabase.rpc("complete_sync", { p_id: item.id, p_status: "failed", p_error: `App not found: ${appError.message}` });
          results.push({ id: item.id, app_id: item.app_id, status: "failed", error: "App not found" });
          continue;
        }

        if (app.status !== "active") {
          console.log(`[erp-process-sync-queue] App ${item.app_id} não está ativa (status=${app.status})`);
          await supabase.rpc("complete_sync", { p_id: item.id, p_status: "failed", p_error: "App not active" });
          results.push({ id: item.id, app_id: item.app_id, status: "failed", error: "App not active" });
          continue;
        }

        const adapter = getAdapter(app.erp_providers?.name || "");
        const accessToken = app.tokens?.access_token;
        if (!accessToken) {
          console.log(`[erp-process-sync-queue] App ${item.app_id} sem token`);
          await supabase.rpc("complete_sync", { p_id: item.id, p_status: "failed", p_error: "No access token" });
          results.push({ id: item.id, app_id: item.app_id, status: "failed", error: "No access token" });
          continue;
        }

        const providerName = app.erp_providers?.name || "unknown";
        console.log(`[erp-process-sync-queue] App ${item.app_id}: provider=${providerName}, client_id=${app.client_id}`);

        if (await isDictionaryStale(supabase, item.app_id)) {
          const sales = supabase.schema("sales");
          const { data: existingServices } = await sales
            .from("erp_shipping_services")
            .select("service_external_id")
            .eq("app_id", item.app_id);
          const knownServiceIds = new Set((existingServices || []).map((s: any) => s.service_external_id));
          try {
            await syncAppDictionaries(supabase, item.app_id, providerName, accessToken, knownServiceIds);
          } catch (dictErr: any) {
            console.error(`[erp-process-sync-queue] Erro sync fria dicionários: ${dictErr.message}`);
          }
        }

        const appDict = await loadAppDictionary(supabase, item.app_id, providerName);

        let synced = 0;
        let errors = 0;
        const page = 1;
        const fromDate = dateNDaysAgo(1);
        console.log(`[erp-process-sync-queue] Buscando pedidos desde ${fromDate} para app ${item.app_id}`);

        const sales = supabase.schema("sales");
        try {
          const result = await adapter.fetchOrders(accessToken, { fromDate, page });
          console.log(`[erp-process-sync-queue] App ${item.app_id}: página ${page} retornou ${result.orders.length} pedidos`);

          const existingByExtId = new Map<string, { raw_payload: Record<string, unknown> | null }>();
          if (result.orders.length > 0) {
            const extIds = result.orders.map((o: { externalId: string }) => String(o.externalId));
            const { data: existing } = await sales
              .from("invoices")
              .select("external_id, raw_payload")
              .eq("app_id", item.app_id)
              .in("external_id", extIds);
            if (existing) {
              for (const inv of existing) {
                existingByExtId.set(inv.external_id, { raw_payload: inv.raw_payload });
              }
            }
          }

          for (const order of result.orders) {
            try {
              const extId = String(order.externalId);
              const existing = existingByExtId.get(extId);
              const needsUpdate = !existing || orderNeedsDetailFetch({
                items: order.items,
                rawPayload: existing?.raw_payload ?? order.rawPayload,
              });

              if (!needsUpdate) {
                synced++;
                continue;
              }

              const fullOrder = await enrichOrderWithDetail(adapter, accessToken, order);
              const invoiceId = await upsertInvoice(supabase, app.client_id, item.app_id, fullOrder, appDict);
              for (const it of fullOrder.items) {
                await upsertProduct(supabase, app.client_id, item.app_id, it);
              }
              await upsertInvoiceItems(supabase, invoiceId, fullOrder.items);
              synced++;
            } catch (err: any) {
              errors++;
              console.error(`[erp-process-sync-queue] Erro ao salvar pedido ${order.externalId}: ${err.message}`);
            }
          }
        } catch (err: any) {
          errors++;
          console.error(`[erp-process-sync-queue] Erro na página ${page} para app ${item.app_id}: ${err.message}`);
          if (err.stack) console.error(`[erp-process-sync-queue] Stack: ${err.stack}`);
        }

        console.log(`[erp-process-sync-queue] App ${item.app_id}: ${synced} sincronizados, ${errors} erros`);

        await supabase.rpc("complete_sync", { p_id: item.id, p_status: "completed" });
        console.log(`[erp-process-sync-queue] Item ${item.id} concluído com sucesso`);
        results.push({ id: item.id, app_id: item.app_id, status: "completed", synced, errors });
      } catch (err: any) {
        console.error(`[erp-process-sync-queue] Erro fatal no item ${item.id}: ${err.message}`);
        await supabase.rpc("complete_sync", { p_id: item.id, p_status: "failed", p_error: err.message });
        results.push({ id: item.id, app_id: item.app_id, status: "failed", error: err.message });
      }
    }

    return jsonResponse({ success: true, processed: results.length, results });
  } catch (error: any) {
    console.error("[erp-process-sync-queue] Erro geral:", error);
    return jsonResponse({ error: error.message || "Erro ao processar fila." }, 500);
  }
});
