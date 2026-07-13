import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createSchemaClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"
import { humanError } from "@/lib/utils/errors"
import { toast } from "sonner"

function getSupabase() {
  return createSchemaClient("core")
}

export type Client = {
  id: string
  name: string
  document: string | null
  status: "active" | "inactive"
  created_at: string
  updated_at: string
}

export type ClientInput = {
  name: string
  document?: string | null
  status?: "active" | "inactive"
}

export function useClients() {
  return useQuery({
    queryKey: [QUERY_KEYS.CLIENTS],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("clients")
        .select("*")
        .order("name")

      if (error) throw error
      return data as Client[]
    },
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.CLIENT, id],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("clients")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error
      return data as Client
    },
    enabled: !!id,
  })
}

export function useCreateClient() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: ClientInput) => {
      const { error } = await getSupabase().from("clients").insert(input)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENTS] })
      toast.success("Cliente cadastrado com sucesso!")
    },
    onError: (err) => toast.error(humanError(err)),
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: ClientInput & { id: string }) => {
      const { error } = await getSupabase().from("clients").update(input).eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENTS] })
      toast.success("Cliente atualizado com sucesso!")
    },
    onError: (err) => toast.error(humanError(err)),
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from("clients").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.CLIENTS] })
      toast.success("Cliente removido com sucesso!")
    },
    onError: (err) => toast.error(humanError(err)),
  })
}

export function useClientsStats() {
  return useQuery({
    queryKey: [QUERY_KEYS.CLIENTS, "stats"],
    queryFn: async () => {
      const { data, error } = await getSupabase().from("clients").select("status")
      if (error) throw error
      const rows = data as { status: string }[]
      return {
        total: rows.length,
        active: rows.filter((r) => r.status === "active").length,
        inactive: rows.filter((r) => r.status === "inactive").length,
      }
    },
  })
}
