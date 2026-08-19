"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, KeyRound, ArrowRight } from "lucide-react"
import { ROUTES } from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"
import { humanError } from "@/lib/utils/errors"
import { toast } from "sonner"
import { Logo } from "@/components/ui/logo"

export function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não conferem.")
      return
    }

    setIsLoading(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      toast.error(humanError(error.message))
      setIsLoading(false)
      return
    }

    await supabase.auth.updateUser({ data: { is_temp_password: false } })

    toast.success("Senha alterada com sucesso!")
    router.push(ROUTES.ADMIN)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 bg-[#080A0E] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,246,246,0.08),_transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(110,41,246,0.10),_transparent_55%)] pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-primary" />
      <Card className="relative w-full max-w-sm border-white/10 shadow-[0_22px_76px_rgba(0,0,0,0.30)] bg-[#11131A]">
        <CardHeader className="text-center pt-8 pb-4">
          <Logo variant="login" className="justify-center mb-3" />
          <CardTitle className="text-lg font-heading">Definir nova senha</CardTitle>
          <CardDescription className="text-xs">
            Este é seu primeiro acesso. Crie uma nova senha para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-xs font-medium">Nova senha</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-xs font-medium">Confirmar senha</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-9"
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Alterar senha e entrar
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
