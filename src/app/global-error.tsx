"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
    console.error("global_error", error)
  }, [error])

  return (
    <html lang="es">
      <body>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
              Algo salió mal
            </h1>
            <p style={{ fontSize: "0.875rem", opacity: 0.6, marginBottom: "2rem" }}>
              Ha ocurrido un error inesperado.
            </p>
            <button
              onClick={() => reset()}
              style={{
                border: "2px solid black",
                padding: "0.75rem 2rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Intentar de nuevo
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
