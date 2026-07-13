import { createBrowserClient } from "@supabase/ssr"

let _client: ReturnType<typeof createBrowserClient> | null = null

function getClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
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
