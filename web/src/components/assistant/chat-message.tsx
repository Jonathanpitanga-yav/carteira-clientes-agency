"use client"

import { cn } from "@/lib/utils"
import { Bot, RefreshCw, User, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useChatContext } from "./chat-provider"

export function ChatMessage({ message, isLast }: { message: { id: string; role: "user" | "assistant"; content: string; isError?: boolean }; isLast?: boolean }) {
  const { retryLast, isLoading } = useChatContext()
  const isUser = message.role === "user"

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

      <div className={cn("max-w-[85%] space-y-2", isUser ? "items-end" : "items-start")}>
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
          {message.content || (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground italic">
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          )}
        </div>

        {message.isError && isLast && !isLoading && (
          <div className="flex gap-1">
            <Button variant="ghost" size="xs" onClick={retryLast}>
              <RefreshCw className="size-3 mr-1" />
              Tentar novamente
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
