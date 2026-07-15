#!/usr/bin/env node
/**
 * Deploy all ERP edge functions via Supabase MCP deploy_edge_function.
 * Uses @modelcontextprotocol/sdk from web/node_modules.
 * Requires Cursor MCP OAuth (run mcp_auth on user-supabase first in agent session).
 */
const fs = require("fs");
const path = require("path");

const PROJECT_REF = "tnbruzzlgissagxsqrge";
const MCP_URL = `https://mcp.supabase.com/mcp?project_ref=${PROJECT_REF}`;
const PAYLOAD_DIR = path.join(__dirname, "..", ".deploy-payloads");
const RESULTS_FILE = path.join(PAYLOAD_DIR, "_mcp-deploy-results.json");

const FUNCTIONS = [
  { name: "erp-callback", verify_jwt: false },
  { name: "erp-refresh-token", verify_jwt: false },
  { name: "erp-webhook", verify_jwt: false },
  { name: "erp-sync-data", verify_jwt: false },
  { name: "erp-fetch-dictionaries", verify_jwt: true },
  { name: "erp-enqueue-sync", verify_jwt: true },
  { name: "erp-process-sync-queue", verify_jwt: true },
  { name: "erp-retranslate-invoices", verify_jwt: true },
];

function loadPayload(name) {
  const mcpFile = path.join(PAYLOAD_DIR, `_mcp-${name}.json`);
  if (!fs.existsSync(mcpFile)) {
    throw new Error(`Payload not found: ${mcpFile}`);
  }
  return JSON.parse(fs.readFileSync(mcpFile, "utf8"));
}

async function main() {
  const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
  const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  const client = new Client({ name: "mcp-deploy-all-callmcp", version: "1.0.0" });
  await client.connect(transport);

  const results = [];
  for (const fn of FUNCTIONS) {
    const payload = loadPayload(fn.name);
    console.log(`Deploying ${fn.name} (${payload.files.length} files, verify_jwt=${payload.verify_jwt})...`);
    try {
      const response = await client.callTool({
        name: "deploy_edge_function",
        arguments: {
          name: payload.name,
          entrypoint_path: payload.entrypoint_path,
          verify_jwt: payload.verify_jwt,
          files: payload.files,
        },
      });
      const text = (response.content || [])
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n");
      let body = null;
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
      const ok = !response.isError && (body?.version || body?.id);
      console.log(`  -> ${ok ? "success" : "fail"} ${text.slice(0, 300)}`);
      results.push({
        name: payload.name,
        deploy_status: ok ? "success" : "fail",
        version: body?.version ?? body?.id ?? null,
        verify_jwt: payload.verify_jwt,
        ...(ok ? {} : { error: body?.message || body?.error || body }),
      });
    } catch (err) {
      console.log(`  -> fail ${err.message}`);
      results.push({
        name: fn.name,
        deploy_status: "fail",
        version: null,
        verify_jwt: fn.verify_jwt,
        error: err.message,
      });
    }
  }

  // list_edge_functions verification
  console.log("\nListing edge functions...");
  try {
    const listResp = await client.callTool({ name: "list_edge_functions", arguments: {} });
    const listText = (listResp.content || [])
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");
    let remote = [];
    try {
      remote = JSON.parse(listText);
    } catch {
      remote = [];
    }
    for (const r of results) {
      const found = Array.isArray(remote)
        ? remote.find((f) => f.slug === r.name || f.name === r.name)
        : null;
      r.remote_active = found?.status === "ACTIVE";
      if (found?.version) r.version = found.version;
    }
    console.log("Remote functions:", listText.slice(0, 500));
  } catch (err) {
    console.log("list_edge_functions failed:", err.message);
  }

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log("\nResults written to", RESULTS_FILE);
  console.log(JSON.stringify(results, null, 2));
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
