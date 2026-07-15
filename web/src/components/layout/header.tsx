"use client"

import { useTheme } from "@/providers/theme-provider"
import { useAuth } from "@/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/layout/sidebar"
import { formatRoles } from "@/lib/constants"
import { Sun, Moon, LogOut, Menu } from "lucide-react"

export function Header() {
  const { theme, setTheme } = useTheme()
  const { user, roles, signOut } = useAuth()

  const initials = user?.email?.charAt(0).toUpperCase() ?? "?"

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-sm px-4 lg:px-6">
      <SidebarTrigger />

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="text-muted-foreground hover:text-foreground"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger className="outline-none">
          <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
            <AvatarFallback className="text-xs bg-gradient-primary text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">{user?.email}</span>
              {roles.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {formatRoles(roles)}
                </span>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
