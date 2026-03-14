import Image from "next/image"
import Link from "next/link"

export default function Header() {
  return (
    <header className="bg-white text-black w-full px-8 py-6">

      <div className="max-w-6xl mx-auto flex items-center justify-between">

        {/* LOGO */}
        <Link href="/" className="flex items-center">
          <Image
            src="/solaris_logo.png"
            alt="Solaris Nerja"
            width={120}
            height={60}
            sizes="120px"
            priority
          />
        </Link>

        {/* NAV */}
        <nav className="flex items-center gap-10 text-sm tracking-wide">

          <Link
            href="/#eventos"
            className="hover:opacity-60 transition"
          >
            eventos
          </Link>

          <Link
            href="/#mercado"
            className="hover:opacity-60 transition"
          >
            mercado
          </Link>

          <Link
            href="/#ubicacion"
            className="hover:opacity-60 transition"
          >
            ubicación
          </Link>

        </nav>

      </div>

    </header>
  )
}
