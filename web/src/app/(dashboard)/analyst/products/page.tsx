"use client"

import { ProductRankingTable } from "@/modules/analyst/components/product-ranking-table"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function AnalystProductsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Ranking de produtos"
        description="Produtos mais vendidos na sua carteira"
      />
      <ProductRankingTable />
    </PageContainer>
  )
}
