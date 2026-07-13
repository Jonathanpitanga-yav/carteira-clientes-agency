import { getAdapter } from "../shared/adapters/registry.ts";
import { getIntegrationClient, enqueueRetry, saveTokens, handleCors, jsonResponse } from "../shared/db.ts";

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
      return jsonResponse({ error: `Erro ao buscar tokens: ${queryError.message}` }, 500);
    }

    if (!expiringTokens || expiringTokens.length === 0) {
      return jsonResponse({ message: "Nenhum token para renovar.", renewed: 0 });
    }

    let renewed = 0;
    let failed = 0;

    for (const row of expiringTokens) {
      try {
        const app = row.client_applications;
        const adapter = getAdapter(app.erp_providers?.name || "");

        if (!row.refresh_token) {
          await enqueueRetry(supabase, "erp_token_retry", row.app_id, "Sem refresh_token disponível");
          await supabase.from("client_applications").update({ status: "error" }).eq("id", row.app_id);
          failed++;
          continue;
        }

        const credentials = {
          clientId: app.credentials?.client_identifier,
          clientSecret: app.credentials?.client_secret,
        };

        const tokenResponse = await adapter.refreshToken(row.refresh_token, credentials);

        await saveTokens(
          supabase,
          row.app_id,
          tokenResponse.accessToken,
          tokenResponse.refreshToken,
          tokenResponse.expiresIn,
          tokenResponse.rawResponse
        );

        await supabase.from("client_applications").update({ status: "active" }).eq("id", row.app_id);
        renewed++;
      } catch (err: any) {
        failed++;
        console.error(`Falha ao renovar token ${row.app_id}: ${err.message}`);
        await enqueueRetry(supabase, "erp_token_retry", row.app_id, err.message, {
          provider: row.client_applications?.erp_providers?.name,
        });
        await supabase.from("client_applications").update({ status: "error" }).eq("id", row.app_id);
      }
    }

    return jsonResponse({
      message: `Tokens renovados: ${renewed}, falhas: ${failed}`,
      renewed,
      failed,
    });
  } catch (error: any) {
    return jsonResponse({ error: error.message || "Erro na renovação de tokens." }, 500);
  }
});
