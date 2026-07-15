import {
  getClient,
  loadAppDictionary,
  handleCors,
  jsonResponse,
} from "../shared/db.ts";
import { resolveOrderTranslations } from "../shared/translations/index.ts";
import { getAdapter } from "../shared/adapters/registry.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabase = getClient(req);
    const body = await req.json().catch(() => ({}));
    const targetAppId = body.appId as string | undefined;
    const limit = Math.min(Number(body.limit) || 300, 500);
    const offset = Math.max(Number(body.offset) || 0, 0);
    const backfillTransport = Boolean(body.backfillTransport);

    const sales = supabase.schema("sales");
    let query = sales
      .from("invoices")
      .select("id, app_id, client_id, external_id, raw_payload, erp_status_code, erp_status_label, marketplace_name, sales_channel, order_type, carrier_name, shipping_method, shipping_method_external_id, erp_marketplace_external_id")
      .not("raw_payload", "is", null)
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1);

    if (targetAppId) {
      query = query.eq("app_id", targetAppId);
    }

    const { data: invoices, error } = await query;
    if (error) throw new Error(error.message);
    if (!invoices?.length) {
      return jsonResponse({ success: true, updated: 0, message: "Nenhum pedido para retraduzir." });
    }

    const integration = supabase.schema("integration");
    let updated = 0;

    const appIds = [...new Set(invoices.map((i: any) => i.app_id))];
    const dictCache = new Map<string, Awaited<ReturnType<typeof loadAppDictionary>>>();
    const providerCache = new Map<string, string>();
    const tokenCache = new Map<string, string>();

    for (const appId of appIds) {
      const { data: appRow } = await integration
        .from("client_applications")
        .select("erp_providers!provider_id(name), tokens(access_token)")
        .eq("id", appId)
        .single();
      const provider = appRow?.erp_providers?.name || "unknown";
      providerCache.set(appId, provider);
      tokenCache.set(appId, appRow?.tokens?.access_token || "");
      dictCache.set(appId, await loadAppDictionary(supabase, appId, provider));
    }

    for (const inv of invoices) {
      const provider = providerCache.get(inv.app_id) || "unknown";
      const dict = dictCache.get(inv.app_id)!;
      const raw = inv.raw_payload;
      const accessToken = tokenCache.get(inv.app_id);

      let order: any;
      try {
        const adapter = getAdapter(provider);
        const needsTransport = backfillTransport && raw && typeof raw === "object"
          && !raw.transporte && (raw.numeroLoja || raw.loja);

        if (needsTransport && accessToken && adapter.fetchOrderById) {
          try {
            const full = await adapter.fetchOrderById(accessToken, inv.external_id);
            order = full;
          } catch {
            // fallback to raw parse
          }
        }

        if (!order && raw && typeof raw === "object" && (raw.id || raw.numeroPedido)) {
          const webhookPayload = provider === "tiny" ? raw : { data: raw };
          const parsed = await adapter.handleWebhook(webhookPayload, {});
          order = parsed.data;
        } else if (!order) {
          continue;
        }
      } catch {
        order = {
          externalId: inv.external_id,
          marketplaceId: inv.erp_marketplace_external_id,
          marketplaceName: inv.marketplace_name,
          orderType: inv.order_type,
          salesChannel: inv.sales_channel,
          carrierExternalId: undefined,
          carrierName: inv.carrier_name,
          shippingMethod: inv.shipping_method,
          shippingMethodExternalId: inv.shipping_method_external_id,
          erpStatusCode: inv.erp_status_code,
          erpStatusLabel: inv.erp_status_label,
          rawPayload: raw,
        };
      }

      const translation = resolveOrderTranslations(dict, order);
      const statusFromDict = dict.statusMappings.get(order.erpStatusCode);
      const erpStatusLabel = statusFromDict?.erp_status_label || order.erpStatusLabel || inv.erp_status_label;

      const { error: updateError } = await sales
        .from("invoices")
        .update({
          global_status: translation.globalStatus,
          global_marketplace_slug: translation.globalMarketplaceSlug,
          global_logistics_slug: translation.globalLogisticsSlug,
          global_order_type_slug: translation.globalOrderTypeSlug,
          marketplace_id: translation.marketplaceId,
          marketplace_name: order.marketplaceName || inv.marketplace_name,
          sales_channel: order.salesChannel || order.marketplaceChannel || inv.sales_channel,
          erp_marketplace_external_id: translation.erpMarketplaceExternalId,
          carrier_id: translation.carrierId,
          erp_logistics_external_id: translation.erpLogisticsExternalId,
          erp_logistics_name: translation.erpLogisticsName,
          erp_status_label: erpStatusLabel,
          freight_value: order.freightValue ?? undefined,
          shipping_method: order.shippingMethod || inv.shipping_method,
          tracking_code: order.trackingCode || undefined,
          raw_payload: order.rawPayload || raw,
          synced_at: new Date().toISOString(),
        })
        .eq("id", inv.id);

      if (!updateError) updated++;
    }

    return jsonResponse({ success: true, updated, total: invoices.length, offset, limit, hasMore: invoices.length === limit });
  } catch (err: any) {
    console.error("[erp-retranslate-invoices]", err);
    return jsonResponse({ error: err.message }, 500);
  }
});
