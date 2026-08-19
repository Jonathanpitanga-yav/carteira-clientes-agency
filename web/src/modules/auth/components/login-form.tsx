"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useAuthForm } from "@/modules/auth/hooks/use-auth-form"
import { ROUTES } from "@/lib/constants"
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react"
import { Logo } from "@/components/ui/logo"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<"password" | "magic">("password")
  const { signIn, sendMagicLink, isLoading } = useAuthForm()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "password") {
      const result = await signIn(email, password)
      if (result.ok) {
        router.push(result.isTempPassword ? "/auth/change-password" : ROUTES.ADMIN)
      }
    } else {
      const ok = await sendMagicLink(email)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 bg-[#080A0E] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,246,246,0.08),_transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(110,41,246,0.10),_transparent_55%)] pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-primary" />
      <Card className="relative w-full max-w-sm border-white/10 shadow-[0_22px_76px_rgba(0,0,0,0.30)] bg-[#11131A]">
        <CardHeader className="text-center pt-8 pb-4">
          <Logo variant="login" className="justify-center mb-3" />
          <p className="text-sm text-muted-foreground">Gestão de carteira de clientes</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="seu@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required autoFocus className="pl-9" />
              </div>
            </div>
            {mode === "password" && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)} required className="pl-9" />
                </div>
              </div>
            )}
            <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90 transition-opacity" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "password" ? "Entrar" : "Enviar link mágico"}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
            <button type="button" onClick={() => setMode(mode === "password" ? "magic" : "password")}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
              {mode === "password" ? "Entrar com link mágico" : "Entrar com e-mail e senha"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
