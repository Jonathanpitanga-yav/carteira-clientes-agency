import { getAdapter } from "../shared/adapters/registry.ts";
import {
  getIntegrationClient, enqueueRetry,
  upsertInvoice, upsertInvoiceItems, upsertProduct,
  loadAppDictionary, isDictionaryStale, syncAppDictionaries,
  handleCors, jsonResponse,
} from "../shared/db.ts";
import { enrichOrderWithDetail } from "../shared/order-enrichment.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { appId, fromDate, toDate } = await req.json();

    if (!appId) {
      return jsonResponse({ error: "appId é obrigatório." }, 400);
    }

    const supabase = getIntegrationClient(req);

    const { data: app, error: appError } = await supabase
      .from("client_applications")
      .select(`
        id, client_id, status,
        erp_providers!provider_id(name),
        tokens(access_token, refresh_token),
        credentials(client_identifier, client_secret)
      `)
      .eq("id", appId)
      .single();

    if (appError || !app) {
      return jsonResponse({ error: "Aplicação não encontrada." }, 404);
    }

    if (app.status !== "active") {
      return jsonResponse({ error: "Aplicação não está ativa." }, 400);
    }

    const providerName = app.erp_providers?.name || "";
    const adapter = getAdapter(providerName);
    const accessToken = app.tokens?.access_token;
    if (!accessToken) {
      return jsonResponse({ error: "Nenhum token de acesso encontrado." }, 400);
    }

    if (await isDictionaryStale(supabase, appId)) {
      const sales = supabase.schema("sales");
      const { data: existingServices } = await sales
        .from("erp_shipping_services")
        .select("service_external_id")
        .eq("app_id", appId);
      const knownServiceIds = new Set((existingServices || []).map((s: any) => s.service_external_id));
      await syncAppDictionaries(supabase, appId, providerName, accessToken, knownServiceIds);
    }

    const appDict = await loadAppDictionary(supabase, appId, providerName);

    let synced = 0;
    let errors = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const result = await adapter.fetchOrders(accessToken, {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          page,
        });

        for (const order of result.orders) {
          try {
            const fullOrder = await enrichOrderWithDetail(adapter, accessToken, order);

            const invoiceId = await upsertInvoice(supabase, app.client_id, appId, fullOrder, appDict);
            for (const item of fullOrder.items) {
              await upsertProduct(supabase, app.client_id, appId, item);
            }
            await upsertInvoiceItems(supabase, invoiceId, fullOrder.items);
            synced++;
          } catch (err: any) {
            errors++;
            console.error(`Erro ao salvar pedido ${order.externalId}: ${err.message}`);
            await enqueueRetry(supabase, "erp_sync_retry", appId, err.message, {
              externalId: order.externalId,
              page,
            });
          }
        }

        hasMore = result.hasMore;
        page++;
      } catch (err: any) {
        errors++;
        console.error(`Erro na página ${page}: ${err.message}`);
        await enqueueRetry(supabase, "erp_sync_retry", appId, err.message, { page });
        break;
      }
    }

    return jsonResponse({
      success: true,
      message: `Sincronização concluída. ${synced} pedidos, ${errors} erros.`,
      syncedOrders: synced,
      errors,
    });
  } catch (error: any) {
    return jsonResponse({ error: error.message || "Erro ao sincronizar dados." }, 500);
  }
});
