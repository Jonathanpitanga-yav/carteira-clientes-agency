"use client"

import { createContext, useContext, useCallback, useState, useRef, type ReactNode } from "react"

export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  isError?: boolean
}

type ChatContext = {
  messages: Message[]
  isOpen: boolean
  isLoading: boolean
  open: () => void
  close: () => void
  toggle: () => void
  sendMessage: (text: string) => Promise<void>
  retryLast: () => Promise<void>
  clearMessages: () => void
}

const ChatContext = createContext<ChatContext | null>(null)

export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider")
  return ctx
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const lastUserTextRef = useRef<string>("")

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => { setIsOpen(false); abortRef.current?.abort() }, [])
  const toggle = useCallback(() => setIsOpen((v) => !v), [])

  const clearMessages = useCallback(() => setMessages([]), [])

  const sendMessageFn = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return
    lastUserTextRef.current = text

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text }
    const assistantId = crypto.randomUUID()

    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }])
    setIsLoading(true)

    try {
      abortRef.current = new AbortController()
      const timeoutId = setTimeout(() => abortRef.current?.abort(), 60000)

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })) }),
        signal: abortRef.current.signal,
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        let errMsg = "Erro na requisição"
        try { const err = await res.json(); errMsg = err.error || errMsg } catch { errMsg = `HTTP ${res.status}` }
        throw new Error(errMsg)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("Sem stream")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = JSON.parse(line.slice(6))
          if (data.type === "content") {
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + data.content } : m)))
          }
          if (data.type === "error") {
            throw new Error(data.content || "Erro no processamento")
          }
        }
      }

      setMessages((prev) => prev.map((m) => m.id === assistantId && !m.content.trim() ? { ...m, content: "Nenhum dado encontrado para essa consulta.", isError: true } : m))
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "A requisição excedeu o tempo limite. Tente novamente.", isError: true } : m))
      } else {
        const msg = err instanceof Error ? err.message : "Erro ao conectar"
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: msg, isError: true } : m))
      }
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [messages, isLoading])

  const retryLast = useCallback(async () => {
    const text = lastUserTextRef.current
    if (!text) return

    setMessages((prev) => {
      const lastUserIdx = prev.findLastIndex((m) => m.role === "user")
      if (lastUserIdx === -1) return prev
      return prev.slice(0, lastUserIdx)
    })

    await sendMessageFn(text)
  }, [sendMessageFn])

  return (
    <ChatContext value={{ messages, isOpen, isLoading, open, close, toggle, sendMessage: sendMessageFn, retryLast, clearMessages }}>
      {children}
    </ChatContext>
  )
}
