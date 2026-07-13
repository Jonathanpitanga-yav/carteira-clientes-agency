"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/providers/auth-provider"
import { ROUTES, ROLE_HOME, type Role } from "@/lib/constants"
import { Loader2 } from "lucide-react"

type AuthGuardProps = {
  allowedRoles: Role[]
  children: React.ReactNode
}

export function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.push(ROUTES.LOGIN)
      return
    }

    if (role && !allowedRoles.includes(role)) {
      const home = ROLE_HOME[role] ?? ROUTES.LOGIN
      router.push(home)
    }
  }, [user, role, isLoading, allowedRoles, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || !role || !allowedRoles.includes(role)) {
    return null
  }

  return <>{children}</>
}
