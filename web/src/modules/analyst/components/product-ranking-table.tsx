"use client"

import { useProductRanking } from "@/hooks/use-products"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils/format"

export function ProductRankingTable() {
  const { data: products, isLoading, error } = useProductRanking()

  if (error) {
    return <div className="text-destructive">Erro ao carregar produtos.</div>
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
            <TableHead className="text-right">Receita</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            : products?.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">
                    {p.product_name ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.sku ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.client_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">{p.total_orders}</TableCell>
                  <TableCell className="text-right">{p.total_quantity}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(p.total_revenue ?? 0)}
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  )
}
