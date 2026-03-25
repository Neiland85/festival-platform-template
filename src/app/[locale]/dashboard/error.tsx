"use client"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="space-y-6 py-20 text-center">
      <h2 className="text-lg font-medium">Error en el dashboard</h2>
      <p className="text-sm text-gray-500">{error.message}</p>
      <button
        onClick={reset}
        className="border border-black px-6 py-2 text-sm hover:bg-black hover:text-white transition"
      >
        Intentar de nuevo
      </button>
    </div>
  )
}
