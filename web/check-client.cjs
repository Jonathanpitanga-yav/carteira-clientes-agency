const { createClient } = require("@supabase/supabase-js")

const supabase = createClient(
  "https://tnbruzzlgissagxsqrge.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuYnJ1enpsZ2lzc2FneHNxcmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMxMDcsImV4cCI6MjA5OTUwOTEwN30.0lgTITQ5xnbvHKxJ0zmVxThKX9Ij7d4CbVsD4wZvQhg",
)

async function main() {
  console.log("=== CLIENTES ===")
  const { data: clients, error: ce } = await supabase
    .from("clients")
    .select("*")
  if (ce) { console.error("Erro clientes:", ce); return }
  console.log(JSON.stringify(clients, null, 2))

  console.log("\n=== ERPs ===")
  const { data: erps, error: ee } = await supabase
    .from("erp_providers")
    .select("*")
  if (ee) { console.error("Erro ERPs:", ee); return }
  console.log(JSON.stringify(erps, null, 2))

  console.log("\n=== INTEGRAÇÕES (client_applications) ===")
  const { data: apps, error: ae } = await supabase
    .from("client_applications")
    .select("*, clients(name), erp_providers(name)")
  if (ae) { console.error("Erro apps:", ae); return }
  console.log(JSON.stringify(apps, null, 2))
}

main()
