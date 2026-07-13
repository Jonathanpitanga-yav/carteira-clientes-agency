"use client"

import { useClients, type Client } from "@/hooks/use-clients"
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
import { Plus, Pencil, Trash2 } from "lucide-react"
import { formatDocument } from "@/lib/utils/format"
import Link from "next/link"
import { useState } from "react"
import { ClientFormDialog } from "./client-form"
import { ClientDeleteDialog } from "./client-delete-dialog"

export function ClientList() {
  const { data: clients, isLoading, error } = useClients()
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [deleteClient, setDeleteClient] = useState<Client | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  if (error) {
    return <div className="text-destructive">Erro ao carregar clientes.</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-semibold">
          {clients?.length ?? 0} cliente(s)
        </h2>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo cliente
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                  </TableRow>
                ))
              : clients?.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        {client.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.document ? formatDocument(client.document) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={client.status === "active" ? "default" : "secondary"}
                        className={
                          client.status === "active"
                            ? "bg-emerald-600 text-white hover:bg-emerald-600"
                            : ""
                        }
                      >
                        {client.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditClient(client)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteClient(client)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <ClientFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {editClient && (
        <ClientFormDialog
          key={editClient.id}
          client={editClient}
          open
          onOpenChange={(open) => { if (!open) setEditClient(null) }}
        />
      )}

      {deleteClient && (
        <ClientDeleteDialog
          client={deleteClient}
          open
          onOpenChange={(open) => { if (!open) setDeleteClient(null) }}
        />
      )}
    </div>
  )
}
