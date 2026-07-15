const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FUNCTIONS_DIR = path.join(ROOT, "supabase", "functions");
const OUT_DIR = path.join(ROOT, ".deploy-payloads");

const VERIFY_JWT = {
  "erp-callback": false,
  "erp-refresh-token": false,
  "erp-webhook": false,
  "erp-sync-data": false,
  "erp-fetch-dictionaries": true,
  "erp-enqueue-sync": true,
  "erp-process-sync-queue": true,
  "erp-process-webhook-queue": true,
  "erp-retranslate-invoices": true,
};

function walkDir(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkDir(full, base));
    } else if (
      entry.isFile() &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith("_test.ts")
    ) {
      out.push(full);
    }
  }
  return out;
}

function toDeployPath(absPath) {
  const rel = path.relative(FUNCTIONS_DIR, absPath).replace(/\\/g, "/");
  return `functions/${rel}`;
}

function normalize(content) {
  return content.replace(/\r\n/g, "\n");
}

const fnNames = fs
  .readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith("erp-"))
  .map((d) => d.name);

const sharedFiles = walkDir(path.join(FUNCTIONS_DIR, "shared"));

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

for (const name of fnNames) {
  const indexPath = path.join(FUNCTIONS_DIR, name, "index.ts");
  if (!fs.existsSync(indexPath)) continue;

  const files = [
    { name: toDeployPath(indexPath), content: normalize(fs.readFileSync(indexPath, "utf8")) },
    ...sharedFiles.map((f) => ({
      name: toDeployPath(f),
      content: normalize(fs.readFileSync(f, "utf8")),
    })),
  ];

  const payload = {
    name,
    entrypoint_path: `functions/${name}/index.ts`,
    verify_jwt: VERIFY_JWT[name] ?? true,
    files,
  };

  const outPath = path.join(OUT_DIR, `${name}.deploy.json`);
  fs.writeFileSync(outPath, JSON.stringify(payload));
  console.log(name, "files=", files.length, "bytes=", fs.statSync(outPath).size);
}

console.log("DONE", fnNames.join(", "));
