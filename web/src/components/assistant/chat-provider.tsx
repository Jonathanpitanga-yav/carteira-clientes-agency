"use client"

import { createContext, useContext, useCallback, useState, useRef, type ReactNode } from "react"

export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

type ChatContext = {
  messages: Message[]
  isOpen: boolean
  isLoading: boolean
  open: () => void
  close: () => void
  toggle: () => void
  sendMessage: (text: string) => Promise<void>
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

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => { setIsOpen(false); abortRef.current?.abort() }, [])
  const toggle = useCallback(() => setIsOpen((v) => !v), [])

  const clearMessages = useCallback(() => setMessages([]), [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    const assistantId = crypto.randomUUID()
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }])

    try {
      abortRef.current = new AbortController()
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })) }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro na requisição")
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
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content || "Erro ao conectar. Tente novamente." } : m)))
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [messages, isLoading])

  return (
    <ChatContext value={{ messages, isOpen, isLoading, open, close, toggle, sendMessage, clearMessages }}>
      {children}
    </ChatContext>
  )
}
