"use client"

import { useState } from "react"
import { useOrders } from "@/hooks/use-orders"
import { OrdersTable } from "@/modules/orders/components/orders-table"
import { SyncDialog } from "@/modules/orders/components/sync-dialog"
import { SyncQueueNotifier } from "@/modules/orders/components/sync-queue-notifier"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function AnalystOrdersPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const { data, isLoading } = useOrders({ page, pageSize })

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setPage(1)
  }

  return (
    <PageContainer>
      <SyncQueueNotifier />
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Pedidos"
          description="Pedidos dos clientes da sua carteira"
        />
        <SyncDialog />
      </div>
      <OrdersTable
        orders={data?.orders}
        isLoading={isLoading}
        showClient
        page={page}
        pageSize={pageSize}
        totalCount={data?.count ?? 0}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
      />
    </PageContainer>
  )
}
