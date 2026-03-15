"use client"

import { useTranslations } from "next-intl"
import { SITE_NAME } from "@/config/site"

export default function HeroVideo() {
  const t = useTranslations("hero")

  return (
    <section className="relative w-full h-[90vh] overflow-hidden">
      <video autoPlay muted loop playsInline className="absolute w-full h-full object-cover">
        <source src="/hero/Tomorrowland-Belgium_2016_Official-Aftermovie_corto.mov" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
        <div className="text-center text-white space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold tracking-wide drop-shadow-lg">
            {t("title", { siteName: SITE_NAME })}
          </h1>
          <p className="text-xl md:text-2xl opacity-90 drop-shadow-md">{t("subtitle")}</p>
          <a
            href="#programacion"
            className="inline-block px-10 py-4 bg-white text-black text-lg font-medium rounded-full hover:bg-neutral-200 transition"
          >
            {t("cta")}
          </a>
        </div>
      </div>
    </section>
  )
}
