"use client"

import { useCallback, useState } from "react"
import { useOrders, type OrderFilters } from "@/hooks/use-orders"
import { OrdersTable } from "@/modules/orders/components/orders-table"
import { OrdersFilters } from "@/modules/orders/components/orders-filters"
import { SyncDialog } from "@/modules/orders/components/sync-dialog"
import { SyncStatusBadge } from "@/modules/orders/components/sync-status-badge"
import { SyncQueueNotifier } from "@/modules/orders/components/sync-queue-notifier"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

type OrdersPageViewProps = {
  title: string
  description: string
  showClient?: boolean
  showClientFilter?: boolean
  showSync?: boolean
}

export function OrdersPageView({
  title,
  description,
  showClient,
  showClientFilter,
  showSync,
}: OrdersPageViewProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [filters, setFilters] = useState<OrderFilters>({})

  const { data, isLoading } = useOrders({ ...filters, page, pageSize })

  const handleFiltersChange = useCallback((next: OrderFilters) => {
    setFilters(next)
    setPage(1)
  }, [])

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setPage(1)
  }

  return (
    <PageContainer>
      {showSync && <SyncQueueNotifier />}
      <div className="flex items-start justify-between gap-4">
        <PageHeader title={title} description={description} />
        {showSync && <div className="flex items-center gap-2"><SyncStatusBadge /><SyncDialog /></div>}
      </div>

      <OrdersFilters
        filters={filters}
        onChange={handleFiltersChange}
        showClientFilter={showClientFilter}
      />

      <OrdersTable
        orders={data?.orders}
        isLoading={isLoading}
        showClient={showClient}
        page={page}
        pageSize={pageSize}
        totalCount={data?.count ?? 0}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
      />
    </PageContainer>
  )
}
