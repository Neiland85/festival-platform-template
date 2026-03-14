export default function EventosLoading() {
  return (
    <main className="min-h-screen">
      <div className="px-6 md:px-12 pt-8 pb-6 max-w-7xl mx-auto">
        <div className="h-4 w-24 bg-gray-100 animate-pulse rounded" />
      </div>

      <div className="border-t border-[var(--sn-border)]" />

      <div className="px-6 md:px-12 pt-16 md:pt-24 pb-12 max-w-7xl mx-auto">
        <div className="h-12 w-48 bg-gray-100 animate-pulse rounded" />
        <div className="mt-4 h-5 w-80 bg-gray-100 animate-pulse rounded" />
      </div>

      <div className="border-t border-[var(--sn-border)]" />

      <div className="px-6 md:px-12 py-12 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 bg-gray-50 animate-pulse rounded" />
          ))}
        </div>
      </div>
    </main>
  )
}
