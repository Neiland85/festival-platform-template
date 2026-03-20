"use client"

import Image from "next/image"
import { Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"

export default function Footer() {
  const t = useTranslations("footer")

  return (
    <footer className="bg-[var(--sn-bg)] text-[var(--sn-text)] py-24 px-6 transition-colors duration-700">

      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-16 items-start">

        {/* LOGO + MANIFESTO */}
        <div className="space-y-6">
          <Image
            src="/clarity-logo-light.png"
            alt="Clarity Structures"
            width={110}
            height={50}
            sizes="110px"
          />

          <p className="text-sm opacity-70 leading-relaxed max-w-xs">
            {t("manifesto")}
          </p>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="flex flex-col gap-3 text-sm">
          <Link href="/eventos" className="hover:opacity-60">
            {t("navEvents")}
          </Link>

          <Link href="/#mercado" className="hover:opacity-60">
            {t("navMarket")}
          </Link>

          <Link href="/#ubicacion" className="hover:opacity-60">
            {t("navLocation")}
          </Link>

          <Link href="/privacidad" className="hover:opacity-60">
            {t("navPrivacy")}
          </Link>
        </nav>

        {/* INFO / SOCIAL */}
        <div className="space-y-3 text-sm opacity-70">

          <p>{t("locationCity")}</p>

          <p>{t("season")}</p>

          <div className="pt-6 flex gap-6 text-sm">
            <a
              href="https://www.instagram.com/your-festival"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-50"
            >
              Instagram
            </a>

            <a
              href="https://www.facebook.com/your-festival"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-50"
            >
              Facebook
            </a>

            <a
              href="https://www.youtube.com/@your-festival"
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
          {t("tagline")}
        </p>
        <p className="text-xs opacity-50 tracking-wide">
          &copy; {t("copyright")}
        </p>
      </div>

    </footer>
  )
}
