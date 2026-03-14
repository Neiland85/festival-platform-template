import Link from "next/link"

export function StickyCTA({ href }: { href: string }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:hidden">
      <Link
        href={href}
        className="block text-center px-6 py-4
          bg-[var(--sn-text)] text-white text-sm font-medium tracking-widest uppercase
          hover:bg-[var(--sn-muted)] transition-colors duration-200"
      >
        Tickets
      </Link>
    </div>
  )
}
