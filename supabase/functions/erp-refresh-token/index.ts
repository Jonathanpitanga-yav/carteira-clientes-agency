import { getAdapter } from "../shared/adapters/registry.ts";
import { getIntegrationClient, enqueueRetry, saveTokens, createAuditLog, handleCors, jsonResponse } from "../shared/db.ts";

function log(step: string, data: Record<string, unknown> = {}) {
  console.log(`[erp-refresh-token] ${step}`, JSON.stringify(data));
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const supabase = getIntegrationClient(req);
    const audit = (event: string, appId: string | null, meta: Record<string, unknown> = {}) =>
      createAuditLog(supabase, `erp_refresh.${event}`, appId, null, meta, { category: "credentials" });

    // Support single-app refresh via POST body { appId }
    let singleAppId: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        singleAppId = body?.appId || null;
      } catch {
        // not JSON or no body — proceed as batch
      }
    }

    let expiringTokens: any[];

    if (singleAppId) {
      log("single_app_refresh", { appId: singleAppId });
      const { data, error } = await supabase
        .from("tokens")
        .select("app_id, access_token, refresh_token")
        .eq("app_id", singleAppId)
        .limit(1);
      if (error) return jsonResponse({ error: error.message }, 500);
      expiringTokens = data || [];
    } else {
      const thirtyOneMinutesFromNow = new Date(Date.now() + 31 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("tokens")
        .select("app_id, access_token, refresh_token")
        .lte("expires_at", thirtyOneMinutesFromNow)
        .limit(50);
      if (error) return jsonResponse({ error: error.message }, 500);
      expiringTokens = data || [];
    }

    if (!expiringTokens || expiringTokens.length === 0) {
      const msg = singleAppId ? "Token não encontrado." : "Nenhum token para renovar.";
      log("no_tokens_to_renew", { singleAppId });
      return jsonResponse({ message: msg, renewed: 0 });
    }

    log("tokens_found", { count: expiringTokens.length, singleAppId });
    await audit(singleAppId ? "refresh_single_start" : "refresh_batch_start", singleAppId, { count: expiringTokens.length });

    let renewed = 0;
    let failed = 0;

    for (const row of expiringTokens) {
      try {
        const appId = row.app_id;
        const appRes = await supabase.from("client_applications").select("client_id, provider_id").eq("id", appId).single();
        if (appRes.error || !appRes.data) {
          log("app_not_found", { appId, error: appRes.error?.message });
          await audit("refresh_app_not_found", appId, { error: appRes.error?.message });
          failed++;
          continue;
        }
        const credRes = await supabase.from("credentials").select("client_identifier, client_secret").eq("app_id", appId).maybeSingle();
        const provRes = await supabase.from("erp_providers").select("name").eq("id", appRes.data.provider_id).single();
        const providerName = provRes.data?.name;

        log("processing_token", { appId, provider: providerName });
        await audit("refresh_processing", appId, { provider: providerName });

        const adapter = getAdapter(providerName || "");

        if (!row.refresh_token) {
          log("no_refresh_token", { appId });
          await audit("refresh_no_refresh_token", appId, { provider: providerName });
          await enqueueRetry(supabase, "erp_token_retry", appId, "Sem refresh_token disponível");
          await supabase.from("client_applications").update({ status: "error" }).eq("id", appId);
          failed++;
          continue;
        }

        const credentials = {
          clientId: credRes.data?.client_identifier,
          clientSecret: credRes.data?.client_secret,
        };

        log("refreshing_token", { appId, provider: providerName });

        const tokenResponse = await adapter.refreshToken(row.refresh_token, credentials);

        log("token_refreshed", {
          appId,
          hasAccessToken: !!tokenResponse.accessToken,
          hasRefreshToken: !!tokenResponse.refreshToken,
          expiresIn: tokenResponse.expiresIn,
        });
        await audit("refresh_success", appId, {
          provider: providerName,
          hasAccessToken: !!tokenResponse.accessToken,
          hasRefreshToken: !!tokenResponse.refreshToken,
          expiresIn: tokenResponse.expiresIn,
        });

        await saveTokens(
          supabase,
          appId,
          tokenResponse.accessToken,
          tokenResponse.refreshToken,
          tokenResponse.expiresIn,
          tokenResponse.rawResponse,
        );

        await supabase.from("client_applications").update({ status: "active" }).eq("id", appId);
        renewed++;
      } catch (err: any) {
        failed++;
        log("refresh_failed", { appId: row.app_id, error: err.message, stack: err.stack });
        await audit("refresh_failed", row.app_id, { error: err.message });
        await enqueueRetry(supabase, "erp_token_retry", row.app_id, err.message);
        await supabase.from("client_applications").update({ status: "error" }).eq("id", row.app_id);
      }
    }

    log("refresh_complete", { renewed, failed, singleAppId });
    await audit(singleAppId ? "refresh_single_complete" : "refresh_batch_complete", singleAppId, { renewed, failed, total: expiringTokens.length });

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
