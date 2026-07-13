"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function CallbackContent() {
  const params = useSearchParams()

  useEffect(() => {
    const event = params.get("erp_callback")
    const appId = params.get("app_id")
    const message = params.get("message")

    if (window.opener) {
      window.opener.postMessage(
        { type: "erp_callback", event, appId, message },
        "*",
      )
    }

    setTimeout(() => {
      window.close()
    }, 500)
  }, [params])

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      fontFamily: "system-ui, sans-serif",
      color: "#94a3b8",
      fontSize: "14px",
    }}>
      {params.get("erp_callback") === "success"
        ? "Autenticação concluída! Fechando..."
        : "Falha na autenticação. Fechando..."}
    </div>
  )
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackContent />
    </Suspense>
  )
}
