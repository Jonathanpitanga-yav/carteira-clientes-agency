import { ArrowDown, ArrowUp, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

type RankMovementProps = {
  rank: number | null | undefined
  prevRank: number | null | undefined
  compact?: boolean
  className?: string
}

export function RankMovement({ rank, prevRank, compact = false, className }: RankMovementProps) {
  if (rank == null) {
    return <span className={cn("inline-flex w-4 shrink-0", className)} />
  }

  if (prevRank == null) {
    return (
      <span
        className={cn("inline-flex w-4 shrink-0 items-center justify-center text-muted-foreground", className)}
        title="Novo no ranking"
      >
        <Minus className="h-3.5 w-3.5" />
      </span>
    )
  }

  if (rank < prevRank) {
    const delta = prevRank - rank
    return (
      <span
        className={cn("inline-flex shrink-0 items-center gap-0.5 text-cyan-500", compact ? "w-4 justify-center" : "", className)}
        title={`Subiu ${delta} posição(ões)`}
      >
        <ArrowUp className="h-3.5 w-3.5 shrink-0" />
        {!compact && <span className="text-xs font-medium">{delta}</span>}
      </span>
    )
  }

  if (rank > prevRank) {
    const delta = rank - prevRank
    return (
      <span
        className={cn("inline-flex shrink-0 items-center gap-0.5 text-red-600", compact ? "w-4 justify-center" : "", className)}
        title={`Desceu ${delta} posição(ões)`}
      >
        <ArrowDown className="h-3.5 w-3.5 shrink-0" />
        {!compact && <span className="text-xs font-medium">{delta}</span>}
      </span>
    )
  }

  return (
    <span
      className={cn("inline-flex w-4 shrink-0 items-center justify-center text-muted-foreground", className)}
      title="Manteve posição"
    >
      <Minus className="h-3.5 w-3.5" />
    </span>
  )
}

type RankPositionProps = {
  rank: number | null | undefined
  prevRank: number | null | undefined
  children: React.ReactNode
  className?: string
}

/** Seta de movimento à esquerda + badge de posição. */
export function RankPosition({ rank, prevRank, children, className }: RankPositionProps) {
  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      <RankMovement rank={rank} prevRank={prevRank} compact />
      {children}
    </div>
  )
}
