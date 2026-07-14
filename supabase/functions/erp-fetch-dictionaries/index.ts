import { getAdapter } from "../shared/adapters/registry.ts";
import {
  getIntegrationClient, upsertDictionary,
  handleCors, jsonResponse,
} from "../shared/db.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { appId } = await req.json();

    if (!appId) {
      return jsonResponse({ error: "appId é obrigatório." }, 400);
    }

    const supabase = getIntegrationClient(req);

    const { data: app, error: appError } = await supabase
      .from("client_applications")
      .select(`
        id, client_id, status,
        erp_providers!provider_id(name),
        tokens(access_token)
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

    if (!adapter.fetchDictionaries) {
      return jsonResponse({
        success: true,
        message: "Adaptador não suporta fetchDictionaries.",
        carriers: 0,
        marketplaces: 0,
        statuses: 0,
      });
    }

    const accessToken = app.tokens?.access_token;
    if (!accessToken) {
      return jsonResponse({ error: "Nenhum token de acesso encontrado." }, 400);
    }

    const dictionaries = await adapter.fetchDictionaries(accessToken, appId);

    const results = {
      carriers: 0,
      marketplaces: 0,
      statuses: 0,
    };

    if (dictionaries.carriers.length > 0) {
      await upsertDictionary(
        supabase, appId, "carrier",
        dictionaries.carriers.map((c) => ({
          externalId: c.externalId,
          name: c.name,
          extra: {
            carrierType: c.carrierType,
            services: c.services || [],
          },
        }))
      );
      results.carriers = dictionaries.carriers.length;
    }

    if (dictionaries.marketplaces.length > 0) {
      await upsertDictionary(
        supabase, appId, "marketplace",
        dictionaries.marketplaces.map((m) => ({
          externalId: m.externalId,
          name: m.name,
        }))
      );
      results.marketplaces = dictionaries.marketplaces.length;
    }

    if (dictionaries.statuses.length > 0) {
      await upsertDictionary(
        supabase, appId, "status",
        dictionaries.statuses.map((s) => ({
          externalId: s.erpStatusCode,
          name: s.erpStatusLabel,
          extra: { globalStatus: s.globalStatus },
        }))
      );
      results.statuses = dictionaries.statuses.length;
    }

    return jsonResponse({
      success: true,
      message: "Dicionários atualizados com sucesso.",
      ...results,
    });
  } catch (error: any) {
    return jsonResponse(
      { error: error.message || "Erro ao buscar dicionários." },
      500
    );
  }
});
