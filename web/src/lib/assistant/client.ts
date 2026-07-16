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

export const CHAT_MODEL = "deepseek-v4-flash"
