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
import { Checkbox } from "@/components/ui/checkbox"
import { useUpdateUser, type UserProfile } from "@/hooks/use-users"
import { ROLES, ROLE_LABELS, type Role } from "@/lib/constants"
import { Loader2 } from "lucide-react"

const schema = z.object({
  full_name: z.string().min(1, "Nome é obrigatório"),
  roles: z.array(z.string()).min(1, "Selecione pelo menos um papel"),
})

type FormData = z.infer<typeof schema>

type Props = {
  user: UserProfile
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserFormDialog({ user, open, onOpenChange }: Props) {
  const update = useUpdateUser()

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { full_name: user.full_name ?? "", roles: user.roles ?? [user.role ?? "client"] },
    })

  useEffect(() => {
    setValue("full_name", user.full_name ?? "")
    setValue("roles", user.roles ?? [user.role ?? "client"])
  }, [user, setValue])

  const selectedRoles = watch("roles") ?? []

  const toggleRole = (role: string) => {
    const current = selectedRoles
    const next = current.includes(role)
      ? current.filter((r: string) => r !== role)
      : [...current, role]
    setValue("roles", next, { shouldValidate: true })
  }

  const onSubmit = async (data: FormData) => {
    await update.mutateAsync({ id: user.id, ...data })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>Altere os dados do usuário abaixo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome</Label>
            <Input id="full_name" {...register("full_name")} />
            {errors.full_name && (
              <p className="text-xs text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Papéis</Label>
            <div className="space-y-2 rounded-lg border p-3">
              {ROLES.filter((r) => r !== "client").map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selectedRoles.includes(r)}
                    onCheckedChange={() => toggleRole(r)}
                  />
                  {ROLE_LABELS[r as Role]}
                </label>
              ))}
            </div>
            {errors.roles && (
              <p className="text-xs text-destructive">{errors.roles.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}