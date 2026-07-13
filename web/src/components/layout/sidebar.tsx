"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/providers/auth-provider"
import { ROUTES, ROLE_LABELS, type Role } from "@/lib/constants"
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
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"

type NavItem = {
  label: string
  href: string
  icon: React.ReactNode
  roles: Role[]
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="h-4 w-4" />, roles: ["admin"] },
  { label: "Clientes", href: "/admin/clients", icon: <Users className="h-4 w-4" />, roles: ["admin", "leader", "analyst"] },
  { label: "Usuários", href: "/admin/users", icon: <UserCog className="h-4 w-4" />, roles: ["admin"] },
  { label: "Integrações", href: "/admin/integrations", icon: <Plug className="h-4 w-4" />, roles: ["admin", "analyst"] },
  { label: "Auditoria", href: "/admin/audit-logs", icon: <History className="h-4 w-4" />, roles: ["admin"] },
  { label: "API Tokens", href: "/admin/api-tokens", icon: <Key className="h-4 w-4" />, roles: ["admin"] },
  { label: "Filas", href: "/admin/queues", icon: <Activity className="h-4 w-4" />, roles: ["admin"] },
  { label: "Dashboard", href: "/leader", icon: <BarChart3 className="h-4 w-4" />, roles: ["leader"] },
  { label: "Faturamento", href: "/leader/billing", icon: <FileText className="h-4 w-4" />, roles: ["leader"] },
  { label: "Analistas", href: "/leader/analysts", icon: <UserCog className="h-4 w-4" />, roles: ["leader"] },
  { label: "Dashboard", href: "/analyst", icon: <LayoutDashboard className="h-4 w-4" />, roles: ["analyst"] },
  { label: "Produtos", href: "/analyst/products", icon: <Package className="h-4 w-4" />, roles: ["analyst"] },
  { label: "Dashboard", href: "/client", icon: <LayoutDashboard className="h-4 w-4" />, roles: ["client"] },
  { label: "Pedidos", href: "/client/orders", icon: <ShoppingCart className="h-4 w-4" />, roles: ["client"] },
  { label: "Produtos", href: "/client/products", icon: <Package className="h-4 w-4" />, roles: ["client"] },
  { label: "Faturamento", href: "/client/billing", icon: <FileText className="h-4 w-4" />, roles: ["client"] },
]

function SidebarNav({ role, signOut }: { role: Role | null; signOut: () => void }) {
  const pathname = usePathname()
  const items = navItems.filter((item) => role && item.roles.includes(role))

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border px-6">
        <Link href={ROUTES.ADMIN} className="font-heading text-lg font-bold">
          Seller Wallet
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
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
        {role && (
          <div className="mb-2 px-3 text-xs text-muted-foreground">
            {ROLE_LABELS[role]}
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
  const { role, signOut } = useAuth()

  return (
    <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-border">
      <SidebarNav role={role} signOut={signOut} />
    </aside>
  )
}

export function SidebarTrigger() {
  const { role, signOut } = useAuth()
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
        <SidebarNav role={role} signOut={() => { setOpen(false); signOut() }} />
      </SheetContent>
    </Sheet>
  )
}
