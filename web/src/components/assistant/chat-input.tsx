"use client"

import { useState, useRef, useCallback } from "react"
import { ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useChatContext } from "./chat-provider"

export function ChatInput() {
  const [text, setText] = useState("")
  const { sendMessage, isLoading } = useChatContext()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(() => {
    if (!text.trim() || isLoading) return
    sendMessage(text.trim())
    setText("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [text, isLoading, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    const el = e.target
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  return (
    <div className="flex items-end gap-2 border-t bg-background p-3">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Pergunte sobre os dados..."
        rows={1}
        className="min-h-[36px] flex-1 resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <Button
        size="icon"
        onClick={handleSubmit}
        disabled={!text.trim() || isLoading}
        className="shrink-0"
      >
        <ArrowUp className="size-4" />
      </Button>
    </div>
  )
}
