import type { Metadata } from "next"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"
import { routing } from "@/i18n/routing"

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "meta" })

  const SITE_URL =
    process.env["NEXT_PUBLIC_SITE_URL"] ?? "https://www.your-festival.com"

  return {
    title: {
      default: t("title"),
      template: `%s — ${process.env["NEXT_PUBLIC_SITE_NAME"] ?? "Festival Name"}`,
    },
    description: t("description"),
    openGraph: {
      type: "website",
      locale: locale === "es" ? "es_ES" : "en_US",
      siteName: process.env["NEXT_PUBLIC_SITE_NAME"] ?? "Festival Name",
      title: t("title"),
      description: t("ogDescription"),
      url: SITE_URL,
      images: [
        {
          url: "/og-image.jpg",
          width: 1200,
          height: 630,
          alt: t("ogAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("ogDescription"),
      images: ["/og-image.jpg"],
    },
    alternates: {
      canonical: SITE_URL,
      languages: {
        es: `${SITE_URL}/es`,
        en: `${SITE_URL}/en`,
      },
    },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!routing.locales.includes(locale as "es" | "en")) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
