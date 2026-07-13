"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { useCreateApiToken } from "@/hooks/use-api-tokens"
import { Loader2 } from "lucide-react"

const schema = z.object({
  expires_at: z.string().optional(),
})

type FormData = z.infer<typeof schema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TokenCreateDialog({ open, onOpenChange }: Props) {
  const create = useCreateApiToken()

  const { register, handleSubmit, formState: { isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema) as any,
      defaultValues: { expires_at: "" },
    })

  const onSubmit = async (data: FormData) => {
    await create.mutateAsync({
      expires_at: data.expires_at || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo token de API</DialogTitle>
          <DialogDescription>
            O token será exibido apenas uma vez após a criação.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="expires_at">Data de expiração (opcional)</Label>
            <Input id="expires_at" type="date" {...register("expires_at")} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar token
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
