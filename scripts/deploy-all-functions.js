const fs = require("fs");
const path = require("path");

const PROJECT_REF = "tnbruzzlgissagxsqrge";
const PAYLOAD_DIR = path.join(__dirname, "..", ".deploy-payloads");

const token =
  process.env.SUPABASE_ACCESS_TOKEN ||
  process.env.SUPABASE_PAT ||
  (fs.existsSync(path.join(PAYLOAD_DIR, ".sb-token"))
    ? fs.readFileSync(path.join(PAYLOAD_DIR, ".sb-token"), "utf8").trim()
    : "");

if (!token) {
  console.error("Token ausente. Defina SUPABASE_ACCESS_TOKEN ou .deploy-payloads/.sb-token");
  process.exit(2);
}

const names = process.argv.slice(2);
const queue =
  names.length > 0
    ? names
    : fs
        .readdirSync(PAYLOAD_DIR)
        .filter((f) => f.endsWith(".deploy.json"))
        .map((f) => f.replace(".deploy.json", ""));

async function deployOne(payload) {
  const formData = new FormData();
  formData.append(
    "metadata",
    new Blob(
      [
        JSON.stringify({
          name: payload.name,
          entrypoint_path: payload.entrypoint_path,
          verify_jwt: payload.verify_jwt,
        }),
      ],
      { type: "application/json" }
    )
  );

  for (const f of payload.files) {
    formData.append(
      "file",
      new Blob([f.content], { type: "application/typescript" }),
      f.name
    );
  }

  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/deploy?slug=${encodeURIComponent(payload.name)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  return { name: payload.name, status: response.status, body };
}

(async () => {
  const results = [];
  for (const name of queue) {
    const file = path.join(PAYLOAD_DIR, `${name}.deploy.json`);
    if (!fs.existsSync(file)) {
      results.push({ name, status: 0, body: "payload missing" });
      continue;
    }
    const payload = JSON.parse(fs.readFileSync(file, "utf8"));
    console.log(`Deploying ${name} (${payload.files.length} files)...`);
    try {
      const r = await deployOne(payload);
      const ok = r.status >= 200 && r.status < 300;
      console.log(`  -> ${ok ? "OK" : "FAIL"} ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
      results.push(r);
      if (!ok) process.exitCode = 1;
    } catch (err) {
      console.log(`  -> ERROR ${err.message}`);
      results.push({ name, status: 0, body: err.message });
      process.exitCode = 1;
    }
  }
  console.log("\nSummary:");
  for (const r of results) {
    const v = r.body?.version ? ` v${r.body.version}` : "";
    console.log(`  ${r.name}: ${r.status}${v}`);
  }
})();
