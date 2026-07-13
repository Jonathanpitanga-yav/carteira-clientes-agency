"use client"

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
import { Skeleton } from "@/components/ui/skeleton"
import { formatDocument } from "@/lib/utils/format"
import Link from "next/link"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function LeaderClientsPage() {
  const { data: clients, isLoading, error } = useClients()

  if (error) {
    return (
      <PageContainer>
        <p className="text-destructive">Erro ao carregar clientes.</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader title="Clientes" description="Visão completa dos clientes da agência" />

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  </TableRow>
                ))
              : clients?.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/leader/clients/${client.id}`}
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
                        className={
                          client.status === "active"
                            ? "bg-emerald-600 text-white"
                            : ""
                        }
                      >
                        {client.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </PageContainer>
  )
}
