"use client"

import { TokenList } from "@/modules/admin/components/api-tokens/token-list"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

export default function ApiTokensPage() {
  return (
    <PageContainer>
      <PageHeader
        title="API Tokens"
        description="Tokens de acesso para autenticação machine-to-machine"
      />
      <TokenList />
    </PageContainer>
  )
}
