"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function NewEventPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const payload = {
      title: form.get("title") as string,
      description: form.get("description") as string,
      highlight: form.get("highlight") as string,
      ticketUrl: form.get("ticketUrl") as string,
    }

    try {
      const res = await fetch("/api/v1/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        router.push("/dashboard/events")
      } else {
        setError("Error al crear el evento")
      }
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-10">
        <p className="editorial-label mb-2">crear</p>
        <h1 className="editorial-h2">nuevo evento</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-sm border border-[var(--sn-border)] p-8 space-y-7">
        <Field label="título" name="title" placeholder="Sunset Sessions" required />
        <Field label="descripción" name="description" placeholder="House, disco y electrónica melódica..." multiline required />
        <Field label="highlight" name="highlight" placeholder="Sunset" required />
        <Field label="ticket url" name="ticketUrl" type="url" placeholder="https://www.ticketmaster.es/..." required />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3">
            <p className="text-sm text-red-700 tracking-wide">{error}</p>
          </div>
        )}

        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="border-2 border-black px-8 py-3 text-sm font-medium tracking-wide hover:bg-black hover:text-white transition disabled:opacity-40"
          >
            {loading ? "guardando..." : "crear evento"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-8 py-3 text-sm tracking-wide text-[var(--sn-muted)] hover:text-[var(--sn-text)] transition"
          >
            cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  multiline = false,
  placeholder,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  multiline?: boolean
  placeholder?: string
}) {
  const baseClass =
    "w-full bg-[var(--sn-surface)] border border-[var(--sn-border)] rounded-sm px-4 py-3 text-sm tracking-wide placeholder:text-[var(--sn-muted)] placeholder:opacity-50 focus:outline-none focus:border-[var(--sn-text)] focus:bg-white transition"

  return (
    <div>
      <label htmlFor={name} className="editorial-label block mb-2.5">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={name}
          name={name}
          required={required}
          rows={4}
          placeholder={placeholder}
          className={baseClass}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          className={baseClass}
        />
      )}
    </div>
  )
}
