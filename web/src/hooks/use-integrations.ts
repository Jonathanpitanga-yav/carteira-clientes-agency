import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"
import { humanError } from "@/lib/utils/errors"
import { toast } from "sonner"

const supabase = createClient()

export type Integration = {
  id: string
  client_id: string
  erp_provider_id: string
  status: string
  created_at: string
  updated_at: string
  client_name?: string
  provider_name?: string
}

export function useIntegrations() {
  return useQuery({
    queryKey: [QUERY_KEYS.INTEGRATIONS],
    queryFn: async () => {
      const { data, error } = await supabase
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
        created_at: row.created_at,
        updated_at: row.updated_at,
        client_name: row.clients?.name,
        provider_name: row.erp_providers?.name,
      })) as Integration[]
    },
  })
}

export function useDeleteIntegration() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
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
      const { error } = await supabase.functions.invoke("erp-sync-data", {
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
