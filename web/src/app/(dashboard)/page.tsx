"use client"

import { useAuth } from "@/providers/auth-provider"
import { UnifiedDashboard } from "@/modules/dashboard/components/unified-dashboard"
import { Loader2 } from "lucide-react"

export default function DashboardRoot() {
  const { roles, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!roles.length) {
    return null
  }

  return <UnifiedDashboard roles={roles} />
}