import Link from "next/link"
import LogoutButton from "./LogoutButton"

export const metadata = {
  title: "Solaris Admin",
  robots: { index: false, follow: false },
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[var(--sn-surface)]">
      <header className="bg-white border-b border-[var(--sn-border)] px-8 py-5 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-semibold tracking-wide">
              solaris
            </Link>
            <span className="text-[var(--sn-muted)] text-xs">admin</span>
          </div>
          <nav className="flex items-center gap-8 text-sm tracking-wide">
            <Link
              href="/dashboard"
              className="text-[var(--sn-muted)] hover:text-[var(--sn-text)] transition"
            >
              inicio
            </Link>
            <Link
              href="/dashboard/events"
              className="text-[var(--sn-muted)] hover:text-[var(--sn-text)] transition"
            >
              eventos
            </Link>
            <span className="w-px h-4 bg-[var(--sn-border-2)]" />
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-8 py-10">
        {children}
      </main>
    </div>
  )
}
