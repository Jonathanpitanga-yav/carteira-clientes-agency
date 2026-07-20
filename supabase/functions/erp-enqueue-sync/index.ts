import { getClient, handleCors, jsonResponse } from "../shared/db.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { clientIds, dateFrom, dateTo } = await req.json();
    console.log(`[erp-enqueue-sync] Recebido clientIds:`, JSON.stringify(clientIds), `dateFrom:`, dateFrom, `dateTo:`, dateTo);

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return jsonResponse({ error: "clientIds é obrigatório." }, 400);
    }

    const supabase = getClient(req);
    const integration = supabase.schema("integration");

    const { data: apps, error: appsError } = await integration
      .from("client_applications")
      .select("id, client_id, provider_id, erp_providers!provider_id(name)")
      .in("client_id", clientIds)
      .eq("status", "active");

    if (appsError) {
      console.error(`[erp-enqueue-sync] Erro ao buscar apps:`, appsError);
      return jsonResponse({ error: "Erro ao buscar aplicações." }, 500);
    }

    if (!apps || apps.length === 0) {
      console.log(`[erp-enqueue-sync] Nenhuma app ativa para clientIds:`, clientIds);
      return jsonResponse({ error: "Nenhuma aplicação ativa encontrada para os clientes selecionados." }, 400);
    }

    const appIds = apps.map((a: any) => a.id);
    console.log(`[erp-enqueue-sync] Apps encontradas:`, JSON.stringify(appIds));

    const { data: queueItems, error: queueError } = await supabase.rpc(
      "enqueue_sync",
      { p_app_ids: appIds, p_date_from: dateFrom || null, p_date_to: dateTo || null }
    );

    if (queueError) {
      console.error(`[erp-enqueue-sync] Erro no RPC enqueue_sync:`, queueError);
      return jsonResponse({ error: `Erro ao enfileirar sincronização: ${queueError.message}` }, 500);
    }

    console.log(`[erp-enqueue-sync] Sucesso: ${queueItems?.length || 0} itens enfileirados`);
    return jsonResponse({
      success: true,
      message: `${queueItems?.length || 0} sincronizações enfileiradas.`,
      queueItems: queueItems || [],
      apps: apps.map((a: any) => ({
        appId: a.id,
        clientId: a.client_id,
        provider: a.erp_providers?.name,
      })),
    });
  } catch (error: any) {
    console.error(`[erp-enqueue-sync] Erro inesperado:`, error);
    return jsonResponse({ error: error.message || "Erro ao enfileirar sincronização." }, 500);
  }
});
