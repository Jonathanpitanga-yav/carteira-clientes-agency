import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createSchemaClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"
import { humanError } from "@/lib/utils/errors"
import { toast } from "sonner"

function getSupabase() {
  return createSchemaClient("core")
}

export type UserProfile = {
  id: string
  full_name: string | null
  role: string | null
  roles: string[]
  created_at: string
  email?: string
}

export function useUsers() {
  return useQuery({
    queryKey: [QUERY_KEYS.USERS],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      return data as UserProfile[]
    },
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.USER, id],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error
      return data as UserProfile
    },
    enabled: !!id,
  })
}

export type UserInput = {
  full_name: string
  roles: string[]
}

export function useUpdateUser() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: UserInput & { id: string }) => {
      const { error } = await getSupabase()
        .from("profiles")
        .update(input)
        .eq("id", id)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] })
      toast.success("Usuário atualizado com sucesso!")
    },
    onError: (err) => toast.error(humanError(err)),
  })
}

export function useUsersStats() {
  return useQuery({
    queryKey: [QUERY_KEYS.USERS, "stats"],
    queryFn: async () => {
      const { data, error } = await getSupabase().from("profiles").select("roles")
      if (error) throw error
      const rows = data as { roles: string[] }[]
      return {
        total: rows.length,
        admins: rows.filter((r) => r.roles?.includes("admin")).length,
        leaders: rows.filter((r) => r.roles?.includes("leader")).length,
        analysts: rows.filter((r) => r.roles?.includes("analyst")).length,
        clients: rows.filter((r) => r.roles?.includes("client")).length,
      }
    },
  })
}
