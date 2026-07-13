import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  "https://tnbruzzlgissagxsqrge.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuYnJ1enpsZ2lzc2FneHNxcmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMxMDcsImV4cCI6MjA5OTUwOTEwN30.0lgTITQ5xnbvHKxJ0zmVxThKX9Ij7d4CbVsD4wZvQhg",
)

async function main() {
  console.log("Criando usuario admin...")
  const result = await supabase.auth.signUp({
    email: "jonathan.pitanga@yav.com.br",
    password: "Admin@123456",
  })

  console.log(JSON.stringify(result, null, 2))
}

main()
