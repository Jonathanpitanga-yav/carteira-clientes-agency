"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ExternalLink, Loader2 } from "lucide-react"

type ERP = {
  id: string
  name: string
  url: string | null
}

type Props = {
  erp: ERP | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCredentialsSaved: (clientId: string, clientSecret: string) => void
}

export function ConnectDialog({ erp, open, onOpenChange, onCredentialsSaved }: Props) {
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [redirecting, setRedirecting] = useState(false)

  if (!erp) return null

  const handleConnect = async () => {
    if (!clientId.trim() || !clientSecret.trim()) return
    setRedirecting(true)

    // Simula o redirect OAuth (futuramente será real)
    await new Promise((r) => setTimeout(r, 1500))

    if (erp.url) {
      const params = new URLSearchParams({
        client_id: clientId.trim(),
        redirect_uri: `${window.location.origin}/api/integrations/${erp.id}/callback`,
        response_type: "code",
        state: crypto.randomUUID(),
      })
      window.open(`${erp.url}/authorize?${params}`, "_blank")
    }

    setRedirecting(false)
    onCredentialsSaved(clientId.trim(), clientSecret.trim())
    setClientId("")
    setClientSecret("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conectar {erp.name}</DialogTitle>
          <DialogDescription>
            Insira as credenciais do seu aplicativo no {erp.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientId">Client ID</Label>
            <Input
              id="clientId"
              placeholder="Cole o Client ID do seu app"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientSecret">Client Secret</Label>
            <Input
              id="clientSecret"
              type="password"
              placeholder="Cole o Client Secret do seu app"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
          </div>

          {erp.url && (
            <a
              href={erp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Criar aplicativo no {erp.name}
            </a>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConnect}
            disabled={!clientId.trim() || !clientSecret.trim() || redirecting}
          >
            {redirecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {redirecting ? "Redirecionando..." : "Conectar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
