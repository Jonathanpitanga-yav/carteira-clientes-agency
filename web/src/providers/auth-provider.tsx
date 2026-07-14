"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { createClient, createCoreClient } from "@/lib/supabase/client"
import type { Role } from "@/lib/constants"

type AuthContext = {
  user: User | null
  session: Session | null
  roles: Role[]
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContext>({
  user: null,
  session: null,
  roles: [],
  isLoading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchRoles = useCallback(async (userId: string) => {
    const { data: profile } = await createCoreClient()
      .from("profiles")
      .select("roles, role")
      .eq("id", userId)
      .maybeSingle()

    const roles = (profile?.roles as Role[]) ?? []
    if (roles.length > 0) return roles

    const singleRole = profile?.role as Role | null
    return singleRole ? [singleRole] : []
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      const u = data.session?.user ?? null
      setUser(u)

      if (u) {
        const r = await fetchRoles(u.id)
        setRoles(r)
      }

      setIsLoading(false)
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event: string, session: any) => {
        setSession(session)
        const u = session?.user ?? null
        setUser(u)

        if (u) {
          const r = await fetchRoles(u.id)
          setRoles(r)
        } else {
          setRoles([])
        }

        setIsLoading(false)
      },
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, roles, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
