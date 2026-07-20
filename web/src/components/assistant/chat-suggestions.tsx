"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"

type Suggestion = { label: string; question: string }

const PAGE_SUGGESTIONS: Record<string, Suggestion[]> = {
  "abc": [
    { label: "Top 10 produtos", question: "Quais os top 10 produtos mais vendidos?" },
    { label: "Faturamento curva A", question: "Qual o faturamento total dos itens da curva A?" },
    { label: "Itens na curva A", question: "Quantos itens estão classificados na curva A?" },
    { label: "Curva ABC do mês", question: "Mostre a curva ABC de faturamento deste mês" },
  ],
  "orders": [
    { label: "Pedidos do mês", question: "Qual o valor total de pedidos deste mês?" },
    { label: "Pedidos hoje", question: "Quantos pedidos foram realizados hoje?" },
    { label: "Ticket médio", question: "Qual o ticket médio dos pedidos?" },
    { label: "Clientes que mais compraram", question: "Quais clientes mais compraram este mês?" },
  ],
  "clients": [
    { label: "Top 5 clientes", question: "Liste os 5 clientes com maior faturamento" },
    { label: "Cliente com mais pedidos", question: "Qual cliente teve o maior número de pedidos?" },
    { label: "Clientes inativos", question: "Mostre clientes que não compram há mais de 60 dias" },
    { label: "Faturamento total", question: "Qual o faturamento total da carteira?" },
  ],
  "default": [
    { label: "Faturamento total", question: "Qual o faturamento total da carteira?" },
    { label: "Top 10 clientes", question: "Quais os top 10 clientes por faturamento?" },
    { label: "Curva ABC", question: "Mostre a curva ABC de faturamento" },
    { label: "Pedidos no mês", question: "Quantos pedidos foram realizados neste mês?" },
  ],
}

function detectPage(pathname: string): string {
  if (!pathname) return "default"
  if (pathname.includes("abc")) return "abc"
  if (pathname.includes("orders")) return "orders"
  if (pathname.includes("client")) return "clients"
  return "default"
}

export function ChatSuggestions({ onSelect }: { onSelect: (q: string) => void }) {
  const pathname = usePathname()
  const suggestions = useMemo(() => PAGE_SUGGESTIONS[detectPage(pathname)] ?? PAGE_SUGGESTIONS.default, [pathname])

  return (
    <div className="flex flex-wrap gap-1.5 px-4 pb-2">
      {suggestions.map((s) => (
        <button
          key={s.question}
          onClick={() => onSelect(s.question)}
          className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:border-foreground/20 whitespace-nowrap"
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
