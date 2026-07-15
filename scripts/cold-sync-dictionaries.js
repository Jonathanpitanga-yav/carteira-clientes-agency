/**
 * Cold sync: fetch ERP dictionaries via API and upsert via Supabase SQL (MCP).
 * Tokens passed via env vars (never logged).
 */
const https = require("https");

const APPS = [
  {
    appId: "594b3e65-05c2-457b-a0a1-ff638078f97c",
    provider: "bling",
    tokenEnv: "BLING_TOKEN",
  },
  {
    appId: "259c7e46-990e-445a-b246-260b09b03b08",
    provider: "tiny",
    tokenEnv: "TINY_TOKEN",
  },
];

const BLING_STATUS = {
  "0": ["draft", "Rascunho"],
  "1": ["approved", "Aprovada"],
  "2": ["canceled", "Cancelada"],
  "3": ["refunded", "Devolvida"],
  "4": ["invoiced", "Faturada"],
  "5": ["shipped", "Enviada"],
  "6": ["delivered", "Entregue"],
  "7": ["shipped", "Pronto Envio"],
  "9": ["pending", "Pendente"],
  "10": ["canceled", "Cancelado"],
  "11": ["refunded", "Devolvido"],
  "12": ["shipped", "Atendido"],
};

const TINY_STATUS = {
  "0": ["pending", "Aberta"],
  "1": ["invoiced", "Faturada"],
  "2": ["canceled", "Cancelada"],
  "3": ["approved", "Aprovada"],
  "4": ["in_production", "Preparando Envio"],
  "5": ["shipped", "Enviada"],
  "6": ["delivered", "Entregue"],
  "7": ["shipped", "Pronto Envio"],
  "8": ["draft", "Dados Incompletos"],
  "9": ["pending", "Não Entregue"],
};

function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : require("http");
    lib
      .get(url, { headers }, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      })
      .on("error", reject);
  });
}

function esc(s) {
  return String(s ?? "").replace(/'/g, "''");
}

function sqlUpsertStatuses(appId, provider, statusMap) {
  const rows = Object.entries(statusMap).map(([code, [global, label]]) =>
    `('${appId}', '${esc(code)}', '${esc(label)}', '${esc(global)}')`
  );
  if (!rows.length) return "";
  return `
INSERT INTO sales.erp_status_mappings (app_id, erp_status_code, erp_status_label, global_status)
VALUES ${rows.join(",\n")}
ON CONFLICT (app_id, erp_status_code) DO UPDATE SET
  erp_status_label = EXCLUDED.erp_status_label,
  global_status = EXCLUDED.global_status;
`;
}

function sqlUpsertCarriers(appId, carriers) {
  if (!carriers.length) return "";
  const rows = carriers.map(
    (c) =>
      `('${appId}', '${esc(c.externalId)}', '${esc(c.name)}', ${c.carrierType ? `'${esc(c.carrierType)}'` : "NULL"}, ${c.carrierType ? `'${esc(c.carrierType)}'` : "NULL"}, 'logistics_integration', NOW())`
  );
  return `
INSERT INTO sales.erp_carriers (app_id, external_id, name, carrier_type, provider_logistics_type, source_kind, updated_at)
VALUES ${rows.join(",\n")}
ON CONFLICT (app_id, external_id) DO UPDATE SET
  name = EXCLUDED.name,
  carrier_type = EXCLUDED.carrier_type,
  provider_logistics_type = EXCLUDED.provider_logistics_type,
  updated_at = NOW();
`;
}

function sqlUpsertShippingServices(appId, services) {
  if (!services.length) return "";
  const rows = services.map((s) => {
    const aliases = (s.aliases || []).map((a) => `'${esc(a)}'`).join(",") || "";
    return `('${appId}', '${esc(s.externalId)}', '${esc(s.name)}', ${s.logisticsExternalId ? `'${esc(s.logisticsExternalId)}'` : "NULL"}, ${s.providerLogisticsType ? `'${esc(s.providerLogisticsType)}'` : "NULL"}, ARRAY[${aliases}]::text[], NOW())`;
  });
  return `
INSERT INTO sales.erp_shipping_services (app_id, service_external_id, name, logistics_external_id, provider_logistics_type, aliases, updated_at)
VALUES ${rows.join(",\n")}
ON CONFLICT (app_id, service_external_id) DO UPDATE SET
  name = EXCLUDED.name,
  logistics_external_id = EXCLUDED.logistics_external_id,
  provider_logistics_type = EXCLUDED.provider_logistics_type,
  aliases = EXCLUDED.aliases,
  updated_at = NOW();
`;
}

function sqlMarkSynced(appId) {
  return `
INSERT INTO integration.dictionary_sync_state (app_id, last_synced_at, sync_status, ttl_days, updated_at)
VALUES ('${appId}', NOW(), 'ok', 7, NOW())
ON CONFLICT (app_id) DO UPDATE SET
  last_synced_at = NOW(),
  sync_status = 'ok',
  last_error = NULL,
  updated_at = NOW();
`;
}

async function syncBling(appId, token) {
  const [logRes, svcRes] = await Promise.all([
    fetchJson("https://www.bling.com.br/Api/v3/logisticas", {
      Authorization: `Bearer ${token}`,
    }),
    fetchJson("https://www.bling.com.br/Api/v3/logisticas/servicos", {
      Authorization: `Bearer ${token}`,
    }),
  ]);

  if (logRes.status !== 200) throw new Error(`Bling logisticas HTTP ${logRes.status}`);
  if (svcRes.status !== 200) throw new Error(`Bling servicos HTTP ${svcRes.status}`);

  const logisticas = logRes.body.data || [];
  const servicos = svcRes.body.data || [];
  const logisticsById = new Map(logisticas.map((l) => [String(l.id), l]));

  const carriers = logisticas.map((l) => ({
    externalId: String(l.id),
    name: l.descricao || "",
    carrierType: l.tipoIntegracao || null,
  }));

  const shippingServices = servicos.map((s) => {
    const logisticaId = String(s.logistica?.id ?? s.logistica_id ?? "");
    const parent = logisticsById.get(logisticaId);
    const aliasesRaw = s.aliases || s.servicos_aliases || "";
    const aliases =
      typeof aliasesRaw === "string"
        ? aliasesRaw.split(",").map((a) => a.trim()).filter(Boolean)
        : Array.isArray(aliasesRaw)
          ? aliasesRaw
          : [];
    return {
      externalId: String(s.id),
      name: s.descricao || s.servicos_descricao || "",
      logisticsExternalId: logisticaId || null,
      providerLogisticsType: parent?.tipoIntegracao || null,
      aliases,
    };
  });

  return [
    sqlUpsertStatuses(appId, "bling", BLING_STATUS),
    sqlUpsertCarriers(appId, carriers),
    sqlUpsertShippingServices(appId, shippingServices),
    sqlMarkSynced(appId),
  ].join("\n");
}

async function syncTiny(appId, token) {
  const allFormas = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await fetchJson(
      `https://api.tiny.com.br/public-api/v3/formas-envio?situacao=1&limit=${limit}&offset=${offset}`,
      { Authorization: `Bearer ${token}` }
    );
    if (res.status !== 200) throw new Error(`Tiny formas-envio HTTP ${res.status}: ${JSON.stringify(res.body).slice(0, 200)}`);
    const batch = res.body.itens || [];
    allFormas.push(...batch);
    const total = res.body.paginacao?.total ?? batch.length;
    offset += limit;
    if (offset >= total || batch.length === 0) break;
  }

  const carriers = allFormas.map((f) => ({
    externalId: String(f.id),
    name: f.nome || "",
    carrierType: f.tipo != null ? String(f.tipo) : null,
  }));

  const shippingServices = [];
  for (const f of allFormas) {
    const tipo = f.tipo != null ? String(f.tipo) : null;
    if (f.formasFrete && Array.isArray(f.formasFrete)) {
      for (const ff of f.formasFrete) {
        shippingServices.push({
          externalId: String(ff.id),
          name: ff.nome || f.nome || "",
          logisticsExternalId: String(f.id),
          providerLogisticsType: tipo,
          aliases: [],
        });
      }
    } else {
      shippingServices.push({
        externalId: String(f.id),
        name: f.nome || "",
        logisticsExternalId: String(f.id),
        providerLogisticsType: tipo,
        aliases: [],
      });
    }
  }

  return [
    sqlUpsertStatuses(appId, "tiny", TINY_STATUS),
    sqlUpsertCarriers(appId, carriers),
    sqlUpsertShippingServices(appId, shippingServices),
    sqlMarkSynced(appId),
  ].join("\n");
}

(async () => {
  const parts = [];
  for (const app of APPS) {
    const token = process.env[app.tokenEnv];
    if (!token) {
      console.error(`Missing ${app.tokenEnv}`);
      process.exit(1);
    }
    console.error(`Syncing ${app.provider} app ${app.appId}...`);
    if (app.provider === "bling") parts.push(await syncBling(app.appId, token));
    else if (app.provider === "tiny") parts.push(await syncTiny(app.appId, token));
  }
  process.stdout.write(parts.join("\n\n"));
})();
