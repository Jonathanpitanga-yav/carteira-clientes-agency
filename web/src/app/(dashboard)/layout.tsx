import { AuthGuard } from "@/components/layout/auth-guard"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <AuthGuard allowedRoles={["admin", "leader", "analyst", "client"]}>
        <Sidebar />
        <div className="flex min-h-screen w-full flex-col">
          <Header />
          <main className="flex-1">{children}</main>
        </div>
      </AuthGuard>
    </div>
  )
}
