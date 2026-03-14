"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Event } from "@/domain/events/types"

export default function EventEditForm({ event }: { event: Event }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [deleting, setDeleting] = useState(false)

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
      active: form.get("active") === "on",
    }

    try {
      const res = await fetch(`/api/v1/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        router.push("/dashboard/events")
      } else {
        setError("Error al actualizar")
      }
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar este evento?")) return
    setDeleting(true)

    try {
      const res = await fetch(`/api/v1/events/${event.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        router.push("/dashboard/events")
      } else {
        setError("Error al eliminar")
      }
    } catch {
      setError("Error de conexión")
    } finally {
      setDeleting(false)
    }
  }

  const inputClass =
    "w-full bg-[var(--sn-surface)] border border-[var(--sn-border)] rounded-sm px-4 py-3 text-sm tracking-wide placeholder:text-[var(--sn-muted)] placeholder:opacity-50 focus:outline-none focus:border-[var(--sn-text)] focus:bg-white transition"

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-sm border border-[var(--sn-border)] p-8 space-y-7">
      <div>
        <label htmlFor="title" className="editorial-label block mb-2.5">título</label>
        <input id="title" name="title" defaultValue={event.title} required className={inputClass} />
      </div>

      <div>
        <label htmlFor="description" className="editorial-label block mb-2.5">descripción</label>
        <textarea id="description" name="description" defaultValue={event.description} rows={4} required className={inputClass} />
      </div>

      <div>
        <label htmlFor="highlight" className="editorial-label block mb-2.5">highlight</label>
        <input id="highlight" name="highlight" defaultValue={event.highlight} required className={inputClass} />
      </div>

      <div>
        <label htmlFor="ticketUrl" className="editorial-label block mb-2.5">ticket url</label>
        <input id="ticketUrl" name="ticketUrl" type="url" defaultValue={event.ticketUrl} required className={inputClass} />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <input
          id="active"
          name="active"
          type="checkbox"
          defaultChecked={event.active}
          className="w-4 h-4 accent-black rounded-sm"
        />
        <label htmlFor="active" className="text-sm tracking-wide">evento activo</label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3">
          <p className="text-sm text-red-700 tracking-wide">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-[var(--sn-border)]">
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="border-2 border-black px-8 py-3 text-sm font-medium tracking-wide hover:bg-black hover:text-white transition disabled:opacity-40"
          >
            {loading ? "guardando..." : "guardar cambios"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-8 py-3 text-sm tracking-wide text-[var(--sn-muted)] hover:text-[var(--sn-text)] transition"
          >
            cancelar
          </button>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm tracking-wide text-red-500 hover:text-red-700 transition disabled:opacity-40"
        >
          {deleting ? "eliminando..." : "eliminar evento"}
        </button>
      </div>
    </form>
  )
}
