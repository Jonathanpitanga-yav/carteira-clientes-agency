import { getAdapter } from "../shared/adapters/registry.ts";
import { getIntegrationClient, enqueueRetry, saveTokens, handleCors, jsonResponse } from "../shared/db.ts";

function log(step: string, data: Record<string, unknown> = {}) {
  console.log(`[erp-refresh-token] ${step}`, JSON.stringify(data));
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabase = getIntegrationClient(req);

    const { data: expiringTokens, error: queryError } = await supabase
      .from("tokens")
      .select(`
        app_id,
        access_token,
        refresh_token,
        client_applications!inner(
          client_id,
          provider_id,
          erp_providers!provider_id(name),
          credentials(client_identifier, client_secret)
        )
      `)
      .or("expires_at.lte.now,expires_at.is.null")
      .limit(50);

    if (queryError) {
      log("query_error", { error: queryError.message });
      return jsonResponse({ error: `Erro ao buscar tokens: ${queryError.message}` }, 500);
    }

    if (!expiringTokens || expiringTokens.length === 0) {
      log("no_tokens_to_renew");
      return jsonResponse({ message: "Nenhum token para renovar.", renewed: 0 });
    }

    log("tokens_found", { count: expiringTokens.length });

    let renewed = 0;
    let failed = 0;

    for (const row of expiringTokens) {
      try {
        const app = row.client_applications as any;
        const providerName = app.erp_providers?.name;

        log("processing_token", { appId: row.app_id, provider: providerName });

        const adapter = getAdapter(providerName || "");

        if (!row.refresh_token) {
          log("no_refresh_token", { appId: row.app_id });
          await enqueueRetry(supabase, "erp_token_retry", row.app_id, "Sem refresh_token disponível");
          await supabase.from("client_applications").update({ status: "error" }).eq("id", row.app_id);
          failed++;
          continue;
        }

        const credentials = {
          clientId: app.credentials?.client_identifier,
          clientSecret: app.credentials?.client_secret,
        };

        log("refreshing_token", { appId: row.app_id, provider: providerName });

        const tokenResponse = await adapter.refreshToken(row.refresh_token, credentials);

        log("token_refreshed", {
          appId: row.app_id,
          hasAccessToken: !!tokenResponse.accessToken,
          hasRefreshToken: !!tokenResponse.refreshToken,
          expiresIn: tokenResponse.expiresIn,
        });

        await saveTokens(
          supabase,
          row.app_id,
          tokenResponse.accessToken,
          tokenResponse.refreshToken,
          tokenResponse.expiresIn,
          tokenResponse.rawResponse,
        );

        await supabase.from("client_applications").update({ status: "active" }).eq("id", row.app_id);
        renewed++;
      } catch (err: any) {
        failed++;
        log("refresh_failed", { appId: row.app_id, error: err.message, stack: err.stack });
        await enqueueRetry(supabase, "erp_token_retry", row.app_id, err.message, {
          provider: (row.client_applications as any)?.erp_providers?.name,
        });
        await supabase.from("client_applications").update({ status: "error" }).eq("id", row.app_id);
      }
    }

    log("refresh_complete", { renewed, failed });

    return jsonResponse({
      message: `Tokens renovados: ${renewed}, falhas: ${failed}`,
      renewed,
      failed,
    });
  } catch (error: any) {
    log("fatal_error", { error: error.message, stack: error.stack });
    return jsonResponse({ error: error.message || "Erro na renovação de tokens." }, 500);
  }
});
