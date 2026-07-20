"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Bot, RefreshCw, User, Copy, Check, Loader2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Markdown } from "./chat-markdown"
import { ChatInlineVisualization } from "./chat-visualization"
import { useChatContext } from "./chat-provider"

export function ChatMessage({ message, isLast }: { message: { id: string; role: "user" | "assistant"; content: string; isError?: boolean }; isLast?: boolean }) {
  const { retryLast, isLoading, progressPhase, currentTool } = useChatContext()
  const [copied, setCopied] = useState(false)
  const isUser = message.role === "user"

  const progressLabels: Record<string, string> = {
    sending: "Processando sua pergunta",
    querying: "Consultando dados",
    generating: "Montando resposta",
  }

  const isLoadingLast = isLast && isLoading && progressPhase

  const reportHtml = useMemo(() => {
    if (isUser || !message.content) return null
    const match = message.content.match(/<!--REPORT-->([\s\S]*?)<!--\/REPORT-->/)
    if (match) return match[1].trim()
    const codeMatch = message.content.match(/```html\n([\s\S]*?)```/)
    if (codeMatch && (codeMatch[1].includes("<!DOCTYPE html") || codeMatch[1].includes("<html"))) return codeMatch[1].trim()
    return null
  }, [message.content, isUser])

  const displayContent = useMemo(() => {
    if (!message.content) return ""
    if (isUser) return message.content
    const full = message.content.replace(/<!--REPORT-->[\s\S]*?<!--\/REPORT-->/, "").replace(/```html[\s\S]*?```/, "")
    if (full !== message.content) return full.trim()
    const idx = message.content.indexOf("<!--REPORT")
    if (idx !== -1) return message.content.substring(0, idx).trim()
    return message.content
  }, [message.content, isUser])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(isUser ? message.content : displayContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenReport = () => {
    if (!reportHtml) return
    const blob = new Blob([reportHtml], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank")
  }

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>

      <div className={cn("max-w-[85%] space-y-1.5", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : message.isError
                ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-sm"
                : "bg-muted text-foreground rounded-tl-sm",
          )}
        >
          {(isUser ? message.content : displayContent) ? (
            isUser ? (
              <p>{message.content}</p>
            ) : (
              <>
                <Markdown content={displayContent} />
                <ChatInlineVisualization content={displayContent} />
              </>
            )
          ) : isLoadingLast && progressPhase === "tools" && currentTool ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex size-5 shrink-0">
                  <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                  <span className="relative inline-flex size-5 items-center justify-center rounded-full bg-primary/10">
                    <Loader2 className="size-3 text-primary animate-spin" />
                  </span>
                </span>
                <span className="text-xs font-medium text-foreground">{currentTool}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
                <span className="size-1 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="size-1 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="size-1 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          ) : isLoadingLast ? (
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground italic text-xs">
                <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
              <span className="text-[11px] text-muted-foreground/60 font-medium tracking-wide">
                {progressLabels[progressPhase]}
              </span>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground italic">
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          )}
        </div>

        <div className={cn("flex gap-1", isUser ? "justify-end" : "justify-start")}>
          {!isUser && message.content && (
            <>
              <Button variant="ghost" size="xs" onClick={handleCopy} className="gap-1">
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
              {reportHtml && (
                <Button variant="ghost" size="xs" onClick={handleOpenReport} className="gap-1">
                  <FileText className="size-3" />
                  Abrir relatório
                </Button>
              )}
            </>
          )}
          {message.isError && isLast && !isLoading && (
            <Button variant="ghost" size="xs" onClick={retryLast}>
              <RefreshCw className="size-3 mr-1" />
              Tentar novamente
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
