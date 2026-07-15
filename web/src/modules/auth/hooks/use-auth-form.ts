import { useCallback, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { humanError } from "@/lib/utils/errors"
import { toast } from "sonner"

export function useAuthForm() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(humanError(error.message))
      setIsLoading(false)
      return { ok: false, signIn: false, isTempPassword: false }
    }

    toast.success("Login realizado com sucesso!")
    const isTemp = !!data.user?.user_metadata?.is_temp_password
    return { ok: true, signIn: true, isTempPassword: isTemp }
  }, [])

  const sendMagicLink = useCallback(async (email: string) => {
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })

    if (error) {
      toast.error(humanError(error.message))
      setIsLoading(false)
      return false
    }

    toast.success("Link mágico enviado! Verifique seu e-mail.")
    setIsLoading(false)
    return true
  }, [])

  return { signIn, sendMagicLink, isLoading }
}
