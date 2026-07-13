"use client"

import { useState } from "react"
import { useIntegrations } from "@/hooks/use-integrations"
import { ConnectDialog } from "./connect-dialog"
import { ClientNameDialog } from "./client-name-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink, CheckCircle2, Clock, Loader2 } from "lucide-react"

const ERPS = [
  {
    id: "bling",
    name: "Bling",
    description: "ERP de gestão empresarial",
    color: "bg-orange-500",
    url: "https://developer.bling.com.br/aplicativos",
    available: true,
  },
  {
    id: "tiny",
    name: "Tiny",
    description: "ERP online para pequenas empresas",
    color: "bg-blue-600",
    url: "https://api.tiny.com.br",
    available: true,
  },
  {
    id: "anymarket",
    name: "Anymarket",
    description: "Marketplace e gestão de canais",
    color: "bg-purple-600",
    url: null,
    available: false,
  },
]

export function AppStore() {
  const { data: integrations, isLoading } = useIntegrations()
  const [selectedERP, setSelectedERP] = useState<(typeof ERPS)[number] | null>(null)
  const [pendingClientERP, setPendingClientERP] = useState<{
    erpId: string
    clientId: string
    clientSecret: string
  } | null>(null)

  const connected = (integrations ?? []).map((i) => ({
    slug: i.provider_slug || "",
    client_name: i.client_name,
    status: i.status,
  }))

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-52" />
        ))}
      </div>
    )
  }

  const isConnected = (erpId: string) =>
    connected.some((c) => c.slug === erpId && c.status === "active")

  const getClientName = (erpId: string) =>
    connected.find((c) => c.slug === erpId)?.client_name

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {ERPS.map((erp) => {
          const connected_ = isConnected(erp.id)
          const clientName = getClientName(erp.id)

          return (
            <Card
              key={erp.id}
              className={`relative flex flex-col transition-all ${
                !erp.available ? "opacity-50" : "hover:border-primary/50"
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg text-white font-heading font-bold text-sm ${erp.color}`}
                    >
                      {erp.name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-base font-heading">
                        {erp.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {erp.description}
                      </p>
                    </div>
                  </div>
                  {connected_ && (
                    <Badge className="bg-emerald-600 text-white">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Conectado
                    </Badge>
                  )}
                  {!erp.available && (
                    <Badge variant="secondary">
                      <Clock className="mr-1 h-3 w-3" />
                      Em breve
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                {connected_ && clientName && (
                  <p className="text-sm text-muted-foreground">
                    Cliente: <span className="text-foreground font-medium">{clientName}</span>
                  </p>
                )}
                {!connected_ && erp.available && (
                  <p className="text-sm text-muted-foreground">
                    Conecte sua conta do {erp.name} para começar.
                  </p>
                )}
                {!erp.available && (
                  <p className="text-sm text-muted-foreground">Em desenvolvimento.</p>
                )}
              </CardContent>

              <CardFooter className="gap-2">
                {erp.available && !connected_ && (
                  <Button
                    className="w-full"
                    onClick={() => setSelectedERP(erp)}
                  >
                    Conectar
                  </Button>
                )}
                {erp.url && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(erp.url!, "_blank")}
                    title="Ver documentação"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <ConnectDialog
        erp={selectedERP}
        open={!!selectedERP}
        onOpenChange={() => setSelectedERP(null)}
        onCredentialsSaved={(clientId, clientSecret) => {
          if (selectedERP) {
            setPendingClientERP({ erpId: selectedERP.id, clientId, clientSecret })
          }
          setSelectedERP(null)
        }}
      />

      <ClientNameDialog
        erpInfo={pendingClientERP}
        open={!!pendingClientERP}
        onOpenChange={() => setPendingClientERP(null)}
        onComplete={() => setPendingClientERP(null)}
      />
    </>
  )
}
