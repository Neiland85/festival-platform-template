import { getTranslations } from "next-intl/server"
import Link from "next/link"

export default async function CheckoutCancelPage() {
  const t = await getTranslations("checkout")

  return (
    <section className="festival-horizon-texture min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="text-6xl">&#10007;</div>
        <h1 className="editorial-h2">{t("cancelTitle")}</h1>
        <p className="text-(--sn-muted)">{t("cancelMessage")}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/#programacion"
            className="inline-block border-2 border-white px-8 py-3
              text-sm font-medium tracking-widest uppercase
              hover:bg-white hover:text-black transition-all duration-300"
          >
            {t("cancelRetry")}
          </Link>
          <Link
            href="/"
            className="inline-block border border-(--sn-border) px-8 py-3
              text-sm font-medium tracking-widest uppercase text-(--sn-muted)
              hover:border-white hover:text-white transition-all duration-300"
          >
            {t("cancelBack")}
          </Link>
        </div>
      </div>
    </section>
  )
}
