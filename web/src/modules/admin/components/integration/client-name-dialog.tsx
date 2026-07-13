"use client"

import { useState } from "react"
import { useCreateIntegrationClient } from "@/hooks/use-integrations"
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
import { Loader2, CheckCircle2 } from "lucide-react"

type Props = {
  erpInfo: { erpId: string; clientId: string; clientSecret: string } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

const ERP_NAMES: Record<string, string> = {
  bling: "Bling",
  tiny: "Tiny",
  anymarket: "Anymarket",
}

export function ClientNameDialog({ erpInfo, open, onOpenChange, onComplete }: Props) {
  const [clientName, setClientName] = useState("")
  const create = useCreateIntegrationClient()

  if (!erpInfo) return null

  const erpName = ERP_NAMES[erpInfo.erpId] ?? erpInfo.erpId

  const handleConfirm = async () => {
    if (!clientName.trim()) return

    await create.mutateAsync({
      erpId: erpInfo.erpId,
      clientName: clientName.trim(),
      credentials: {
        client_id: erpInfo.clientId,
        client_secret: erpInfo.clientSecret,
      },
    })

    setClientName("")
    onComplete()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cliente conectado</DialogTitle>
          <DialogDescription>
            Autenticação com {erpName} realizada com sucesso!
            <br />
            Dê um nome para este cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-600/10 p-3 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Autenticado via {erpName}
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientName">Nome do cliente</Label>
            <Input
              id="clientName"
              placeholder="Ex: Empresa ABC Ltda"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!clientName.trim() || create.isPending}
          >
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
