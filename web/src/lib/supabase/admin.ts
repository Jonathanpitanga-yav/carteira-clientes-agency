import { createClient } from "@supabase/supabase-js"
import { getSupabaseEnv } from "@/lib/env"

let _admin: ReturnType<typeof createClient> | null = null

export function createAdminClient() {
  if (_admin) return _admin
  const { url } = getSupabaseEnv()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida no .env.local")

  _admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return _admin
}
