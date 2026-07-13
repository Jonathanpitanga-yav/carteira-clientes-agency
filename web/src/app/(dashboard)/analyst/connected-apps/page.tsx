"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { ConnectedAppsTable } from "@/modules/admin/components/integration/connected-apps-table"
import { PageContainer } from "@/components/layout/page-container"
import { PageHeader } from "@/components/shared/page-header"

function useOAuthListener() {
  useEffect(() => {
    function handler(event: MessageEvent) {
      if (event.data?.type !== "erp_callback") return
      if (event.data.event === "success") {
        toast.success("Autenticação concluída!", { description: "Token OAuth salvo com sucesso." })
      } else if (event.data.event === "error") {
        toast.error("Falha na autenticação", {
          description: event.data.message ? decodeURIComponent(event.data.message) : "Erro desconhecido.",
        })
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [])
}

export default function AnalystConnectedAppsPage() {
  useOAuthListener()
  return (
    <PageContainer>
      <PageHeader
        title="Aplicativos Conectados"
        description="Acompanhe o status dos aplicativos conectados dos seus clientes"
      />
      <div className="mt-6">
        <ConnectedAppsTable />
      </div>
    </PageContainer>
  )
}
