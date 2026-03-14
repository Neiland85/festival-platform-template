import Link from "next/link"

export function ButtonPrimary({ href, children }: { href: string; children: React.ReactNode }) {
  const cls = `inline-flex items-center justify-center px-8 py-4
    bg-[var(--sn-text)] text-white text-sm font-medium tracking-wide uppercase
    hover:bg-[var(--sn-muted)] transition-colors duration-200`

  const external = href.startsWith("http")

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  )
}

export function ButtonGhost({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center px-8 py-4
        border border-[var(--sn-text)] text-sm font-medium tracking-wide uppercase
        hover:bg-[var(--sn-text)] hover:text-white transition-colors duration-200"
    >
      {children}
    </Link>
  )
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-[var(--sn-border-2)] p-6 md:p-8">
      {children}
    </div>
  )
}
