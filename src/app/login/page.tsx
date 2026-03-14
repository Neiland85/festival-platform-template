"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push("/dashboard")
      } else {
        setError("Contraseña incorrecta")
      }
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--sn-surface)] flex items-center justify-center px-6 solaris-parallax-sun">
      <div className="w-full max-w-sm">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-sm border border-[var(--sn-border)] p-10 space-y-8 shadow-sm"
        >
          <div className="text-center space-y-2">
            <h1 className="editorial-h2">solaris</h1>
            <p className="editorial-label">panel de administración</p>
          </div>

          <div>
            <label htmlFor="password" className="editorial-label block mb-2.5">
              contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              placeholder="introduce la contraseña"
              className="w-full bg-[var(--sn-surface)] border border-[var(--sn-border)] rounded-sm px-4 py-3 text-sm tracking-wide placeholder:text-[var(--sn-muted)] placeholder:opacity-50 focus:outline-none focus:border-[var(--sn-text)] focus:bg-white transition"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3">
              <p className="text-sm text-red-700 tracking-wide">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full border-2 border-black px-6 py-3 text-sm font-medium tracking-wide hover:bg-black hover:text-white transition disabled:opacity-40"
          >
            {loading ? "accediendo..." : "entrar"}
          </button>
        </form>

        <p className="text-center mt-8 text-xs text-[var(--sn-muted)] tracking-widest">
          solaris nerja
        </p>
      </div>
    </main>
  )
}
