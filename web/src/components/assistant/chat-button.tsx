"use client"

import { Bot, MessageCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { useChatContext } from "./chat-provider"
import { ChatDialog } from "./chat-dialog"

export function ChatButton() {
  const { toggle, isOpen } = useChatContext()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          onClick={toggle}
          className="fixed bottom-6 right-6 z-40 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:shadow-xl hover:-translate-y-px"
        >
          {isOpen ? <MessageCircle className="size-5" /> : <Bot className="size-5" />}
        </TooltipTrigger>
        <TooltipContent side="left">Assistente IA</TooltipContent>
      </Tooltip>
      <ChatDialog />
    </TooltipProvider>
  )
}
