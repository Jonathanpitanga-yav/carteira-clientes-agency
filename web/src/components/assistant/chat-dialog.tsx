"use client"

import { useRef, useEffect, useState, useMemo } from "react"
import {
  X, Trash2, Orbit, Loader2, PanelLeft, PanelRight, Expand, Shrink, Plus, Clock, MessageSquareText,
  Pin, PinOff, Search, Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useChatContext } from "./chat-provider"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { cn } from "@/lib/utils"

function HistorySidebar() {
  const { conversations, activeId, showHistory, setShowHistory, switchConversation, deleteConversation, newConversation, togglePin } = useChatContext()
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const sorted = [...conversations].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return b.updatedAt - a.updatedAt
    })
    if (!q) return sorted
    return sorted.filter((c) => c.title.toLowerCase().includes(q))
  }, [conversations, search])

  return (
    <div className="shrink-0 w-56 border-r bg-muted/30 flex flex-col overflow-hidden animate-in slide-in-from-left-2 duration-200">
      <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0">
        <span className="text-xs font-medium text-muted-foreground">Histórico</span>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon-xs" onClick={newConversation}>
            <Plus className="size-3" />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={() => setShowHistory(false)}>
            <X className="size-3" />
          </Button>
        </div>
      </div>

      <div className="px-2 pt-1.5 pb-1">
        <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-background/50 px-2 py-1 text-xs">
          <Search className="size-3 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversa..."
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
              <X className="size-2.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            {search ? "Nenhuma conversa encontrada" : "Nenhuma ainda"}
          </p>
        )}
        {filtered.map((conv) => (
          <div
            key={conv.id}
            role="button"
            tabIndex={0}
            onClick={() => switchConversation(conv.id)}
            onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); switchConversation(conv.id) } }}
            className={cn(
              "group cursor-pointer w-full text-left rounded-lg px-2.5 py-2 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              conv.id === activeId
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            <div className="flex items-start justify-between gap-1">
              <span className="line-clamp-1 flex items-center gap-1">
                {conv.pinned && <Pin className="size-2.5 fill-primary/40 text-primary/40 shrink-0" />}
                {conv.title}
              </span>
              <div className="flex shrink-0 opacity-0 group-hover:opacity-100 -mr-1 -mt-0.5">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); togglePin(conv.id) }}
                  title={conv.pinned ? "Desafixar" : "Fixar"}
                >
                  {conv.pinned ? <PinOff className="size-2.5" /> : <Pin className="size-2.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); deleteConversation(conv.id) }}
                >
                  <X className="size-2.5" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground/60">
              <Clock className="size-2.5" />
              {new Date(conv.updatedAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
              <MessageSquareText className="size-2.5 ml-1" />
              {conv.messages.filter((m) => m.role === "user").length}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChatDialog() {
  const {
    activeConversation, conversations, activeId, isLoading, progressPhase, currentTool, isOpen, isExpanded, showHistory,
    close, setExpanded, setShowHistory, newConversation, exportConversation,
  } = useChatContext()
  const bottomRef = useRef<HTMLDivElement>(null)
  const messages = activeConversation?.messages ?? []

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      })
    }
  }, [messages, isOpen])

  if (!isOpen) return null
  if (!activeConversation && conversations.length === 0 && activeId === null) return null

  const progressLabels: Record<string, string> = {
    sending: "Processando…",
    querying: "Consultando dados…",
    tools: currentTool ?? "Buscando dados…",
    generating: "Montando resposta…",
  }

  const phaseLabel = progressPhase === "tools" && currentTool ? currentTool : (progressPhase ? progressLabels[progressPhase] : "")

  const header = (
    <div className="flex items-center justify-between border-b px-4 py-2.5 shrink-0">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={() => setShowHistory(!showHistory)}>
          {showHistory ? <PanelRight className="size-4" /> : <PanelLeft className="size-4" />}
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={newConversation}>
          <Plus className="size-4" />
        </Button>
        <span className="text-sm font-medium ml-1">Yaver Agent</span>
      </div>

      <div className="flex items-center gap-1">
        {isLoading && progressPhase && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 mr-1">
            <Loader2 className="size-3 animate-spin" />
            <span className="hidden sm:inline">{phaseLabel}</span>
          </div>
        )}
        {messages.length > 0 && (
          <Button variant="ghost" size="icon-sm" onClick={exportConversation} title="Exportar conversa">
            <Download className="size-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" onClick={() => setExpanded(!isExpanded)} title={isExpanded ? "Minimizar" : "Expandir"}>
          {isExpanded ? <Shrink className="size-3.5" /> : <Expand className="size-3.5" />}
        </Button>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon-sm" onClick={newConversation}>
            <Trash2 className="size-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" onClick={close}>
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  )

  const emptyState = messages.length === 0 && (
    <div className="flex h-full flex-col items-center justify-center text-center px-8">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
        <Orbit className="size-7 text-primary" />
      </div>
      <p className="text-sm font-medium">Pergunte sobre seus dados</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-56">
        Faturamento, curva ABC, pedidos, clientes e mais.
      </p>
    </div>
  )

  const messagesList = (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
      {emptyState}
      {messages.map((msg, i) => (
        <ChatMessage key={msg.id} message={msg} isLast={i === messages.length - 1} />
      ))}
      <div ref={bottomRef} />
    </div>
  )

  const chatContent = (
    <div className="flex flex-1 flex-col min-w-0">
      {header}
      {messagesList}
      <ChatInput />
    </div>
  )

  const chatPanel = (
    <div className="flex min-h-0 flex-1">
      {showHistory && <HistorySidebar />}
      {chatContent}
    </div>
  )

  if (isExpanded) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/5 pointer-events-auto" onClick={close} />
        <div className="fixed right-0 top-0 z-50 h-full w-[50vw] max-w-2xl min-w-[440px] border-l bg-card shadow-2xl flex flex-col animate-in slide-in-from-right-4 duration-300">
          {chatPanel}
        </div>
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <div className="pointer-events-auto flex h-[600px] w-[420px] flex-col rounded-2xl border bg-card shadow-xl animate-in slide-in-from-right-4 fade-in-0 duration-200">
        {chatPanel}
      </div>
    </div>
  )
}
