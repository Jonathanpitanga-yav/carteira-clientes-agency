import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type StatCardProps = {
  label: string
  value?: string | number
  icon?: React.ReactNode
  loading?: boolean
  children?: React.ReactNode
  className?: string
}

export function StatCard({
  label,
  value,
  icon,
  loading,
  children,
  className,
}: StatCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : children ? (
          children
        ) : (
          <div className="text-2xl font-bold font-heading">{value}</div>
        )}
      </CardContent>
    </Card>
  )
}
