import {
  getClient,
  loadAppDictionary, isDictionaryStale, syncAppDictionaries,
  handleCors, jsonResponse,
} from "../shared/db.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabase = getClient(req);
    const body = await req.json().catch(() => ({}));
    const targetAppId = body.appId as string | undefined;

    const integration = supabase.schema("integration");
    let query = integration
      .from("client_applications")
      .select(`
        id, client_id, status,
        erp_providers!provider_id(name),
        tokens(access_token)
      `)
      .eq("status", "active");

    if (targetAppId) {
      query = query.eq("id", targetAppId);
    }

    const { data: apps, error } = await query;
    if (error) throw new Error(`Erro ao buscar apps: ${error.message}`);
    if (!apps || apps.length === 0) {
      return jsonResponse({ success: true, message: "Nenhuma app ativa encontrada.", apps_updated: 0 });
    }

    const results: Array<{ app_id: string; provider: string; dictionaries: Record<string, number> }> = [];

    for (const app of apps) {
      const token = app.tokens?.access_token;
      const provider = app.erp_providers?.name || "unknown";
      if (!token) continue;

      const sales = supabase.schema("sales");
      const { data: existingServices } = await sales
        .from("erp_shipping_services")
        .select("service_external_id")
        .eq("app_id", app.id);
      const knownServiceIds = new Set((existingServices || []).map((s: any) => s.service_external_id));

      const dictResult = await syncAppDictionaries(supabase, app.id, provider, token, knownServiceIds);
      results.push({ app_id: app.id, provider, dictionaries: dictResult });
    }

    return jsonResponse({ success: true, apps_updated: results.length, results });
  } catch (err: any) {
    console.error("[erp-fetch-dictionaries] Error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
});
