import { cn } from "@/lib/utils"

type PageContainerProps = {
  children: React.ReactNode
  className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("flex-1 space-y-6 p-6 lg:p-8", className)}>
      {children}
    </div>
  )
}
