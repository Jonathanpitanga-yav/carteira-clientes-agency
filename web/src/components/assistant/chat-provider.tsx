"use client"

import { createContext, useContext, useCallback, useState, useRef, useEffect, type ReactNode } from "react"
import { DEFAULT_MODEL } from "@/lib/assistant/client"

const STORAGE_KEY = "yav-chat-conversations"

export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  isError?: boolean
}

export type Conversation = {
  id: string
  title: string
  messages: Message[]
  model: string
  createdAt: number
  updatedAt: number
  pinned?: boolean
}

export type ProgressPhase = "sending" | "querying" | "tools" | "generating" | null

type ChatContext = {
  conversations: Conversation[]
  activeId: string | null
  activeConversation: Conversation | null
  isLoading: boolean
  progressPhase: ProgressPhase
  currentTool: string | null
  isOpen: boolean
  selectedModel: string
  isExpanded: boolean
  showHistory: boolean
  open: () => void
  close: () => void
  toggle: () => void
  newConversation: () => void
  switchConversation: (id: string) => void
  deleteConversation: (id: string) => void
  togglePin: (id: string) => void
  exportConversation: () => void
  setSelectedModel: (model: string) => void
  setExpanded: (v: boolean) => void
  setShowHistory: (v: boolean) => void
  sendMessage: (text: string) => Promise<void>
  retryLast: () => Promise<void>
}

const ChatContext = createContext<ChatContext | null>(null)

export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider")
  return ctx
}

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveConversations(list: Conversation[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch { }
}

function createConv(model: string): Conversation {
  return {
    id: crypto.randomUUID(),
    title: "Nova conversa",
    messages: [],
    model,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function convSorter(a: Conversation, b: Conversation) {
  if (a.pinned && !b.pinned) return -1
  if (!a.pinned && b.pinned) return 1
  return b.updatedAt - a.updatedAt
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [isLoading, setIsLoading] = useState(false)
  const [progressPhase, setProgressPhase] = useState<ProgressPhase>(null)
  const [currentTool, setCurrentTool] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const lastUserTextRef = useRef<string>("")
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messagesRef = useRef<Message[]>([])
  const activeIdRef = useRef<string | null>(null)

  useEffect(() => { saveConversations(conversations) }, [conversations])
  useEffect(() => { activeIdRef.current = activeId }, [activeId])

  const activeConversation = activeId ? conversations.find((c) => c.id === activeId) ?? null : null

  useEffect(() => {
    messagesRef.current = activeConversation?.messages ?? []
  }, [activeConversation])

  const patchConv = useCallback((id: string, fn: (c: Conversation) => Conversation) => {
    setConversations((prev) => prev.map((c) => c.id === id ? { ...fn(c), updatedAt: Date.now() } : c))
  }, [])

  const patchMessage = useCallback((convId: string, msgId: string, fn: (m: Message) => Message) => {
    patchConv(convId, (c) => ({ ...c, messages: c.messages.map((m) => m.id === msgId ? fn(m) : m) }))
  }, [patchConv])

  const open = useCallback(() => {
    setIsOpen(true)
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations.sort(convSorter)[0].id)
    } else if (!activeId) {
      const conv = createConv(selectedModel)
      setConversations((prev) => [conv, ...prev])
      setActiveId(conv.id)
    }
  }, [activeId, conversations, selectedModel])

  const close = useCallback(() => {
    setIsOpen(false)
    setIsExpanded(false)
    setShowHistory(false)
    setProgressPhase(null)
    setCurrentTool(null)
    abortRef.current?.abort()
  }, [])

  const toggle = useCallback(() => {
    if (isOpen) close()
    else open()
  }, [isOpen, open, close])

  const newConversation = useCallback(() => {
    const conv = createConv(selectedModel)
    setConversations((prev) => [conv, ...prev])
    setActiveId(conv.id)
    setShowHistory(false)
  }, [selectedModel])

  const switchConversation = useCallback((id: string) => {
    setActiveId(id)
    setShowHistory(false)
    const conv = conversations.find((c) => c.id === id)
    if (conv) setSelectedModel(conv.model)
  }, [conversations])

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    if (activeId === id) {
      setActiveId(conversations.find((c) => c.id !== id)?.id ?? null)
    }
  }, [activeId, conversations])

  const togglePin = useCallback((id: string) => {
    patchConv(id, (c) => ({ ...c, pinned: !c.pinned }))
  }, [patchConv])

  const exportConversation = useCallback(() => {
    const conv = conversations.find((c) => c.id === activeId)
    if (!conv || conv.messages.length === 0) return

    const lines = [
      `# ${conv.title}`,
      `**Exportado em:** ${new Date().toLocaleString("pt-BR")}`,
      `**Modelo:** ${conv.model}`,
      "",
      "---",
      "",
    ]
    for (const msg of conv.messages) {
      lines.push(`### ${msg.role === "user" ? "👤 Pergunta" : "🤖 Resposta"}`)
      lines.push("")
      lines.push(msg.content)
      lines.push("")
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${conv.title.replace(/[^a-zA-Z0-9]/g, "_")}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [activeId, conversations])

  const sendMessageFn = useCallback(async (text: string) => {
    if (!text.trim()) return
    setIsLoading(true)
    setProgressPhase("sending")

    let convId = activeId
    if (!convId) {
      const conv = createConv(selectedModel)
      setConversations((prev) => [conv, ...prev])
      setActiveId(conv.id)
      convId = conv.id
    }

    const title = text.length > 50 ? text.slice(0, 50) + "…" : text
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text }
    const assistantId = crypto.randomUUID()

    patchConv(convId, (c) => ({
      ...c,
      title: c.title === "Nova conversa" ? title : c.title,
      messages: [...c.messages, userMsg, { id: assistantId, role: "assistant", content: "" }],
    }))

    lastUserTextRef.current = text

    progressTimerRef.current = setTimeout(() => setProgressPhase("querying"), 2000)

    try {
      abortRef.current = new AbortController()
      const timeoutId = setTimeout(() => abortRef.current?.abort(), 120000)

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messagesRef.current, userMsg].map(({ role, content }) => ({ role, content })),
          model: selectedModel,
        }),
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
      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = JSON.parse(line.slice(6))
          switch (data.type) {
            case "content":
              fullContent += data.content
              setProgressPhase("generating")
              setCurrentTool(null)
              patchMessage(convId, assistantId, (m) => ({ ...m, content: fullContent }))
              break
            case "tool_status":
              setProgressPhase("tools")
              setCurrentTool(data.label)
              break
            case "tool_done":
              setCurrentTool(null)
              break
            case "error":
              throw new Error(data.content || "Erro no processamento")
          }
        }
      }

      patchMessage(convId, assistantId, (m) =>
        !m.content.trim() ? { ...m, content: "Nenhum dado encontrado para essa consulta.", isError: true } : m
      )
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === "AbortError"
      const errorMsg = isAbort
        ? "A requisição excedeu o tempo limite. Tente novamente."
        : err instanceof Error ? err.message : "Erro ao conectar"

      patchMessage(convId, assistantId, (m) => ({ ...m, content: errorMsg, isError: true }))
    } finally {
      setIsLoading(false)
      setProgressPhase(null)
      setCurrentTool(null)
      abortRef.current = null
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current)
    }
  }, [activeId, selectedModel, patchConv, patchMessage])

  const retryLast = useCallback(async () => {
    const text = lastUserTextRef.current
    if (!text || !activeId) return

    const lastUserIdx = messagesRef.current.findLastIndex((m) => m.role === "user")
    if (lastUserIdx === -1) return

    patchConv(activeId, (c) => ({ ...c, messages: c.messages.slice(0, lastUserIdx) }))
    await sendMessageFn(text)
  }, [activeId, patchConv, sendMessageFn])

  return (
    <ChatContext value={{
      conversations,
      activeId,
      activeConversation,
      isLoading,
      progressPhase,
      currentTool,
      isOpen,
      selectedModel,
      isExpanded,
      showHistory,
      open,
      close,
      toggle,
      newConversation,
      switchConversation,
      deleteConversation,
      togglePin,
      exportConversation,
      setSelectedModel,
      setExpanded: setIsExpanded,
      setShowHistory,
      sendMessage: sendMessageFn,
      retryLast,
    }}>
      {children}
    </ChatContext>
  )
}
