import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"
import { humanError } from "@/lib/utils/errors"
import { toast } from "sonner"

function getSupabase() {
  return createClient()
}

export type Integration = {
  id: string
  client_id: string
  erp_provider_id: string
  status: string
  credentials: { client_id: string; client_secret: string } | null
  created_at: string
  updated_at: string
  client_name?: string
  provider_name?: string
}

export function useIntegrations() {
  return useQuery({
    queryKey: [QUERY_KEYS.INTEGRATIONS],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("client_applications")
        .select(`
          *,
          clients!inner(name),
          erp_providers!inner(name)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      return (data as any[]).map((row) => ({
        id: row.id,
        client_id: row.client_id,
        erp_provider_id: row.erp_provider_id,
        status: row.status,
        credentials: row.credentials,
        created_at: row.created_at,
        updated_at: row.updated_at,
        client_name: row.clients?.name,
        provider_name: row.erp_providers?.name,
      })) as Integration[]
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
      const supabase = getSupabase()

      const { data: erp } = await supabase
        .from("erp_providers")
        .select("id")
        .eq("slug", erpId)
        .maybeSingle()

      if (!erp) throw new Error("ERP provider not found")

      const { data: client } = await supabase
        .from("clients")
        .insert({ name: clientName, status: "active", document: null })
        .select("id")
        .single()

      if (!client) throw new Error("Failed to create client")

      const { error } = await supabase.from("client_applications").insert({
        client_id: client.id,
        erp_provider_id: erp.id,
        status: "active",
        credentials,
      })

      if (error) throw error
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
      const { error } = await getSupabase()
        .from("client_applications")
        .update({ status: "inactive" })
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
      const { error } = await getSupabase().functions.invoke("erp-sync-data", {
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
