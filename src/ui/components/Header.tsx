"use client"

import Image from "next/image"
import { Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"

export default function Header() {
  const t = useTranslations("nav")

  return (
    <header className="bg-white text-black w-full px-8 py-6">

      <div className="max-w-6xl mx-auto flex items-center justify-between">

        {/* LOGO */}
        <Link href="/" className="flex items-center">
          <Image
            src="/clarity-logo-light.png"
            alt="Clarity Structures"
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
            {t("events")}
          </Link>

          <Link
            href="/#mercado"
            className="hover:opacity-60 transition"
          >
            {t("market")}
          </Link>

          <Link
            href="/#ubicacion"
            className="hover:opacity-60 transition"
          >
            {t("location")}
          </Link>

        </nav>

      </div>

    </header>
  )
}
