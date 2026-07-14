import { getAdapter } from "../shared/adapters/registry.ts";
import {
  getIntegrationClient, enqueueRetry,
  upsertInvoice, upsertInvoiceItems, upsertProduct, upsertDictionary,
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

    const discoveredCarriers = new Map<string, { name: string; carrierType?: string }>();
    const discoveredMarketplaces = new Map<string, { name: string }>();
    const discoveredStatuses = new Map<string, { label: string; global: string }>();

    while (hasMore) {
      try {
        const result = await adapter.fetchOrders(accessToken, {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          page,
        });

        for (const order of result.orders) {
          try {
            let fullOrder = order;
            if (adapter.fetchOrderById && order.items.length === 0 && order.externalId) {
              try {
                fullOrder = await adapter.fetchOrderById(accessToken, order.externalId);
              } catch (err: any) {
                console.error(
                  `Erro ao buscar detalhes do pedido ${order.externalId}: ${err.message}`
                );
              }
            }

            const invoiceId = await upsertInvoice(supabase, app.client_id, appId, fullOrder);
            for (const item of fullOrder.items) {
              await upsertProduct(supabase, app.client_id, appId, item);
            }
            await upsertInvoiceItems(supabase, invoiceId, fullOrder.items);

            if (fullOrder.marketplaceId && fullOrder.marketplaceName) {
              discoveredMarketplaces.set(fullOrder.marketplaceId, { name: fullOrder.marketplaceName });
            }
            if (fullOrder.carrierExternalId && fullOrder.carrierName) {
              discoveredCarriers.set(fullOrder.carrierExternalId, {
                name: fullOrder.carrierName,
                carrierType: fullOrder.freightPaidBy,
              });
            }
            if (fullOrder.erpStatusCode) {
              discoveredStatuses.set(fullOrder.erpStatusCode, {
                label: fullOrder.erpStatusLabel || fullOrder.erpStatusCode,
                global: fullOrder.globalStatus,
              });
            }

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

    if (discoveredCarriers.size > 0) {
      await upsertDictionary(supabase, appId, "carrier",
        Array.from(discoveredCarriers.entries()).map(([id, v]) => ({
          externalId: id,
          name: v.name,
          extra: { carrierType: v.carrierType },
        }))
      );
    }
    if (discoveredMarketplaces.size > 0) {
      await upsertDictionary(supabase, appId, "marketplace",
        Array.from(discoveredMarketplaces.entries()).map(([id, v]) => ({
          externalId: id,
          name: v.name,
        }))
      );
    }
    if (discoveredStatuses.size > 0) {
      await upsertDictionary(supabase, appId, "status",
        Array.from(discoveredStatuses.entries()).map(([code, v]) => ({
          externalId: code,
          name: v.label,
          extra: { globalStatus: v.global },
        }))
      );
    }

    return jsonResponse({
      success: true,
      message: `Sincronização concluída. ${synced} pedidos, ${errors} erros.`,
      syncedOrders: synced,
      errors,
      dictionaries: {
        carriers: discoveredCarriers.size,
        marketplaces: discoveredMarketplaces.size,
        statuses: discoveredStatuses.size,
      },
    });
  } catch (error: any) {
    return jsonResponse({ error: error.message || "Erro ao sincronizar dados." }, 500);
  }
});
