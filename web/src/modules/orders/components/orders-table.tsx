"use client"

import { type Invoice, getGlobalStatusDisplay, getGlobalMarketplaceDisplay, getGlobalLogisticsDisplay, getStoreTypeDisplay } from "@/hooks/use-orders"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react"

type OrdersTableProps = {
  orders: Invoice[] | undefined
  isLoading: boolean
  showClient?: boolean
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function OrdersTable({
  orders,
  isLoading,
  showClient,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: OrdersTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  const getVisiblePages = () => {
    const pages: (number | "dots")[] = []
    const delta = 1
    const start = Math.max(1, page - delta)
    const end = Math.min(totalPages, page + delta)

    if (start > 1) {
      pages.push(1)
      if (start > 2) pages.push("dots")
    }
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push("dots")
      pages.push(totalPages)
    }
    return pages
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (!orders?.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
        <ShoppingCart className="h-8 w-8" />
        <p>Nenhum pedido encontrado.</p>
        <p className="text-xs">Sincronize os pedidos das lojas para começar.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-auto rounded-md border max-h-[calc(100vh-260px)]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              {showClient && <TableHead>Cliente</TableHead>}
              <TableHead>Pedido</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Tipo de loja</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Frete</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Logística</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const statusDisplay = getGlobalStatusDisplay(order.global_status)
              const erpStatusHint =
                order.erp_status_label &&
                order.erp_status_label.trim() !== statusDisplay.label
                  ? order.erp_status_label
                  : undefined
              const marketplaceDisplay = getGlobalMarketplaceDisplay(
                order.global_marketplace_slug !== "unknown"
                  ? order.global_marketplace_slug
                  : order.erp_marketplace_catalog_slug,
                order.marketplace_name,
                order.order_type,
                order.erp_marketplace_name,
              )
              const logisticsDisplay = getGlobalLogisticsDisplay(
                order.global_logistics_slug,
                order.erp_logistics_name || order.shipping_method || order.carrier_name,
                order.global_marketplace_slug !== "unknown"
                  ? order.global_marketplace_slug
                  : order.erp_marketplace_catalog_slug,
              )
              return (
                <TableRow key={order.id}>
                  {showClient && (
                    <TableCell className="font-medium whitespace-nowrap">
                      {order.client_name ?? "—"}
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-sm">
                    {order.invoice_number ?? order.erp_order_number ?? order.external_id ?? order.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {order.issue_date ? formatDate(order.issue_date) : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {marketplaceDisplay}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getStoreTypeDisplay(order)}
                  </TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap">
                    {formatCurrency(order.total_amount ?? 0)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {order.freight_value != null && order.freight_value > 0
                      ? formatCurrency(order.freight_value)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${statusDisplay.color} whitespace-nowrap`}
                      title={erpStatusHint ? `ERP: ${erpStatusHint}` : undefined}
                    >
                      {statusDisplay.label}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="text-sm text-muted-foreground max-w-48 truncate"
                    title={logisticsDisplay}
                  >
                    {logisticsDisplay}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Mostrando {from}–{to} de {totalCount} pedidos</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
          <span className="hidden sm:inline">por página</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {getVisiblePages().map((p, i) =>
            p === "dots" ? (
              <span key={`dots-${i}`} className="px-1 text-muted-foreground">…</span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="icon"
                className="h-8 w-8 text-sm"
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            )
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
