"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/providers/auth-provider"
import { ROLE_HOME } from "@/lib/constants"
import { Loader2 } from "lucide-react"

export default function DashboardRoot() {
  const { role, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && role) {
      router.push(ROLE_HOME[role])
    }
  }, [role, isLoading, router])

  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
