"use client"

import { useState } from "react"
import { useIntegrations } from "@/hooks/use-integrations"
import { ConnectDialog } from "./connect-dialog"
import { ClientNameDialog } from "./client-name-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ExternalLink, CheckCircle2, Clock, Users } from "lucide-react"

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

  const connectionsByERP = (integrations ?? []).reduce(
    (acc, i) => {
      const slug = i.provider_slug || ""
      if (!acc[slug]) acc[slug] = []
      acc[slug].push(i)
      return acc
    },
    {} as Record<string, typeof integrations>,
  )

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-52" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {ERPS.map((erp) => {
          const conns = connectionsByERP[erp.id] || []
          const activeConns = conns.filter((c) => c.status === "active")

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
                  {activeConns.length > 0 && (
                    <Badge className="bg-emerald-600 text-white whitespace-nowrap">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      {activeConns.length} conectado{activeConns.length > 1 ? "s" : ""}
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
                {conns.length > 0 ? (
                  <ul className="space-y-1">
                    {conns.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{c.client_name ?? "—"}</span>
                        <Badge
                          variant="outline"
                          className={`ml-auto text-xs ${
                            c.status === "active"
                              ? "border-emerald-600 text-emerald-600"
                              : c.status === "expired"
                                ? "border-orange-500 text-orange-500"
                                : c.status === "error"
                                  ? "border-red-600 text-red-600"
                                  : ""
                          }`}
                        >
                          {c.status === "active"
                            ? "Ativo"
                            : c.status === "expired"
                              ? "Expirado"
                              : c.status === "error"
                                ? "Erro"
                                : c.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {erp.available
                      ? `Conecte sua conta do ${erp.name} para começar.`
                      : "Em desenvolvimento."}
                  </p>
                )}
              </CardContent>

              <CardFooter className="gap-2">
                {erp.available && (
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
