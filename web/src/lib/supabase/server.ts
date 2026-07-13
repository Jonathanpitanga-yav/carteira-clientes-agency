import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

async function getClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        },
      },
    },
  )
}

export async function createClient() {
  return getClient()
}

export async function createSchemaClient(schema: string) {
  const client = await getClient()
  return client.schema(schema)
}

export async function createCoreClient() {
  return createSchemaClient("core")
}

export async function createIntegrationClient() {
  return createSchemaClient("integration")
}

export async function createSalesClient() {
  return createSchemaClient("sales")
}
