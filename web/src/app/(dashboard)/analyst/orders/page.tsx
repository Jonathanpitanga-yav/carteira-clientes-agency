import { OrdersPageView } from "@/modules/orders/components/orders-page-view"

export default function AnalystOrdersPage() {
  return (
    <OrdersPageView
      title="Pedidos"
      description="Pedidos da sua carteira de clientes"
      showClient
      showClientFilter
      showSync
    />
  )
}
