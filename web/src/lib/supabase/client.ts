import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseEnv } from "@/lib/env"

let _client: ReturnType<typeof createBrowserClient> | null = null

function getClient() {
  if (!_client) {
    const { url, anonKey } = getSupabaseEnv()
    _client = createBrowserClient(url, anonKey)
  }
  return _client
}

export function createClient() {
  return getClient()
}

export function createSchemaClient(schema: string) {
  return getClient().schema(schema)
}

export function createCoreClient() {
  return createSchemaClient("core")
}

export function createIntegrationClient() {
  return createSchemaClient("integration")
}

export function createSalesClient() {
  return createSchemaClient("sales")
}

export function createJobsClient() {
  return createSchemaClient("jobs")
}
