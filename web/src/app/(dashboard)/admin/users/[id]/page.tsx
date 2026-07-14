"use client"

import { useParams } from "next/navigation"
import { useUser } from "@/hooks/use-users"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ROLE_LABELS, type Role } from "@/lib/constants"
import { formatRoles } from "@/lib/constants"

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: user, isLoading } = useUser(id)

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
      </PageContainer>
    )
  }

  if (!user) {
    return (
      <PageContainer>
        <p className="text-muted-foreground">Usuário não encontrado.</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader title={user.full_name ?? "Sem nome"} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading">Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID</span>
            <span className="font-mono">{user.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Papéis</span>
            <div className="flex flex-wrap gap-1">
              {(user.roles?.length ? user.roles : [user.role]).map((r) => (
                <Badge key={r} variant="outline">
                  {ROLE_LABELS[r as Role] ?? r}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Criado em</span>
            <span>{new Date(user.created_at).toLocaleDateString("pt-BR")}</span>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
