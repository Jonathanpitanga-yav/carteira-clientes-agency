import type { Metadata } from "next"
import { Sora, Outfit, JetBrains_Mono } from "next/font/google"
import { ThemeProvider } from "@/providers/theme-provider"
import { AuthProvider } from "@/providers/auth-provider"
import { QueryProvider } from "@/providers/query-provider"
import { ChatProvider } from "@/components/assistant/chat-provider"
import { Toaster } from "@/components/ui/sonner"
import { ErrorBoundary } from "@/components/feedback/error-boundary"
import "./globals.css"

export const dynamic = "force-dynamic"

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
})

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "YAV — Seller Wallet",
  description: "Gestão de Carteira de Clientes — YAV",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${sora.variable} ${outfit.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>
              <ChatProvider>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
              </ChatProvider>
              <Toaster
                richColors
                closeButton
                position="top-right"
                toastOptions={{
                  duration: 4000,
                }}
              />
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
