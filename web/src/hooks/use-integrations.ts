import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient, createSchemaClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"
import { humanError } from "@/lib/utils/errors"
import { toast } from "sonner"

function getIntegration() {
  return createSchemaClient("integration")
}

function getCore() {
  return createSchemaClient("core")
}

export type Integration = {
  id: string
  client_id: string
  provider_id: string
  app_name: string
  status: string
  created_at: string
  updated_at: string
  client_name?: string
  provider_name?: string
  provider_slug?: string
}

export type ConnectedApp = Integration & {
  token_expires_at: string | null
  token_updated_at: string | null
  has_refresh_token: boolean
  auth_type: string | null
}

export function useIntegrations() {
  return useQuery({
    queryKey: [QUERY_KEYS.INTEGRATIONS],
    queryFn: async () => {
      const { data: apps, error } = await getIntegration()
        .from("client_applications")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      const clientIds = [...new Set(apps.map((a: any) => a.client_id))]
      const providerIds = [...new Set(apps.map((a: any) => a.provider_id))]

      const { data: clients } = await getCore()
        .from("clients")
        .select("id, name")
        .in("id", clientIds)

      const { data: providers } = await getIntegration()
        .from("erp_providers")
        .select("id, name, display_name")
        .in("id", providerIds)

      const clientMap = new Map((clients || []).map((c: any) => [c.id, c.name]))
      const providerMap = new Map((providers || []).map((p: any) => [p.id, p.display_name]))
      const providerSlugMap = new Map((providers || []).map((p: any) => [p.id, p.name]))

      return (apps as any[]).map((row) => ({
        id: row.id,
        client_id: row.client_id,
        provider_id: row.provider_id,
        app_name: row.app_name,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        client_name: clientMap.get(row.client_id),
        provider_name: providerMap.get(row.provider_id),
        provider_slug: providerSlugMap.get(row.provider_id),
      })) as Integration[]
    },
  })
}

export function useConnectedApps() {
  return useQuery({
    queryKey: [QUERY_KEYS.INTEGRATIONS, "connected"],
    queryFn: async () => {
      const { data: apps, error } = await getIntegration()
        .from("client_applications")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      const appIds = apps.map((a: any) => a.id)
      const clientIds = [...new Set(apps.map((a: any) => a.client_id))]
      const providerIds = [...new Set(apps.map((a: any) => a.provider_id))]

      const [clientsRes, providersRes, tokensRes] = await Promise.all([
        getCore().from("clients").select("id, name").in("id", clientIds),
        getIntegration().from("erp_providers").select("id, name, display_name, auth_type").in("id", providerIds),
        appIds.length > 0
          ? getIntegration().from("tokens").select("app_id, expires_at, refresh_token, updated_at").in("app_id", appIds)
          : { data: [], error: null },
      ])

      const clientMap = new Map<string, string>((clientsRes.data || []).map((c: any) => [c.id, c.name]))
      const providerMap = new Map<string, { id: string; name: string; display_name: string; auth_type: string }>((providersRes.data || []).map((p: any) => [p.id, p]))
      const tokenMap = new Map<string, { app_id: string; expires_at: string | null; refresh_token: string | null; updated_at: string | null }>((tokensRes.data || []).map((t: any) => [t.app_id, t]))

      return (apps as any[]).map((row) => {
        const provider = providerMap.get(row.provider_id)
        const token = tokenMap.get(row.id)
        return {
          id: row.id,
          client_id: row.client_id,
          provider_id: row.provider_id,
          app_name: row.app_name,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
          client_name: clientMap.get(row.client_id),
          provider_name: provider?.display_name,
          provider_slug: provider?.name,
          auth_type: provider?.auth_type ?? null,
          token_expires_at: token?.expires_at ?? null,
          token_updated_at: token?.updated_at ?? null,
          has_refresh_token: !!token?.refresh_token,
        } as ConnectedApp
      })
    },
  })
}

type CreateIntegrationInput = {
  erpId: string
  clientName: string
  credentials: { client_id: string; client_secret: string }
}

export function useCreateIntegrationClient() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ erpId, clientName, credentials }: CreateIntegrationInput) => {
      const { data: erp } = await getIntegration()
        .from("erp_providers")
        .select("id, auth_type, auth_config")
        .eq("name", erpId)
        .maybeSingle()

      if (!erp) throw new Error("ERP provider not found")

      const { data: client } = await getCore()
        .from("clients")
        .insert({ name: clientName, status: "active", document: null })
        .select("id")
        .single()

      if (!client) throw new Error("Failed to create client")

      const { data: app } = await getIntegration()
        .from("client_applications")
        .insert({
          client_id: client.id,
          provider_id: erp.id,
          app_name: clientName,
          status: "active",
        })
        .select("id")
        .single()

      if (!app) throw new Error("Failed to create integration")

      if (erp.auth_type === "api_key") {
        const { error: credErr } = await getIntegration()
          .from("credentials")
          .insert({
            app_id: app.id,
            client_identifier: credentials.client_id,
            client_secret: credentials.client_secret,
          })

        if (credErr) throw credErr
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.INTEGRATIONS] })
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENTS] })
      toast.success("Cliente cadastrado e integração ativada!")
    },
    onError: (err) => toast.error(humanError(err)),
  })
}

export function useDeleteIntegration() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getIntegration()
        .from("client_applications")
        .update({ status: "expired" })
        .eq("id", id)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.INTEGRATIONS] })
      toast.success("Integração desativada com sucesso!")
    },
    onError: (err) => toast.error(humanError(err)),
  })
}

export function useSyncIntegration() {
  return useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await createClient().functions.invoke("erp-sync-data", {
        body: { appId },
      })

      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Sincronização iniciada com sucesso!")
    },
    onError: (err) => toast.error(humanError(err)),
  })
}

export function useRefreshToken() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (appId: string) => {
      const { error } = await createClient().functions.invoke("erp-refresh-token", {
        body: { appId },
      })

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.INTEGRATIONS, "connected"] })
      toast.success("Token atualizado com sucesso!")
    },
    onError: (err) => toast.error(humanError(err)),
  })
}
