"use client"

import { useMemo, useState } from "react"
import { BarChart3, X } from "lucide-react"
import { Button } from "@/components/ui/button"

type TableRow = { label: string; value: number }

function parseTables(content: string): TableRow[][] {
  const tables: TableRow[][] = []
  const lines = content.split("\n")
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()
    if (line.startsWith("|") && line.includes("---") === false) {
      const headerCells = line.split("|").filter(Boolean).map((c) => c.trim())
      if (headerCells.length < 2) { i++; continue }
      i++
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].includes("---") === false) {
        const cells = lines[i].split("|").filter(Boolean).map((c) => c.trim())
        if (cells.length >= 2) {
          const label = cells[0]
          const lastCell = cells[cells.length - 1]
          const cleaned = lastCell.replace(/[R$\s.]/g, "").replace(",", ".")
          const value = parseFloat(cleaned)
          if (!isNaN(value) && label.length < 40) {
            tables.push([...tables.pop() ?? [], { label, value }])
          }
        }
        i++
      }
    }
    i++
  }

  return tables.filter((t) => t.length >= 2)
}

function MiniBarChart({ data }: { data: TableRow[] }) {
  const max = Math.max(...data.map((r) => r.value))
  const format = (v: number) =>
    v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : v.toFixed(0)

  return (
    <div className="space-y-1 mt-2 mb-1">
      {data.map((row) => (
        <div key={row.label} className="flex items-center gap-2 text-[11px]">
          <span className="w-24 truncate text-right text-muted-foreground shrink-0">{row.label}</span>
          <div className="flex-1 h-4 rounded-full bg-muted/50 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/60 transition-all duration-500"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
          <span className="w-16 text-right font-mono text-[11px] tabular-nums text-foreground shrink-0">
            {format(row.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ChatInlineVisualization({ content }: { content: string }) {
  const [visible, setVisible] = useState(false)
  const tables = useMemo(() => parseTables(content), [content])

  if (tables.length === 0) return null

  return (
    <div className="mt-2">
      <Button variant="ghost" size="xs" onClick={() => setVisible(!visible)} className="gap-1">
        {visible ? <X className="size-3" /> : <BarChart3 className="size-3" />}
        {visible ? "Ocultar gráfico" : "Ver gráfico"}
      </Button>
      {visible && tables.map((data, i) => (
        <MiniBarChart key={i} data={data} />
      ))}
    </div>
  )
}
