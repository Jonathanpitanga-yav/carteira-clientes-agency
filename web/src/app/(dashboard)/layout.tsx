import { AuthGuard } from "@/components/layout/auth-guard"
import { Header } from "@/components/layout/header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <AuthGuard allowedRoles={["admin", "leader", "analyst", "client"]}>
        <div className="flex w-full">
          <div className="flex min-h-screen w-full flex-col">
            <Header />
            <main className="flex-1">{children}</main>
          </div>
        </div>
      </AuthGuard>
    </div>
  )
}
