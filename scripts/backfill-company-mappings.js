/**
 * Backfill integration.erp_company_mappings para apps já conectadas.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-company-mappings.js
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

async function fetchCompanyProfile(provider, accessToken) {
  if (provider === "bling") {
    const res = await fetch("https://www.bling.com.br/Api/v3/empresas/dados-basicos", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Bling HTTP ${res.status}`);
    const body = await res.json();
    const company = body.data || body;
    return {
      companyExternalId: String(company.id ?? company.companyId),
      companyName: company.nome || company.razaoSocial,
    };
  }

  if (provider === "tiny") {
    const res = await fetch("https://api.tiny.com.br/public-api/v3/empresa", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Tiny HTTP ${res.status}`);
    const body = await res.json();
    const company = body.data || body.empresa || body;
    return {
      companyExternalId: String(company.id ?? company.idEmpresa ?? company.companyId),
      companyName: company.nome || company.razaoSocial,
    };
  }

  throw new Error(`Provider não suportado: ${provider}`);
}

async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${path} HTTP ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function main() {
  const apps = await supabaseFetch(
    "client_applications?select=id,client_id,status,erp_providers(name)&status=eq.active",
    { headers: { "Accept-Profile": "integration" } },
  );

  console.log(`Apps ativas: ${apps.length}`);

  for (const app of apps) {
    const provider = app.erp_providers?.name;
    if (!provider || !["bling", "tiny"].includes(provider)) continue;

    const tokens = await supabaseFetch(
      `tokens?select=access_token&app_id=eq.${app.id}&limit=1`,
      { headers: { "Accept-Profile": "integration" } },
    );
    const accessToken = tokens?.[0]?.access_token;
    if (!accessToken) {
      console.warn(`[skip] ${app.id} sem token`);
      continue;
    }

    try {
      const profile = await fetchCompanyProfile(provider, accessToken);
      await supabaseFetch("erp_company_mappings", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=representation",
        headers: { "Accept-Profile": "integration" },
        body: JSON.stringify({
          provider,
          company_external_id: profile.companyExternalId,
          app_id: app.id,
          client_id: app.client_id,
          company_name: profile.companyName || null,
          updated_at: new Date().toISOString(),
        }),
      });

      await fetch(`${SUPABASE_URL}/rest/v1/rpc/reprocess_unmapped_webhooks`, {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_provider: provider,
          p_company_external_id: profile.companyExternalId,
          p_app_id: app.id,
          p_client_id: app.client_id,
        }),
      });

      console.log(`[ok] ${provider} app=${app.id} company=${profile.companyExternalId}`);
    } catch (err) {
      console.error(`[fail] app=${app.id}: ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
