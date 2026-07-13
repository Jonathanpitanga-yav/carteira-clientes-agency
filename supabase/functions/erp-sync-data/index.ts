import { getAdapter } from "../shared/adapters/registry.ts";
import {
  getIntegrationClient, enqueueRetry,
  upsertInvoice, upsertInvoiceItems, upsertProduct,
  handleCors, jsonResponse,
} from "../shared/db.ts";

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

    const adapter = getAdapter(app.erp_providers?.name || "");
    const accessToken = app.tokens?.access_token;
    if (!accessToken) {
      return jsonResponse({ error: "Nenhum token de acesso encontrado." }, 400);
    }

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
            const invoiceId = await upsertInvoice(supabase, app.client_id, appId, order);
            for (const item of order.items) {
              await upsertProduct(supabase, app.client_id, appId, item);
            }
            await upsertInvoiceItems(supabase, invoiceId, order.items);
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
