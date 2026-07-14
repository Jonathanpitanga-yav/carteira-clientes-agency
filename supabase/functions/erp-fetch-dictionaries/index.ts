import { getClient, jsonResponse, handleCors } from "../shared/db.ts";

const BLING_LOGISTICAS = "https://www.bling.com.br/Api/v3/logisticas";
const SITUACAO_TO_GLOBAL: Record<string, string> = {
  "0": "draft", "1": "approved", "2": "cancelled", "3": "returned",
  "4": "invoiced", "5": "shipped", "6": "delivered", "7": "ready_to_ship",
  "9": "pending",
};
const STATUS_LABELS: Record<string, string> = {
  "0": "Rascunho", "1": "Aprovada", "2": "Cancelada", "3": "Devolvida",
  "4": "Faturada", "5": "Enviada", "6": "Entregue", "7": "Pronto Envio",
  "9": "Pendente",
};

async function fetchWithTimeout(url: string, token: string, ms = 20000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: c.signal });
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const supabase = getClient(req);
    const { data: apps, error } = await supabase
      .schema("integration")
      .from("client_applications")
      .select(`id, client_id, tokens(access_token)`)
      .eq("status", "active")
      .in("provider_id", supabase.schema("integration").from("erp_providers").select("id").eq("name", "bling"));

    if (error) throw new Error(`Error fetching apps: ${error.message}`);
    if (!apps || apps.length === 0) return jsonResponse({ message: "No active bling apps" });

    let updated = 0;
    for (const app of apps) {
      const token = app.tokens?.access_token;
      if (!token) continue;

      const logRes = await fetchWithTimeout(BLING_LOGISTICAS, token);
      const logBody = await logRes.json();
      const logisticas: any[] = logBody.data || [];

      const statuses = Object.entries(SITUACAO_TO_GLOBAL).map(([code, global]) => ({
        externalId: code, name: STATUS_LABELS[code] || code, extra: { globalStatus: global },
      }));

      if (statuses.length > 0) {
        const { error: se } = await supabase.rpc("upsert_dictionary", {
          p_app_id: app.id, p_type: "status", p_items: statuses,
        });
        if (se) console.error(`Status error for ${app.id}:`, se);
      }

      const carriers = logisticas.map((l: any) => ({
        externalId: String(l.id), name: l.descricao || "", extra: { carrierType: l.tipoIntegracao, services: l.servicos || [] },
      }));
      if (carriers.length > 0) {
        const { error: ce } = await supabase.rpc("upsert_dictionary", {
          p_app_id: app.id, p_type: "carrier", p_items: carriers,
        });
        if (ce) console.error(`Carrier error for ${app.id}:`, ce);
      }

      updated++;
    }
    return jsonResponse({ success: true, apps_updated: updated });
  } catch (err: any) {
    console.error("Error:", err);
    return jsonResponse({ error: err.message }, 500);
  }
});