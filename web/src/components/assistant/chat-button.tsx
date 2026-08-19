"use client"

import { Orbit, X } from "lucide-react"
import { useChatContext } from "./chat-provider"
import { ChatDialog } from "./chat-dialog"

export function ChatButton() {
  const { toggle, isOpen } = useChatContext()

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        <div className="relative group/btn">
          {!isOpen && (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-12 rounded-full bg-primary/15 animate-orbit-wave-1" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-12 rounded-full bg-primary/10 animate-orbit-wave-2" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-12 rounded-full bg-primary/5 animate-orbit-wave-3" />
              </div>
            </>
          )}

          <button
            onClick={toggle}
            className="relative z-10 flex items-center rounded-full bg-gradient-primary text-[#030507] shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95 h-12 w-12 justify-center gap-0 hover:w-auto hover:px-4 hover:gap-2.5"
          >
            {isOpen ? <X className="size-5 shrink-0" /> : <Orbit className="size-5 shrink-0" />}
            <span className="overflow-hidden max-w-0 group-hover/btn:max-w-36 transition-all duration-300 text-sm font-medium whitespace-nowrap">
              Yaver Agent
            </span>
          </button>
        </div>
      </div>

      <ChatDialog />
    </>
  )
}
