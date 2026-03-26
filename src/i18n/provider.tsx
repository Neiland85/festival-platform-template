"use client"

import { NextIntlClientProvider } from "next-intl"

type Messages = Record<string, unknown>

type Props = {
  children: React.ReactNode
  locale: string
  messages: Messages
}

export function IntlProvider({ children, locale, messages }: Props) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
