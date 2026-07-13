const { createClient } = require("@supabase/supabase-js")

const supabase = createClient(
  "https://tnbruzzlgissagxsqrge.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuYnJ1enpsZ2lzc2FneHNxcmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMxMDcsImV4cCI6MjA5OTUwOTEwN30.0lgTITQ5xnbvHKxJ0zmVxThKX9Ij7d4CbVsD4wZvQhg",
)

async function main() {
  const { error: loginErr } = await supabase.auth.signInWithPassword({
    email: "jonathan.pitanga@yav.com.br",
    password: "Admin@123456",
  })
  if (loginErr) { console.error("Login:", loginErr); return }
  console.log("OK - logged in\n")

  // 1. public schema (known to work)
  const { data: pubClients } = await supabase.from("clients").select("id,name")
  console.log(`public.clients: ${pubClients?.length ?? "ERROR"} rows`)

  const { data: pubProfiles } = await supabase.from("profiles").select("id,role")
  console.log(`public.profiles: ${pubProfiles?.length ?? "ERROR"} rows`)

  const { data: pubERPs } = await supabase.from("erp_providers").select("id,name")
  console.log(`public.erp_providers: ${pubERPs?.length ?? "ERROR"} rows`)

  // 2. Check if core schema tables exist
  const core = supabase.schema("core")
  const { data: coreClients, error: coreErr } = await core.from("clients").select("id,name").limit(1)
  if (coreErr) console.log(`core.clients: ${coreErr.code} - ${coreErr.message}`)
  else console.log(`core.clients: ${coreClients?.length ?? 0} rows`)

  // 3. Check if integration schema tables exist
  const integ = supabase.schema("integration")
  const { data: integErps, error: integErr } = await integ.from("erp_providers").select("id,name").limit(1)
  if (integErr) console.log(`integration.erp_providers: ${integErr.code} - ${integErr.message}`)
  else console.log(`integration.erp_providers: ${integErps?.length ?? 0} rows`)

  // 4. Check if sales schema tables exist
  const sales = supabase.schema("sales")
  const { data: salesInv, error: salesErr } = await sales.from("invoices").select("id").limit(1)
  if (salesErr) console.log(`sales.invoices: ${salesErr.code} - ${salesErr.message}`)
  else console.log(`sales.invoices: ${salesInv?.length ?? 0} rows`)

  // Summary
  if (pubClients && pubClients.length > 0) {
    console.log("\n>>> ATENCAO: public.clients ainda existe com dados!")
    console.log(">>> A migration SQL ainda NAO foi executada.")
  } else if (!coreErr) {
    console.log("\n>>> Schemas corretos ja existem! Nao ha duplicacao.")
  } else {
    console.log("\n>>> Schemas corretos ainda nao existem. Execute o SQL de migracao.")
  }
}

main()
