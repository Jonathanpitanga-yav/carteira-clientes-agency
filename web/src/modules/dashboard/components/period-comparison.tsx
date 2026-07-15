import { ArrowDown, ArrowUp, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCompactCurrency } from "@/lib/utils/format"

type PeriodComparisonProps = {
  current: number
  previous: number
  format?: "currency" | "number" | "percent"
  prefix?: string
  className?: string
}

function formatDelta(delta: number, format: PeriodComparisonProps["format"]) {
  if (format === "currency") return formatCompactCurrency(Math.abs(delta))
  if (format === "percent") return `${Math.abs(delta).toFixed(1)}%`
  return String(Math.abs(Math.round(delta)))
}

export function computePeriodChange(current: number, previous: number) {
  const delta = current - previous
  const pct = previous > 0 ? (delta / previous) * 100 : current > 0 ? 100 : 0
  return { delta, pct }
}

export function PeriodComparison({
  current,
  previous,
  format = "percent",
  prefix,
  className,
}: PeriodComparisonProps) {
  const { delta, pct } = computePeriodChange(current, previous)

  if (previous === 0 && current === 0) {
    return (
      <p className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
        {prefix && <span>{prefix}:</span>}
        <Minus className="h-3 w-3" />
        <span>Sem dados no mês anterior</span>
      </p>
    )
  }

  if (previous === 0 && current > 0) {
    return (
      <p
        className={cn("flex items-center gap-1 text-xs font-medium text-emerald-600", className)}
        title="Novo no período"
      >
        {prefix && <span className="font-normal text-muted-foreground">{prefix}:</span>}
        <ArrowUp className="h-3 w-3" />
        <span>Novo no mês</span>
      </p>
    )
  }

  if (delta > 0) {
    return (
      <p
        className={cn("flex items-center gap-1 text-xs font-medium text-emerald-600", className)}
        title={`+${formatDelta(delta, format)} vs mês anterior`}
      >
        {prefix && <span className="font-normal text-muted-foreground">{prefix}:</span>}
        <ArrowUp className="h-3 w-3" />
        <span>
          {format === "percent" ? `+${pct.toFixed(1)}%` : `+${formatDelta(delta, format)}`}
        </span>
        <span className="font-normal text-muted-foreground">vs mês anterior</span>
      </p>
    )
  }

  if (delta < 0) {
    return (
      <p
        className={cn("flex items-center gap-1 text-xs font-medium text-red-600", className)}
        title={`-${formatDelta(delta, format)} vs mês anterior`}
      >
        {prefix && <span className="font-normal text-muted-foreground">{prefix}:</span>}
        <ArrowDown className="h-3 w-3" />
        <span>
          {format === "percent" ? `${pct.toFixed(1)}%` : `-${formatDelta(delta, format)}`}
        </span>
        <span className="font-normal text-muted-foreground">vs mês anterior</span>
      </p>
    )
  }

  return (
    <p className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
      {prefix && <span>{prefix}:</span>}
      <Minus className="h-3 w-3" />
      <span>Igual ao mês anterior</span>
    </p>
  )
}
