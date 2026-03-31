import "@/app/globals.css"
import { notFound } from "next/navigation"
import { IntlProvider } from "@/i18n/provider"
import { locales, type Locale } from "@/i18n/config"
import { CookieBanner } from "@/ui/components/CookieBanner"

import en from "@/messages/en.json"
import es from "@/messages/es.json"

const messagesMap = {
  en,
  es,
} as const

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params

  if (!locales.includes(locale)) {
    notFound()
  }

  const messages = messagesMap[locale]

  if (!messages) {
    notFound()
  }

  return (
    <html lang={locale}>
      <body>
        <IntlProvider locale={locale} messages={messages}>
          {children}
          <CookieBanner />
        </IntlProvider>
      </body>
    </html>
  )
}
