"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/providers/auth-provider"
import { ROUTES, getHomeForRoles, type Role } from "@/lib/constants"
import { Loader2 } from "lucide-react"

type AuthGuardProps = {
  allowedRoles: Role[]
  children: React.ReactNode
}

export function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const { user, roles, isLoading } = useAuth()
  const router = useRouter()

  const hasAccess = roles.some((r) => allowedRoles.includes(r))

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.push(ROUTES.LOGIN)
      return
    }

    if (roles.length > 0 && !hasAccess) {
      router.push(getHomeForRoles(roles))
    }
  }, [user, roles, isLoading, allowedRoles, hasAccess, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || roles.length === 0 || !hasAccess) {
    return null
  }

  return <>{children}</>
}
