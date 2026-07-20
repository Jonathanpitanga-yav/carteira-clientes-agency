import OpenAI from "openai"

let _client: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (!_client) {
    const key = process.env.OPENAI_API_KEY
    if (!key) throw new Error("OPENAI_API_KEY não configurada")
    _client = new OpenAI({
      apiKey: key,
      baseURL: "https://opencode.ai/zen/v1",
    })
  }
  return _client
}

export const AVAILABLE_MODELS = [
  { id: "deepseek-v4-flash-free", label: "DeepSeek V4 Flash Free", description: "Grátis — consultas rápidas" },
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", description: "Balanceado — velocidade e qualidade" },
  { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", description: "Máxima qualidade e precisão" },
] as const

export const DEFAULT_MODEL = "deepseek-v4-flash-free"
