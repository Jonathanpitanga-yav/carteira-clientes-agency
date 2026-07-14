"use client"

import { useUsers, type UserProfile } from "@/hooks/use-users"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Pencil } from "lucide-react"
import { ROLE_LABELS, type Role } from "@/lib/constants"
import { formatRoles } from "@/lib/constants"
import { useState } from "react"
import { UserFormDialog } from "./user-form"

export function UserList() {
  const { data: users, isLoading, error } = useUsers()
  const [editUser, setEditUser] = useState<UserProfile | null>(null)

  if (error) {
    return <div className="text-destructive">Erro ao carregar usuários.</div>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-heading font-semibold">
        {users?.length ?? 0} usuário(s)
      </h2>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              : users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(user.roles?.length ? user.roles : [user.role]).map((r) => (
                          <Badge key={r} variant="outline">
                            {ROLE_LABELS[r as Role] ?? r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditUser(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {editUser && (
        <UserFormDialog
          key={editUser.id}
          user={editUser}
          open
          onOpenChange={(open) => { if (!open) setEditUser(null) }}
        />
      )}
    </div>
  )
}
