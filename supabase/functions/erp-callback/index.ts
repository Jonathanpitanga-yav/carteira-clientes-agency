import { getAdapter } from "../shared/adapters/registry.ts";
import { getIntegrationClient, getAppCredentials, saveTokens, handleCors, jsonResponse } from "../shared/db.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const supabase = getIntegrationClient(req);

  // GET /erp-callback?action=authorize&app_id=xxx&provider=bling
  if (req.method === "GET" && url.searchParams.get("action") === "authorize") {
    try {
      const appId = url.searchParams.get("app_id");
      const provider = url.searchParams.get("provider");

      if (!appId || !provider) {
        return jsonResponse({ error: "app_id e provider são obrigatórios." }, 400);
      }

      const adapter = getAdapter(provider);

      const { data: app } = await supabase
        .from("client_applications")
        .select(`
          id, client_id,
          erp_providers!provider_id(name),
          credentials(client_identifier)
        `)
        .eq("id", appId)
        .single();

      if (!app) {
        return jsonResponse({ error: "Aplicação não encontrada." }, 404);
      }

      const clientId = app.credentials?.client_identifier;
      if (!clientId) {
        return jsonResponse({ error: "Client ID não configurado. Insira as credenciais primeiro." }, 400);
      }

      const redirectUri = `${url.origin}/erp-callback`;
      const authUrl = adapter.getAuthUrl(clientId, redirectUri, appId);

      return jsonResponse({ authUrl });
    } catch (error: any) {
      return jsonResponse({ error: error.message }, 500);
    }
  }

  // GET /erp-callback?code=xxx&state=xxx (callback OAuth)
  try {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return jsonResponse({ error: "Parâmetros code e state são obrigatórios." }, 400);
    }

    const app = await getAppCredentials(supabase, state);
    const providerName = app.erp_providers?.name;

    if (!providerName) {
      return jsonResponse({ error: "Provedor ERP não encontrado." }, 400);
    }

    const adapter = getAdapter(providerName);

    const credentials = {
      clientId: app.credentials?.client_identifier,
      clientSecret: app.credentials?.client_secret,
    };

    const redirectUri = `${url.origin}/erp-callback`;
    const tokenResponse = await adapter.exchangeCodeForToken(code, redirectUri, credentials);

    await saveTokens(
      supabase,
      app.id,
      tokenResponse.accessToken,
      tokenResponse.refreshToken,
      tokenResponse.expiresIn,
      tokenResponse.rawResponse
    );

    await supabase
      .from("client_applications")
      .update({ status: "active" })
      .eq("id", app.id);

    return jsonResponse({
      success: true,
      message: `Integração com ${adapter.name} configurada com sucesso.`,
      data: { expiresIn: tokenResponse.expiresIn },
    });
  } catch (error: any) {
    return jsonResponse(
      { success: false, error: error.message || "Erro no callback de autenticação." },
      500
    );
  }
});
