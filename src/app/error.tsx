"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("page_error", error)
    Sentry.captureException(error)
  }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 px-6">
        <h1 className="text-4xl font-bold tracking-tight">
          Error inesperado
        </h1>
        <p className="text-sm opacity-60">
          Lo sentimos. Ha ocurrido un problema.
        </p>
        <button
          onClick={() => reset()}
          className="border-2 border-black px-8 py-3 text-sm font-semibold
            hover:bg-black hover:text-white transition"
        >
          Intentar de nuevo
        </button>
      </div>
    </main>
  )
}
