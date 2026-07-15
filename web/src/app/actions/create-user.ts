"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getSupabaseEnv } from "@/lib/env"

export async function createUserAction(data: {
  email: string
  password: string
  full_name: string
  roles: string[]
}) {
  const supabase = createAdminClient()
  const { url } = getSupabaseEnv()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const { data: result, error } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { is_temp_password: true },
  })

  if (error) throw new Error(error.message)

  const res = await fetch(`${url}/rest/v1/profiles?id=eq.${result.user.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Accept-Profile": "core",
    },
    body: JSON.stringify({ full_name: data.full_name, roles: data.roles }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Erro ao atualizar perfil: ${text}`)
  }

  return { id: result.user.id }
}
