import { getPool } from "@/adapters/db/pool"

export const dynamic = "force-dynamic"

export default async function LeadsPage() {
  const pool = getPool()

  const leadsResult = await pool.query(`
    SELECT
      leads.id,
      leads.email,
      leads.ip_address,
      leads.created_at,
      events.title AS event_title
    FROM leads
    JOIN events ON events.id = leads.event_id
    ORDER BY leads.created_at DESC
    LIMIT 500
  `)

  const statsResult = await pool.query(`
    SELECT
      events.title,
      COUNT(leads.id) AS total
    FROM events
    LEFT JOIN leads ON events.id = leads.event_id
    GROUP BY events.title
    ORDER BY total DESC
  `)

  const totalResult = await pool.query(`
    SELECT COUNT(*) as total FROM leads
  `)

  const leads = leadsResult.rows
  const stats = statsResult.rows
  const totalLeads = totalResult.rows[0]?.total || 0

  const max = Math.max(...stats.map(s => Number(s.total)), 1)

  return (
    <div className="space-y-12">

      <div>
        <p className="editorial-label mb-3">panel de gestión</p>
        <h1 className="editorial-h2">leads</h1>
      </div>

      <div className="bg-white border border-[var(--sn-border)] rounded-sm p-6 flex items-center justify-between">
        <div>
          <p className="editorial-label mb-1">total leads</p>
          <p className="text-3xl font-semibold">{totalLeads}</p>
        </div>

        <a
          href="/api/v1/leads/export"
          className="border-2 border-black px-6 py-3 text-sm font-medium tracking-wide hover:bg-black hover:text-white transition"
        >
          exportar CSV
        </a>
      </div>

      <div className="bg-white rounded-sm border border-[var(--sn-border)] p-6">
        <p className="editorial-label mb-6">interés por evento</p>

        <div className="space-y-4">
          {stats.map((row) => {
            const value = Number(row.total)
            const width = (value / max) * 100

            return (
              <div key={row.title}>
                <div className="flex justify-between text-sm tracking-wide mb-1">
                  <span>{row.title}</span>
                  <span className="text-[var(--sn-muted)]">{value}</span>
                </div>

                <div className="h-2 bg-[var(--sn-surface)] rounded">
                  <div
                    className="h-2 bg-black rounded"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="bg-white rounded-sm border border-dashed border-[var(--sn-border-2)] p-16 text-center">
          <p className="editorial-label mb-4">sin leads</p>
          <p className="text-sm text-[var(--sn-muted)] tracking-wide">
            Aún no se han recibido registros desde los formularios.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-sm border border-[var(--sn-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--sn-border)] bg-[var(--sn-surface)]">
                <th className="text-left px-5 py-4 font-medium tracking-wide text-[var(--sn-muted)]">email</th>
                <th className="text-left px-5 py-4 font-medium tracking-wide text-[var(--sn-muted)]">evento</th>
                <th className="text-left px-5 py-4 font-medium tracking-wide text-[var(--sn-muted)]">fecha</th>
                <th className="text-left px-5 py-4 font-medium tracking-wide text-[var(--sn-muted)]">ip</th>
              </tr>
            </thead>

            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-[var(--sn-border)] last:border-b-0 hover:bg-[var(--sn-surface)] transition-colors"
                >
                  <td className="px-5 py-4 tracking-wide font-medium">
                    {lead.email}
                  </td>

                  <td className="px-5 py-4 tracking-wide text-[var(--sn-muted)]">
                    {lead.event_title}
                  </td>

                  <td className="px-5 py-4 tracking-wide text-[var(--sn-muted)]">
                    {new Date(lead.created_at).toLocaleString()}
                  </td>

                  <td className="px-5 py-4 tracking-wide text-[var(--sn-muted)]">
                    {lead.ip_address}
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
