import Image from "next/image"
import Link from "next/link"

export default function Footer() {
  return (
    <footer className="bg-[var(--sn-bg)] text-[var(--sn-text)] py-24 px-6 transition-colors duration-700">

      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-16 items-start">

        {/* LOGO + MANIFESTO */}
        <div className="space-y-6">
          <Image
            src="/solaris_logo.png"
            alt="Solaris Nerja"
            width={110}
            height={50}
            sizes="110px"
          />

          <p className="text-sm opacity-70 leading-relaxed max-w-xs">
            Un ciclo cultural mediterráneo donde el sol, el mar y el tiempo
            vacacional se convierten en experiencia artística.
          </p>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="flex flex-col gap-3 text-sm">
          <Link href="/eventos" className="hover:opacity-60">
            Eventos
          </Link>

          <Link href="/#mercado" className="hover:opacity-60">
            Mercado
          </Link>

          <Link href="/#ubicacion" className="hover:opacity-60">
            Ubicación
          </Link>

          <Link href="/privacidad" className="hover:opacity-60">
            Privacidad
          </Link>
        </nav>

        {/* INFO / SOCIAL */}
        <div className="space-y-3 text-sm opacity-70">

          <p>Nerja · Costa del Sol</p>

          <p>Verano 2026</p>

          <div className="pt-6 flex gap-6 text-sm">
            <a
              href="https://www.instagram.com/solarisnerja"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-50"
            >
              Instagram
            </a>

            <a
              href="https://www.facebook.com/solarisnerja"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-50"
            >
              Facebook
            </a>

            <a
              href="https://www.youtube.com/@solarisnerja"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-50"
            >
              YouTube
            </a>
          </div>

        </div>

      </div>

      {/* LÍNEA FINAL */}
      <div className="max-w-6xl mx-auto mt-20 space-y-3">
        <p className="editorial-label">
          mediterranean light culture
        </p>
        <p className="text-xs opacity-50 tracking-wide">
          © Solaris Nerja
        </p>
      </div>

    </footer>
  )
}
