import { OrdersPageView } from "@/modules/orders/components/orders-page-view"

export default function AdminOrdersPage() {
  return (
    <OrdersPageView
      title="Pedidos"
      description="Todos os pedidos sincronizados dos ERPs"
      showClient
      showClientFilter
      showSync
    />
  )
}
