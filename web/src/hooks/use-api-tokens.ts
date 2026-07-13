import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"
import { humanError } from "@/lib/utils/errors"
import { toast } from "sonner"

function getSupabase() {
  return createClient()
}

export type ApiToken = {
  id: string
  prefix: string
  permissions: string[] | null
  expires_at: string | null
  status: string
  last_used_at: string | null
  created_at: string
  client_id?: string
}

export function useApiTokens() {
  return useQuery({
    queryKey: [QUERY_KEYS.API_TOKENS],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("api_tokens")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      return data as ApiToken[]
    },
  })
}

export function useCreateApiToken() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      client_id?: string
      permissions?: string[]
      expires_at?: string
    }) => {
      const { data, error } = await getSupabase()
        .from("api_tokens")
        .insert(input)
        .select("prefix")
        .single()

      if (error) throw error
      return data as { prefix: string }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.API_TOKENS] })
      toast.success("Token criado com sucesso!", {
        description: `Prefixo: ${data.prefix}...`,
      })
    },
    onError: (err) => toast.error(humanError(err)),
  })
}

export function useRevokeApiToken() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase()
        .from("api_tokens")
        .update({ status: "revoked" })
        .eq("id", id)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.API_TOKENS] })
      toast.success("Token revogado com sucesso!")
    },
    onError: (err) => toast.error(humanError(err)),
  })
}
