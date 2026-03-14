"use client"

import { useTranslations } from "next-intl"

export default function HowFestivalWorks() {
  const t = useTranslations("howItWorks")

  return (
    <section className="py-24 px-6 max-w-4xl mx-auto space-y-10">

      <h2 className="editorial-h2">
        {t("heading")}
      </h2>

      <div className="space-y-6">

        <div>
          <h3 className="font-semibold text-lg">{t("villageTitle")}</h3>
          <p>
            {t("villageDescription")}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-lg">{t("arenaTitle")}</h3>
          <p>
            {t("arenaDescription")}
          </p>
        </div>

      </div>

    </section>
  )
}
