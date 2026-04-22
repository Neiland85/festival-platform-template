type MemoryEntry = {
  id: string
  category: string
  memoryKey: string
  value: unknown
  expiresAt: string | null
  updatedAt: string
}

type Props = {
  entries: MemoryEntry[]
}

export default function SpudMemoryView({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="bg-white border border-[var(--sn-border)] p-6 rounded-sm">
        <p className="editorial-label mb-2">memory</p>
        <p className="text-sm text-[var(--sn-muted)]">no entries.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[var(--sn-border)] p-6 rounded-sm">
      <p className="editorial-label mb-4">memory</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--sn-border)] text-left text-[var(--sn-muted)]">
              <th className="pb-2 font-normal">category</th>
              <th className="pb-2 font-normal">key</th>
              <th className="pb-2 font-normal">value</th>
              <th className="pb-2 font-normal">expires</th>
              <th className="pb-2 font-normal">updated</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-[var(--sn-border)] last:border-0">
                <td className="py-2 text-xs">{e.category}</td>
                <td className="py-2 font-mono text-xs">{e.memoryKey}</td>
                <td className="py-2 text-xs truncate max-w-[200px]">
                  {typeof e.value === "string"
                    ? e.value.slice(0, 80)
                    : JSON.stringify(e.value).slice(0, 80)}
                </td>
                <td className="py-2 text-xs text-[var(--sn-muted)]">
                  {e.expiresAt ? new Date(e.expiresAt).toLocaleDateString() : "-"}
                </td>
                <td className="py-2 text-xs text-[var(--sn-muted)]">
                  {new Date(e.updatedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
