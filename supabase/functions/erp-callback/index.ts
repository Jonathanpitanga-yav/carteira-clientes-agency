import { getAdapter } from "../shared/adapters/registry.ts";
import { getIntegrationClient, getAppCredentials, saveTokens, handleCors, jsonResponse } from "../shared/db.ts";

const APP_URL = Deno.env.get("APP_URL") || "https://web-5q2psuj32-jonathanpitanga-yavs-projects.vercel.app";

function log(step: string, data: Record<string, unknown> = {}) {
  console.log(`[erp-callback] ${step}`, JSON.stringify(data));
}

function htmlResponse(title: string, message: string, isError = false): Response {
  const color = isError ? "bg-red-600" : "bg-emerald-600";
  const icon = isError ? "✕" : "✓";
  const appUrl = `${APP_URL}/admin/connected-apps`;
  return new Response(
    `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
  .card { background: white; border-radius: 12px; padding: 40px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.1); max-width: 420px; }
  .icon { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 24px; color: white; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: #666; margin: 0 0 24px; font-size: 14px; }
  a { display: inline-block; padding: 10px 24px; border-radius: 8px; text-decoration: none; color: white; font-weight: 500; }
</style>
</head>
<body>
<div class="card">
  <div class="icon ${color}">${icon}</div>
  <h1>${title}</h1>
  <p>${message}</p>
  <a href="${appUrl}" style="background:${isError ? "#dc2626" : "#059669"}">Ir para Aplicativos Conectados</a>
</div>
<script>setTimeout(() => { window.location.href = '${appUrl}'; }, 5000);</script>
</body>
</html>`,
    {
      status: isError ? 400 : 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const url = new URL(req.url);
  const supabase = getIntegrationClient(req);

  log("request", { method: req.method, path: url.pathname, search: url.search });

  // GET /erp-callback?action=authorize&app_id=xxx&provider=bling
  if (req.method === "GET" && url.searchParams.get("action") === "authorize") {
    try {
      const appId = url.searchParams.get("app_id");
      const provider = url.searchParams.get("provider");

      log("authorize_start", { appId, provider });

      if (!appId || !provider) {
        return jsonResponse({ error: "app_id e provider são obrigatórios." }, 400);
      }

      const adapter = getAdapter(provider);

      const { data: app, error: appErr } = await supabase
        .from("client_applications")
        .select(`
          id, client_id,
          erp_providers!provider_id(name),
          credentials(client_identifier)
        `)
        .eq("id", appId)
        .single();

      if (appErr || !app) {
        log("authorize_app_not_found", { appId, error: appErr?.message });
        return jsonResponse({ error: "Aplicação não encontrada." }, 404);
      }

      const clientId = (app.credentials as any)?.client_identifier;
      if (!clientId) {
        log("authorize_no_client_id", { appId });
        return jsonResponse({ error: "Client ID não configurado. Insira as credenciais primeiro." }, 400);
      }

      const functionUrl = `${url.origin}/erp-callback`;
      const authUrl = adapter.getAuthUrl(clientId, functionUrl, appId);

      log("authorize_success", { appId, provider, authUrl });

      return jsonResponse({ authUrl });
    } catch (error: any) {
      log("authorize_error", { error: error.message, stack: error.stack });
      return jsonResponse({ error: error.message }, 500);
    }
  }

  // GET /erp-callback?code=xxx&state=xxx (callback OAuth)
  try {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    log("callback_start", { code, state });

    if (!code || !state) {
      return htmlResponse("Erro na autenticação", "Parâmetros code e state são obrigatórios.", true);
    }

    const app = await getAppCredentials(supabase, state);
    const providerName = (app.erp_providers as any)?.name;

    log("callback_app_found", { appId: state, provider: providerName });

    if (!providerName) {
      return htmlResponse("Erro na autenticação", "Provedor ERP não encontrado.", true);
    }

    const adapter = getAdapter(providerName);

    const credentials = {
      clientId: (app.credentials as any)?.client_identifier,
      clientSecret: (app.credentials as any)?.client_secret,
    };

    log("callback_exchanging", { provider: providerName, hasClientId: !!credentials.clientId });

    const functionUrl = `${url.origin}/erp-callback`;
    const tokenResponse = await adapter.exchangeCodeForToken(code, functionUrl, credentials);

    log("callback_token_received", {
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

    await supabase
      .from("client_applications")
      .update({ status: "active" })
      .eq("id", app.id);

    log("callback_success", { appId: app.id, provider: providerName });

    return htmlResponse(
      "Autenticação concluída!",
      `Integração com ${adapter.name} configurada com sucesso. Você será redirecionado em 5 segundos.`,
    );
  } catch (error: any) {
    log("callback_error", { error: error.message, stack: error.stack });
    return htmlResponse(
      "Erro na autenticação",
      error.message || "Erro no callback de autenticação.",
      true,
    );
  }
});
