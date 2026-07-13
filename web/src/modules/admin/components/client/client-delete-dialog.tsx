"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useDeleteClient, type Client } from "@/hooks/use-clients"
import { Loader2 } from "lucide-react"

type Props = {
  client: Client
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClientDeleteDialog({ client, open, onOpenChange }: Props) {
  const deleteClient = useDeleteClient()

  const handleDelete = async () => {
    await deleteClient.mutateAsync(client.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover cliente</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover <strong>{client.name}</strong>?
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteClient.isPending}
          >
            {deleteClient.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Remover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
