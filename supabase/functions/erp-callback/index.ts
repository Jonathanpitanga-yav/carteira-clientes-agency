import { getAdapter } from "../shared/adapters/registry.ts";
import { getClient, getIntegrationClient, getAppCredentials, saveTokens, createAuditLog, syncAppDictionaries, upsertCompanyMapping, handleCors, jsonResponse } from "../shared/db.ts";

const APP_URL = Deno.env.get("APP_URL") || "https://web-7dfanuxjj-jonathanpitanga-yavs-projects.vercel.app";

function log(step: string, data: Record<string, unknown> = {}) {
  console.log(`[erp-callback] ${step}`, JSON.stringify(data));
}

function redirect(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: url },
  });
}

function redirectError(appId: string | null, message: string): Response {
  const params = new URLSearchParams({ erp_callback: "error", message });
  if (appId) params.set("app_id", appId);
  return redirect(`${APP_URL}/auth/oauth-callback?${params.toString()}`);
}

function redirectSuccess(appId: string): Response {
  return redirect(`${APP_URL}/auth/oauth-callback?erp_callback=success&app_id=${appId}`);
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const supabase = getIntegrationClient(req);
  const rootClient = getClient(req);
  const audit = (event: string, appId: string | null, meta: Record<string, unknown> = {}) =>
    createAuditLog(supabase, `erp_callback.${event}`, appId, null, { ...meta, method: req.method, path: url.pathname }, { category: "credentials" });

  log("request", { method: req.method, path: url.pathname, search: url.search });

  // GET /erp-callback?action=authorize&app_id=xxx&provider=bling
  if (req.method === "GET" && url.searchParams.get("action") === "authorize") {
    try {
      const appId = url.searchParams.get("app_id");
      const provider = url.searchParams.get("provider");

      log("authorize_start", { appId, provider });
      if (!appId || !provider) {
        await audit("authorize_invalid_params", null, { appId, provider });
        return jsonResponse({ error: "app_id e provider são obrigatórios." }, 400);
      }

      const adapter = getAdapter(provider);

      const { data: appRow, error: appErr } = await supabase
        .from("client_applications")
        .select("id, client_id, provider_id")
        .eq("id", appId)
        .single();

      if (appErr || !appRow) {
        log("authorize_app_not_found", { appId, error: appErr?.message });
        await audit("authorize_app_not_found", appId, { error: appErr?.message });
        return jsonResponse({ error: "Aplicação não encontrada." }, 404);
      }

      const { data: credRow } = await supabase
        .from("credentials")
        .select("client_identifier")
        .eq("app_id", appId)
        .maybeSingle();

      log("authorize_cred_check", { appId, hasCred: !!credRow, clientId: credRow?.client_identifier });

      const clientId = credRow?.client_identifier;
      if (!clientId) {
        log("authorize_no_client_id", { appId });
        await audit("authorize_no_credentials", appId, { provider });
        return jsonResponse({ error: "Client ID não configurado. Insira as credenciais primeiro." }, 400);
      }

      const redirectUri = `https://${url.hostname}/functions/v1/erp-callback`;
      const authUrl = adapter.getAuthUrl(clientId, redirectUri, appId);

      log("authorize_success", { appId, provider, authUrl, redirectUri });
      await audit("authorize_success", appId, { provider, redirectUri });

      return jsonResponse({ authUrl });
    } catch (error: any) {
      log("authorize_error", { error: error.message, stack: error.stack });
      const appId = url.searchParams.get("app_id");
      await audit("authorize_error", appId, { error: error.message });
      return jsonResponse({ error: error.message }, 500);
    }
  }

  // GET /erp-callback?code=xxx&state=xxx (callback OAuth)
  try {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const errorParam = url.searchParams.get("error");

    log("callback_start", { code, state, errorParam });

    if (errorParam) {
      await audit("callback_provider_error", state, { error: errorParam, errorDescription: url.searchParams.get("error_description") });
      return redirectError(state, `Provedor recusou: ${errorParam}`);
    }

    if (!code || !state) {
      await audit("callback_invalid_params", null, { hasCode: !!code, hasState: !!state });
      return redirectError(null, "Parâmetros code e state são obrigatórios.");
    }

    const app = await getAppCredentials(supabase, state);
    const providerName = (app.erp_providers as any)?.name;

    log("callback_app_found", { appId: state, provider: providerName });
    await audit("callback_app_found", state, { provider: providerName });

    if (!providerName) {
      await audit("callback_provider_not_found", state);
      return redirectError(state, "Provedor ERP não encontrado.");
    }

    const adapter = getAdapter(providerName);

    const credentials = {
      clientId: (app.credentials as any)?.client_identifier,
      clientSecret: (app.credentials as any)?.client_secret,
    };

    log("callback_exchanging", { provider: providerName, hasClientId: !!credentials.clientId });
    await audit("callback_exchanging", state, { provider: providerName, hasClientId: !!credentials.clientId });

    const redirectUri = `https://${url.hostname}/functions/v1/erp-callback`;
    const tokenResponse = await adapter.exchangeCodeForToken(code, redirectUri, credentials);

    log("callback_token_received", {
      hasAccessToken: !!tokenResponse.accessToken,
      hasRefreshToken: !!tokenResponse.refreshToken,
      expiresIn: tokenResponse.expiresIn,
    });
    await audit("callback_token_received", state, {
      provider: providerName,
      hasAccessToken: !!tokenResponse.accessToken,
      hasRefreshToken: !!tokenResponse.refreshToken,
      expiresIn: tokenResponse.expiresIn,
    });

    await saveTokens(
      supabase,
      app.id,
      tokenResponse.accessToken,
      tokenResponse.refreshToken,
      tokenResponse.expiresIn,
      tokenResponse.rawResponse,
    );

    log("callback_tokens_saved", { appId: app.id });
    await audit("callback_tokens_saved", app.id, { provider: providerName });

    await supabase
      .from("client_applications")
      .update({ status: "active" })
      .eq("id", app.id);

    log("callback_success", { appId: app.id, provider: providerName });
    await audit("callback_success", app.id, { provider: providerName });

    try {
      await syncAppDictionaries(supabase, app.id, providerName, tokenResponse.accessToken, new Set());
      log("callback_dictionary_synced", { appId: app.id });
    } catch (dictErr: any) {
      log("callback_dictionary_sync_failed", { appId: app.id, error: dictErr.message });
    }

    if (adapter.fetchCompanyProfile) {
      try {
        const profile = await adapter.fetchCompanyProfile(tokenResponse.accessToken);
        await upsertCompanyMapping(
          rootClient,
          providerName,
          profile.companyExternalId,
          app.id,
          app.client_id,
          profile.companyName,
        );
        log("callback_company_mapped", {
          appId: app.id,
          companyExternalId: profile.companyExternalId,
        });
      } catch (mapErr: any) {
        log("callback_company_mapping_failed", { appId: app.id, error: mapErr.message });
      }
    }

    return redirectSuccess(app.id);
  } catch (error: any) {
    log("callback_error", { error: error.message, stack: error.stack });
    const state = url.searchParams.get("state");
    await audit("callback_error", state, { error: error.message });
    return redirectError(state, error.message || "Erro no callback de autenticação.");
  }
});
