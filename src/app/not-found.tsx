import Link from "next/link"

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 px-6">
        <h1 className="text-6xl font-bold tracking-tight">
          404
        </h1>
        <p className="text-sm opacity-60">
          Esta página no existe.
        </p>
        <Link
          href="/"
          className="inline-block border-2 border-black px-8 py-3 text-sm font-semibold
            hover:bg-black hover:text-white transition"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}
