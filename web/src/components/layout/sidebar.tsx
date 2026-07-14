"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/providers/auth-provider"
import { ROUTES, formatRoles, type Role } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  UserCog,
  BarChart3,
  Package,
  ShoppingCart,
  Plug,
  History,
  Key,
  Activity,
  LogOut,
  Menu,
  FileText,
  RefreshCw,
  ChevronDown,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState, useCallback } from "react"

type NavItem = {
  label: string
  href: string
  icon: React.ReactNode
  roles: Role[]
}

type NavGroup = {
  label: string
  icon: React.ReactNode
  roles: Role[]
  children: { label: string; href: string; roles: Role[] }[]
}

const navItems: (NavItem | NavGroup)[] = [
  { label: "Dashboard", href: "/", icon: <LayoutDashboard className="h-4 w-4" />, roles: ["admin", "leader", "analyst", "client"] },
  { label: "Clientes", href: "/admin/clients", icon: <Users className="h-4 w-4" />, roles: ["admin", "leader", "analyst"] },
  { label: "Usuários", href: "/admin/users", icon: <UserCog className="h-4 w-4" />, roles: ["admin", "leader"] },
  {
    label: "Integrações", icon: <Plug className="h-4 w-4" />, roles: ["admin", "analyst"],
    children: [
      { label: "Central de Aplicativos", href: "/admin/integrations", roles: ["admin"] },
      { label: "Aplicativos Conectados", href: "/admin/connected-apps", roles: ["admin", "analyst"] },
    ],
  },
  {
    label: "Auditoria e Filas", icon: <History className="h-4 w-4" />, roles: ["admin"],
    children: [
      { label: "Histórico de Atividades", href: "/admin/activity-history", roles: ["admin"] },
      { label: "Logs de Auditoria", href: "/admin/audit-logs", roles: ["admin"] },
      { label: "Filas de Retry", href: "/admin/queues", roles: ["admin"] },
    ],
  },
  { label: "API Tokens", href: "/admin/api-tokens", icon: <Key className="h-4 w-4" />, roles: ["admin"] },
  { label: "Faturamento", href: "/leader/billing", icon: <FileText className="h-4 w-4" />, roles: ["leader"] },
  { label: "Produtos", href: "/analyst/products", icon: <Package className="h-4 w-4" />, roles: ["analyst"] },
  { label: "Pedidos", href: "/client/orders", icon: <ShoppingCart className="h-4 w-4" />, roles: ["client"] },
  { label: "Produtos", href: "/client/products", icon: <Package className="h-4 w-4" />, roles: ["client"] },
  { label: "Faturamento", href: "/client/billing", icon: <FileText className="h-4 w-4" />, roles: ["client"] },
]

function SidebarNav({ roles, signOut }: { roles: Role[]; signOut: () => void }) {
  const pathname = usePathname()
  const [groupsOpen, setGroupsOpen] = useState<Record<string, boolean>>({})
  const toggleGroup = useCallback((label: string) => {
    setGroupsOpen((prev) => ({ ...prev, [label]: !prev[label] }))
  }, [])
  const isGroupOpen = useCallback((label: string) => {
    if (label in groupsOpen) return groupsOpen[label]
    return true // default open
  }, [groupsOpen])
  const filtered = navItems.filter((item) => roles.some((r) => item.roles.includes(r)))

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border px-6">
        <Link href={ROUTES.HOME} className="font-heading text-lg font-bold">
          Seller Wallet
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {filtered.map((item) => {
          if ("children" in item) {
            const isGroupActive = item.children.some(
              (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
            )
            const open = isGroupOpen(item.label)
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isGroupActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      open ? "" : "-rotate-90",
                    )}
                  />
                </button>
                {open && (
                  <div className="ml-3 mt-1 space-y-1 border-l border-border pl-2">
                    {item.children
                      .filter((c) => roles.some((r) => c.roles.includes(r)))
                      .map((child) => {
                        const isActive = pathname === child.href || pathname.startsWith(child.href + "/")
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            {child.label}
                          </Link>
                        )
                      })}
                  </div>
                )}
              </div>
            )
          }

          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border p-3">
        {roles.length > 0 && (
          <div className="mb-2 px-3 text-xs text-muted-foreground">
            {formatRoles(roles)}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const { roles, signOut } = useAuth()

  return (
    <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-border">
      <SidebarNav roles={roles} signOut={signOut} />
    </aside>
  )
}

export function SidebarTrigger() {
  const { roles, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="lg:hidden" />
        }
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0">
        <SidebarNav roles={roles} signOut={() => { setOpen(false); signOut() }} />
      </SheetContent>
    </Sheet>
  )
}
