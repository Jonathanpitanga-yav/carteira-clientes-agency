import { getAdapter } from "../shared/adapters/registry.ts";
import {
  getClient,
  getIntegrationClient,
  resolveCompanyMapping,
  enqueueWebhookInvoice,
  createAuditLog,
  handleCors,
  jsonResponse,
} from "../shared/db.ts";

function detectProvider(payload: Record<string, unknown>, headers: Record<string, string>): string | null {
  const fromHeader = headers["x-erp-provider"] || headers["x-provider"];
  if (fromHeader) return fromHeader.toLowerCase();

  if (payload.companyId != null && payload.event != null) return "bling";
  if (payload.situacao != null || payload.idPedido != null) return "tiny";

  return null;
}

function normalizeHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  return headers;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, 405);
  }

  const startedAt = Date.now();

  try {
    const rawBody = await req.text();
    const headers = normalizeHeaders(req);

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: "JSON inválido." }, 400);
    }

    const provider = detectProvider(payload, headers);
    if (!provider) {
      return jsonResponse({ error: "Não foi possível identificar o provedor ERP." }, 400);
    }

    const adapter = getAdapter(provider);
    const companyExternalId = adapter.extractCompanyId(payload);
    const idempotencyKey = adapter.buildIdempotencyKey(payload);
    const eventType = typeof payload.event === "string"
      ? payload.event
      : payload.situacao != null
      ? String(payload.situacao)
      : null;

    const supabase = getClient(req);
    const integration = getIntegrationClient(req);

    let appId: string | null = null;
    let clientId: string | null = null;
    let queueStatus = "pending";

    if (companyExternalId) {
      const mapping = await resolveCompanyMapping(supabase, provider, companyExternalId);
      if (mapping) {
        appId = mapping.app_id;
        clientId = mapping.client_id;

        const { data: cred } = await integration
          .from("credentials")
          .select("client_secret")
          .eq("app_id", appId)
          .maybeSingle();

        const clientSecret = cred?.client_secret;
        if (!clientSecret) {
          return jsonResponse({ error: "Credenciais não configuradas para a aplicação." }, 401);
        }

        const valid = await adapter.verifyWebhookSignature(rawBody, headers, clientSecret);
        if (!valid) {
          await createAuditLog(
            supabase,
            "webhook.signature_invalid",
            appId,
            provider,
            { companyExternalId, eventType },
            { category: "queues" },
          );
          return jsonResponse({ error: "Assinatura inválida." }, 401);
        }
      } else {
        queueStatus = "unmapped";
        await createAuditLog(
          supabase,
          "webhook.unmapped_company",
          null,
          provider,
          { companyExternalId, eventType },
          { category: "queues" },
        );
      }
    } else {
      queueStatus = "unmapped";
      await createAuditLog(
        supabase,
        "webhook.missing_company_id",
        null,
        provider,
        { eventType },
        { category: "queues" },
      );
    }

    const queueId = await enqueueWebhookInvoice(supabase, {
      appId,
      clientId,
      provider,
      companyExternalId,
      eventType,
      idempotencyKey,
      payload,
      headers,
      status: queueStatus,
    });

    const elapsedMs = Date.now() - startedAt;
    return jsonResponse({
      success: true,
      queued: true,
      queueId,
      duplicate: queueId === null,
      status: queueStatus,
      elapsedMs,
    });
  } catch (error: any) {
    console.error("[erp-webhook] Erro na ingestão:", error);
    return jsonResponse(
      { error: error.message || "Erro ao enfileirar webhook." },
      500,
    );
  }
});
