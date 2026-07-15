"use client"

import { useUsersWithClients, type UserWithClients } from "@/hooks/use-users"
import { useClients } from "@/hooks/use-clients"
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
import { Pencil, Link2, UserPlus } from "lucide-react"
import { ROLE_LABELS, type Role } from "@/lib/constants"
import { useState } from "react"
import { UserFormDialog } from "./user-form"
import { CreateUserDialog } from "./create-user-dialog"
import { LinkClientsDialog } from "./link-clients-dialog"

export function UserList() {
  const { data: users, isLoading, error } = useUsersWithClients()
  const { data: allClients } = useClients()
  const [editUser, setEditUser] = useState<UserWithClients | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [linkUser, setLinkUser] = useState<UserWithClients | null>(null)

  if (error) {
    return <div className="text-destructive">Erro ao carregar usuários.</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-semibold">
          {users?.length ?? 0} usuário(s)
        </h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <UserPlus className="mr-1.5 h-4 w-4" />
          Novo usuário
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Papéis</TableHead>
              <TableHead>Clientes</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20" /></TableCell>
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
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.client_names.length > 0 ? (
                          user.client_names.map((name) => (
                            <Badge key={name} variant="secondary" className="text-xs">
                              {name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditUser(user)}
                          title="Editar usuário"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLinkUser(user)}
                          title="Gerenciar clientes"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <CreateUserDialog open={showCreate} onOpenChange={setShowCreate} />

      {editUser && (
        <UserFormDialog
          key={editUser.id}
          user={editUser}
          open
          onOpenChange={(open) => { if (!open) setEditUser(null) }}
        />
      )}

      {linkUser && allClients && (
        <LinkClientsDialog
          key={linkUser.id}
          user={linkUser}
          allClients={allClients}
          open
          onOpenChange={(open) => { if (!open) setLinkUser(null) }}
        />
      )}
    </div>
  )
}
