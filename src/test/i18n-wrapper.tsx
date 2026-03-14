import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"
import messages from "../../messages/es.json"

type Props = {
  children: ReactNode
  locale?: string
}

export function IntlWrapper({ children, locale = "es" }: Props) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
