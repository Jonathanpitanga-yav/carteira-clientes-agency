"use client"

import { useMemo } from "react"
import { addDays, subDays, startOfMonth, endOfMonth, subMonths, format, parseISO } from "date-fns"

export type PresetId = "today" | "last7" | "last30" | "thisMonth" | "lastMonth" | "custom"

export type DateRange = {
  from: string
  to: string
  preset: PresetId
}

export function getPresetRange(preset: PresetId): DateRange {
  const today = new Date()
  switch (preset) {
    case "today":
      return { from: format(today, "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd"), preset }
    case "last7":
      return { from: format(subDays(today, 6), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd"), preset }
    case "last30":
      return { from: format(subDays(today, 29), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd"), preset }
    case "thisMonth":
      return { from: format(startOfMonth(today), "yyyy-MM-dd"), to: format(endOfMonth(today), "yyyy-MM-dd"), preset }
    case "lastMonth": {
      const prev = subMonths(today, 1)
      return { from: format(startOfMonth(prev), "yyyy-MM-dd"), to: format(endOfMonth(prev), "yyyy-MM-dd"), preset }
    }
    default:
      return { from: format(startOfMonth(today), "yyyy-MM-dd"), to: format(endOfMonth(today), "yyyy-MM-dd"), preset }
  }
}

export const PRESET_OPTIONS: { id: PresetId; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "last7", label: "7 dias" },
  { id: "last30", label: "30 dias" },
  { id: "thisMonth", label: "Este mês" },
  { id: "lastMonth", label: "Mês passado" },
  { id: "custom", label: "Personalizado" },
]

function formatDateBR(dateStr: string) {
  if (!dateStr) return ""
  const d = parseISO(dateStr)
  return format(d, "dd/MM/yyyy")
}

type Props = {
  value: DateRange
  onChange: (range: DateRange) => void
}

export function DateRangePicker({ value, onChange }: Props) {
  const isCustom = value.preset === "custom"

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => {
              if (opt.id !== "custom") {
                onChange(getPresetRange(opt.id))
              } else {
                onChange({ ...value, preset: "custom" })
              }
            }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              value.preset === opt.id
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="h-8 w-full rounded-md border bg-background px-2 text-sm"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="h-8 w-full rounded-md border bg-background px-2 text-sm"
          />
        </div>
      )}

      <div className="text-xs text-muted-foreground tabular-nums">
        {formatDateBR(value.from)} — {formatDateBR(value.to)}
      </div>
    </div>
  )
}
