"use client"

import { useProductRanking } from "@/hooks/use-products"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils/format"

export default function ClientProductsPage() {
  const { data: products, isLoading } = useProductRanking()

  return (
    <PageContainer>
      <PageHeader title="Meus produtos" description="Produtos vendidos" />

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Qtd vendida</TableHead>
              <TableHead className="text-right">Receita total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              : products?.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{p.product_name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.sku ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">{p.total_quantity}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(p.total_revenue ?? 0)}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </PageContainer>
  )
}
