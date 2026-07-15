"use client"

import { useState } from "react"
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
import { useCreateUser } from "@/hooks/use-users"
import { ROLES, ROLE_LABELS, type Role } from "@/lib/constants"
import { Loader2, Copy, Check, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$"
  let pw = ""
  for (let i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)]
  return pw
}

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  full_name: z.string().min(1, "Nome é obrigatório"),
  roles: z.array(z.string()).min(1, "Selecione pelo menos um papel"),
})

type FormData = z.infer<typeof schema>

type Props = { open: boolean; onOpenChange: (open: boolean) => void }

export function CreateUserDialog({ open, onOpenChange }: Props) {
  const [tempPassword, setTempPassword] = useState(generatePassword)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const create = useCreateUser()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({
      resolver: zodResolver(schema),
      defaultValues: { email: "", full_name: "", roles: [] },
    })

  const selectedRoles = watch("roles") ?? []

  const toggleRole = (role: string) => {
    const current = selectedRoles
    const next = current.includes(role)
      ? current.filter((r: string) => r !== role)
      : [...current, role]
    setValue("roles", next, { shouldValidate: true })
  }

  const handleClose = () => {
    reset()
    setTempPassword(generatePassword())
    setShowPassword(false)
    setCopied(false)
    onOpenChange(false)
  }

  const onSubmit = async (data: FormData) => {
    await create.mutateAsync({ ...data, password: tempPassword })
    handleClose()
  }

  const copyPassword = async () => {
    await navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const regeneratePassword = () => {
    setTempPassword(generatePassword())
    setCopied(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>
            Crie um usuário com senha temporária. O usuário deverá trocar a senha no primeiro login.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="usuario@email.com" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nome</Label>
            <Input id="full_name" {...register("full_name")} />
            {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
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
            {errors.roles && <p className="text-xs text-destructive">{errors.roles.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Senha temporária</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={tempPassword}
                  readOnly
                  className="pr-9 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="button" variant="outline" size="icon" onClick={copyPassword} title="Copiar senha">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <button type="button" onClick={regeneratePassword} className="text-xs text-muted-foreground hover:text-foreground">
              Regenerar senha
            </button>
            <p className={cn("text-xs", copied ? "text-green-500" : "text-muted-foreground")}>
              {copied ? "Senha copiada!" : "Copie a senha e envie ao usuário. Ela não será exibida novamente."}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar usuário
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
