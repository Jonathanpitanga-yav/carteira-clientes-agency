"use client"

import { useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateClient, useUpdateClient, type Client } from "@/hooks/use-clients"
import { Loader2 } from "lucide-react"

const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  document: z.string().default(""),
  status: z.enum(["active", "inactive"]),
})

type FormData = z.infer<typeof schema>

type Props = {
  client?: Client
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClientFormDialog({ client, open, onOpenChange }: Props) {
  const create = useCreateClient()
  const update = useUpdateClient()
  const isEditing = !!client

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { name: "", document: "", status: "active" },
  })

  useEffect(() => {
    if (client) {
      setValue("name", client.name)
      setValue("document", client.document ?? "")
      setValue("status", client.status)
    } else {
      reset({ name: "", document: "", status: "active" })
    }
  }, [client, setValue, reset])

  const onSubmit = async (data: FormData) => {
    if (isEditing) {
      await update.mutateAsync({ id: client.id, ...data })
    } else {
      await create.mutateAsync(data)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Altere os dados do cliente abaixo."
              : "Preencha os dados para cadastrar um novo cliente."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="document">CNPJ</Label>
            <Input id="document" placeholder="00.000.000/0000-00" {...register("document")} />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={watch("status")}
              onValueChange={(v) => setValue("status", v as "active" | "inactive")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
