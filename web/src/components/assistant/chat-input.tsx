"use client"

import { useState, useRef, useCallback } from "react"
import { ArrowUp, Orbit, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useChatContext } from "./chat-provider"
import { ChatSuggestions } from "./chat-suggestions"
import { AVAILABLE_MODELS } from "@/lib/assistant/client"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export function ChatInput() {
  const [text, setText] = useState("")
  const { sendMessage, isLoading, activeConversation, selectedModel, setSelectedModel } = useChatContext()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const empty = !activeConversation || activeConversation.messages.length === 0
  const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModel)

  const handleSubmit = useCallback(() => {
    if (!text.trim() || isLoading) return
    sendMessage(text.trim())
    setText("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [text, isLoading, sendMessage])

  const handleSuggestion = useCallback((q: string) => {
    sendMessage(q)
  }, [sendMessage])

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
    <div className="border-t bg-background">
      {empty && <ChatSuggestions onSelect={handleSuggestion} />}
      <div className="flex items-end gap-2 p-3 pb-1.5">
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

      <div className="flex items-center justify-between px-3 pb-2.5">
        <Select value={selectedModel} onValueChange={(v) => v && setSelectedModel(v)}>
          <SelectTrigger
            size="sm"
            className={cn(
              "h-6 gap-1 border border-border/40 bg-muted/30 px-2 rounded-full text-[11px]",
              "hover:bg-muted/60 hover:border-border/60 transition-colors",
              "focus-visible:ring-1 focus-visible:ring-ring/30",
            )}
          >
            <Orbit className="size-3 shrink-0 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" className="min-w-48">
            {AVAILABLE_MODELS.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <div className="flex items-center justify-between w-full gap-3">
                  <div className="flex flex-col items-start">
                    <span className="text-xs font-medium">{m.label}</span>
                    <span className="text-[10px] text-muted-foreground">{m.description}</span>
                  </div>
                  {m.id === selectedModel && (
                    <Check className="size-3.5 text-primary shrink-0" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-[10px] text-muted-foreground/40">
          {currentModel?.id === "deepseek-v4-flash-free" ? "Grátis" : "Premium"}
        </span>
      </div>
    </div>
  )
}
