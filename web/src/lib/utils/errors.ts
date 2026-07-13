const errorMap: Record<string, string> = {
  "duplicate key value violates unique constraint":
    "Já existe um registro com este valor.",
  "violates foreign key constraint":
    "Este registro está vinculado a outros dados e não pode ser removido.",
  "42501": "Você não tem permissão para realizar esta ação.",
  "429": "Muitas requisições. Aguarde um momento e tente novamente.",
  "Invalid login credentials":
    "E-mail ou senha incorretos.",
  "Email not confirmed":
    "Este e-mail ainda não foi confirmado. Verifique sua caixa de entrada.",
  "User already registered":
    "Este e-mail já está cadastrado. Faça login ou solicite uma nova senha.",
  "Token has expired or is invalid":
    "O link expirou ou é inválido. Solicite um novo.",
}

export function humanError(error: unknown): string {
  if (!error) return "Ocorreu um erro inesperado. Tente novamente."

  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : String(error)

  for (const [key, human] of Object.entries(errorMap)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return human
    }
  }

  return "Ocorreu um erro inesperado. Tente novamente."
}
