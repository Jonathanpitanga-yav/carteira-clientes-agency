import { OrdersPageView } from "@/modules/orders/components/orders-page-view"

export default function LeaderOrdersPage() {
  return (
    <OrdersPageView
      title="Pedidos"
      description="Pedidos dos clientes gerenciados"
      showClient
      showClientFilter
      showSync
    />
  )
}
