"use client"

import { useRef, useEffect } from "react"
import { X, Trash2, Bot, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useChatContext } from "./chat-provider"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"

export function ChatDialog() {
  const { messages, isOpen, close, isLoading, clearMessages } = useChatContext()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <div className="pointer-events-auto flex h-[600px] w-[420px] flex-col rounded-2xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-primary" />
            <span className="text-sm font-medium">Assistente YAV</span>
            {isLoading && <Loader2 className="size-3.5 text-muted-foreground animate-spin" />}
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button variant="ghost" size="icon-xs" onClick={clearMessages}>
                <Trash2 className="size-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon-xs" onClick={close}>
              <X className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Bot className="mb-3 size-10 text-primary" />
              <p className="text-sm font-medium">Pergunte sobre seus dados</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Faturamento, curva ABC, pedidos, clientes e mais.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatMessage key={msg.id} message={msg} isLast={i === messages.length - 1} />
          ))}
          <div ref={bottomRef} />
        </div>

        <ChatInput />
      </div>
    </div>
  )
}
