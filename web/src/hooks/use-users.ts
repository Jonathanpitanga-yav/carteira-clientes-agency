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

export type UserWithClients = UserProfile & {
  client_names: string[]
}

export function useUsersWithClients() {
  return useQuery({
    queryKey: [QUERY_KEYS.USERS, "with-clients"],
    queryFn: async () => {
      const [profilesRes, linksRes, clientsRes] = await Promise.all([
        getSupabase().from("profiles").select("*").order("created_at", { ascending: false }),
        getSupabase().from("client_analysts").select("analyst_id, client_id"),
        getSupabase().from("clients").select("id, name"),
      ])
      if (profilesRes.error) throw profilesRes.error

      const profiles = profilesRes.data as UserProfile[]
      const links = (linksRes.data || []) as { analyst_id: string; client_id: string }[]
      const clientMap = new Map<string, string>((clientsRes.data || []).map((c: any) => [c.id, c.name]))

      const userClientMap: Record<string, string[]> = {}
      for (const link of links) {
        if (!userClientMap[link.analyst_id]) userClientMap[link.analyst_id] = []
        const name: string | undefined = clientMap.get(link.client_id)
        if (name !== undefined) userClientMap[link.analyst_id].push(name)
      }

      return profiles.map((p) => ({
        ...p,
        client_names: userClientMap[p.id] || [],
      })) as UserWithClients[]
    },
  })
}

export type ClientLink = {
  analyst_id: string
  client_id: string
}

export function useUserClientLinks(userId: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.USERS, "client-links", userId],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("client_analysts")
        .select("client_id")
        .eq("analyst_id", userId)
      if (error) throw error
      const rows = data as { client_id: string }[]
      return rows.map((r) => r.client_id) as string[]
    },
    enabled: !!userId,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: { email: string; password: string; full_name: string; roles: string[] }) => {
      const { createUserAction } = await import("@/app/actions/create-user")
      return createUserAction(input)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] })
      toast.success("Usuário criado com sucesso!")
    },
    onError: (err) => toast.error(humanError(err)),
  })
}

export function useUpdateClientLinks() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, clientIds }: { userId: string; clientIds: string[] }) => {
      const { data: existingLinks } = await getSupabase()
        .from("client_analysts")
        .select("client_id")
        .eq("analyst_id", userId)

      const existing = (existingLinks || []).map((r: any) => r.client_id)
      const toAdd = clientIds.filter((id) => !existing.includes(id))
      const toRemove = existing.filter((id: string) => !clientIds.includes(id))

      const ops: Promise<any>[] = []
      for (const clientId of toAdd) {
        ops.push(
          getSupabase().from("client_analysts").insert({ analyst_id: userId, client_id: clientId })
        )
      }
      for (const clientId of toRemove) {
        ops.push(
          getSupabase()
            .from("client_analysts")
            .delete()
            .eq("analyst_id", userId)
            .eq("client_id", clientId)
        )
      }
      await Promise.all(ops)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.USERS] })
      toast.success("Vínculos atualizados com sucesso!")
    },
    onError: (err) => toast.error(humanError(err)),
  })
}
