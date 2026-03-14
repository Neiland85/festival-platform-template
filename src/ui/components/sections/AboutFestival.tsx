"use client"

import { useTranslations } from "next-intl"

export default function AboutFestival() {
  const t = useTranslations("about")

  return (
    <section id="about" className="py-24 px-6 max-w-4xl mx-auto space-y-10">

      <h2 className="editorial-h2">
        {t("heading")}
      </h2>

      <p className="text-lg leading-relaxed">
        {t("intro")}
      </p>

      <p>
        {t("description")}
      </p>

      <ul className="space-y-2">
        <li>{t("concerts")}</li>
        <li>{t("djSets")}</li>
        <li>{t("gastronomy")}</li>
        <li>{t("market")}</li>
        <li>{t("art")}</li>
      </ul>

    </section>
  )
}
