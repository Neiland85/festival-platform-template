import Link from "next/link"
import { findAllEvents } from "@/adapters/db/event-repository"

export const dynamic = "force-dynamic"

export default async function EventsListPage() {
  const events = await findAllEvents()
  const activeCount = events.filter((e) => e.active).length

  const dashboardEventBorder = "border-b border-(--sn-border) last:border-b-0 hover:bg-[var(--sn-surface)] transition-colors"
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="editorial-label mb-2">gestión</p>
          <h1 className="editorial-h2">eventos</h1>
        </div>
        <Link
          href="/dashboard/events/new"
          className="border-2 border-black px-6 py-3 text-sm font-medium tracking-wide hover:bg-black hover:text-white transition"
        >
          + nuevo evento
        </Link>
      </div>

      {events.length > 0 && (
        <div className="flex gap-6 text-sm tracking-wide">
          <span className="text-(--sn-muted)">
            {events.length} {events.length === 1 ? "evento" : "eventos"}
          </span>
          <span className="text-(--sn-muted)">
            {activeCount} {activeCount === 1 ? "activo" : "activos"}
          </span>
        </div>
      )}

      {events.length === 0 ? (
        <div className="bg-white rounded-sm border border-dashed border-(--sn-border-2) p-16 text-center">
          <p className="editorial-label mb-4">sin eventos</p>
          <p className="text-sm text-(--sn-muted) tracking-wide mb-6">
            Aún no hay eventos creados. Empieza creando el primero.
          </p>
          <Link
            href="/dashboard/events/new"
            className="inline-block border-2 border-black px-8 py-3 text-sm font-medium tracking-wide hover:bg-black hover:text-white transition"
          >
            crear primer evento
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-sm border border-(--sn-border) overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--sn-border) bg-(--sn-surface)">
                <th className="text-left px-5 py-4 font-medium tracking-wide text-(--sn-muted)">título</th>
                <th className="text-left px-5 py-4 font-medium tracking-wide text-(--sn-muted)">highlight</th>
                <th className="text-center px-5 py-4 font-medium tracking-wide text-(--sn-muted)">estado</th>
                <th className="text-right px-5 py-4 font-medium tracking-wide text-(--sn-muted)">acción</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.id}
                  className={dashboardEventBorder}
                >
                  <td className="px-5 py-4 tracking-wide font-medium">{event.title}</td>
                  <td className="px-5 py-4 tracking-wide text-(--sn-muted)">{event.highlight}</td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs tracking-wide ${
                        event.active
                          ? "bg-green-50 text-green-700"
                          : "bg-(--sn-surface-2) text-(--sn-muted)"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${event.active ? "bg-green-500" : "bg-(--sn-muted)"}`} />
                      {event.active ? "activo" : "inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/dashboard/events/edit/${event.id}`}
                      className="text-sm tracking-wide text-(--sn-muted) hover:text-(--sn-text) transition"
                    >
                      editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
