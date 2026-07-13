"use client"

import { useQuery } from "@tanstack/react-query"
import { createSchemaClient } from "@/lib/supabase/client"
import { QUERY_KEYS } from "@/lib/constants"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils/format"

export default function ClientOrdersPage() {
  const supabase = createSchemaClient("sales")
  const { data: orders, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.CLIENT, "orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error
      return data as any[]
    },
  })

  const statusLabel: Record<string, string> = {
    pending: "Pendente",
    approved: "Aprovado",
    canceled: "Cancelado",
  }

  const statusColor: Record<string, string> = {
    pending: "bg-orange-500 text-white",
    approved: "bg-emerald-600 text-white",
    canceled: "bg-red-600 text-white",
  }

  return (
    <PageContainer>
      <PageHeader title="Meus pedidos" description="Lista dos pedidos recentes" />

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  </TableRow>
                ))
              : orders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">
                      {order.external_id ?? order.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.total_amount ?? 0)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor[order.status] ?? ""}>
                        {statusLabel[order.status] ?? order.status}
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
