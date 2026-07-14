"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/providers/auth-provider"
import { getHomeForRoles } from "@/lib/constants"
import { Loader2 } from "lucide-react"

export default function DashboardRoot() {
  const { roles, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && roles.length > 0) {
      router.push(getHomeForRoles(roles))
    }
  }, [roles, isLoading, router])

  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
