import { getAdapter } from "../shared/adapters/registry.ts";
import {
  getClient,
  upsertInvoice, upsertInvoiceItems, upsertProduct,
  loadAppDictionary, isDictionaryStale, syncAppDictionaries,
  handleCors, jsonResponse,
} from "../shared/db.ts";
import { enrichOrderWithDetail, orderNeedsDetailFetch } from "../shared/order-enrichment.ts";

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function syncApp(
  supabase: any,
  controller: ReadableStreamDefaultController,
  enc: TextEncoder,
  app: any,
  clientId: string,
  adapter: any,
  accessToken: string,
  providerName: string,
  appDict: any,
  dateFrom?: string,
  dateTo?: string,
  rateLimitMs = 500,
) {
  const sales = supabase.schema("sales");
  let synced = 0;
  let errors = 0;
  let page = 1;
  let hasMore = true;

  controller.enqueue(enc.encode(sse("app_start", {
    appId: app.id, clientId, clientName: app.client_name,
    provider: providerName, dateFrom, dateTo,
  })));

  while (hasMore) {
    try {
      const result = await adapter.fetchOrders(accessToken, { fromDate: dateFrom, toDate: dateTo, page });
      const orders = result.orders || [];
      hasMore = result.hasMore ?? false;
      const batch: Array<{ number: string; status: string }> = [];

      const extIds = orders.map((o: { externalId: string }) => String(o.externalId));
      const existingByExtId = new Map<string, { raw_payload: Record<string, unknown> | null }>();
      if (extIds.length > 0) {
        const { data: existing } = await sales
          .from("invoices")
          .select("external_id, raw_payload")
          .eq("app_id", app.id)
          .in("external_id", extIds);
        if (existing) {
          for (const inv of existing) {
            existingByExtId.set(inv.external_id, { raw_payload: inv.raw_payload });
          }
        }
      }

      for (const order of orders) {
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
          await upsertInvoice(supabase, clientId, app.id, fullOrder, appDict);
          for (const it of fullOrder.items) {
            await upsertProduct(supabase, clientId, app.id, it);
          }
          await upsertInvoiceItems(supabase, extId, fullOrder.items);
          batch.push({ number: fullOrder.invoiceNumber || extId, status: "synced" });
          synced++;
        } catch (err: any) {
          errors++;
          console.error(`[erp-stream-sync] Erro pedido ${order.externalId}: ${err.message}`);
        }

        if (batch.length % 5 === 0 && batch.length > 0) {
          controller.enqueue(enc.encode(sse("batch", {
            appId: app.id, page, synced, errors,
            items: batch.slice(-5),
          })));
        }
      }

      controller.enqueue(enc.encode(sse("page", {
        appId: app.id, page, synced, errors,
        totalInPage: orders.length, hasMore,
      })));

      page++;
      if (hasMore) {
        await new Promise((r) => setTimeout(r, rateLimitMs));
      }
    } catch (err: any) {
      errors++;
      console.error(`[erp-stream-sync] Erro página ${page} app ${app.id}: ${err.message}`);
      hasMore = false;
      controller.enqueue(enc.encode(sse("error", { appId: app.id, page, message: err.message })));
    }
  }

  controller.enqueue(enc.encode(sse("app_complete", {
    appId: app.id, clientId, synced, errors, pages: page - 1,
  })));
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const { clientIds, dateFrom, dateTo } = await req.json();
  if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
    return jsonResponse({ error: "clientIds é obrigatório." }, 400);
  }

  const supabase = getClient(req);
  const integration = supabase.schema("integration");

  const { data: apps, error: appsError } = await integration
    .from("client_applications")
    .select(`
      id, client_id, status,
      erp_providers!provider_id(name),
      tokens(access_token, refresh_token),
      credentials(client_identifier, client_secret)
    `)
    .in("client_id", clientIds)
    .eq("status", "active");

  if (appsError || !apps?.length) {
    return jsonResponse({ error: "Nenhuma app ativa encontrada." }, 400);
  }

  const core = supabase.schema("core");
  const { data: clientNames } = await core
    .from("clients")
    .select("id, name")
    .in("id", clientIds);

  const clientNameMap = new Map((clientNames || []).map((c: any) => [c.id, c.name]));

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(enc.encode(sse("start", {
        apps: apps.map((a: any) => ({ appId: a.id, clientId: a.client_id, clientName: clientNameMap.get(a.client_id) })),
        dateFrom, dateTo,
      })));

      for (const app of apps) {
        try {
          if (app.status !== "active" || !app.tokens?.access_token) {
            controller.enqueue(enc.encode(sse("app_error", {
              appId: app.id, clientId: app.client_id,
              message: "App não ativa ou sem token",
            })));
            continue;
          }

          const adapter = getAdapter(app.erp_providers?.name || "");
          const accessToken = app.tokens.access_token;
          const providerName = app.erp_providers?.name || "unknown";
          const sales = supabase.schema("sales");

          if (await isDictionaryStale(supabase, app.id)) {
            const { data: existingServices } = await sales
              .from("erp_shipping_services")
              .select("service_external_id")
              .eq("app_id", app.id);
            const knownServiceIds = new Set((existingServices || []).map((s: any) => s.service_external_id));
            try {
              await syncAppDictionaries(supabase, app.id, providerName, accessToken, knownServiceIds);
            } catch { /* opcional */ }
          }

          const appDict = await loadAppDictionary(supabase, app.id, providerName);
          const rateLimitMs = Number(Deno.env.get("SYNC_RATE_LIMIT_MS") || "500");

          await syncApp(supabase, controller, enc, app, app.client_id, adapter, accessToken, providerName, appDict, dateFrom, dateTo, rateLimitMs);
        } catch (err: any) {
          console.error(`[erp-stream-sync] Erro app ${app.id}: ${err.message}`);
          controller.enqueue(enc.encode(sse("app_error", {
            appId: app.id, clientId: app.client_id,
            message: err.message,
          })));
        }
      }

      controller.enqueue(enc.encode(sse("complete", {})));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
});
