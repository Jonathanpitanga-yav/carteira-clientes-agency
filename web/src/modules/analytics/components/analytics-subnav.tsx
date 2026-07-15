"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { label: "Overview do Portfólio", href: "/admin/analytics" },
  { label: "Share e Concentração", href: "/admin/analytics/share" },
  { label: "Benchmarks & Ranking", href: "/admin/analytics/benchmarks" },
  { label: "Análise de Clientes", href: "/admin/analytics/clients" },
  { label: "Curva ABC", href: "/admin/analytics/clients/abc" },
]

export function AnalyticsSubnav({ basePath = "/admin/analytics" }: { basePath?: string }) {
  const pathname = usePathname()

  const resolved = tabs.map((t) => ({
    ...t,
    href: t.href.replace("/admin/analytics", basePath),
  }))

  return (
    <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
      {resolved.map((tab) => {
        const isActive = pathname === tab.href || (tab.href !== basePath && tab.href !== basePath + "/clients" && pathname.startsWith(tab.href))
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
