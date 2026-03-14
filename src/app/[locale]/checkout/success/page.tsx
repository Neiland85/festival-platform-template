import { getTranslations } from "next-intl/server"
import Link from "next/link"

export default async function CheckoutSuccessPage() {
  const t = await getTranslations("checkout")

  return (
    <section className="festival-horizon-texture min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="text-6xl">&#10003;</div>
        <h1 className="editorial-h2">{t("successTitle")}</h1>
        <p className="text-(--sn-muted)">{t("successMessage")}</p>
        <Link
          href="/"
          className="inline-block border-2 border-white px-8 py-3
            text-sm font-medium tracking-widest uppercase
            hover:bg-white hover:text-black transition-all duration-300"
        >
          {t("successBack")}
        </Link>
      </div>
    </section>
  )
}
