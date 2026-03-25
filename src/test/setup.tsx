import { vi } from 'vitest'
import React from 'react'

const messages = {
  promo: {}
}

vi.mock('next-intl', async () => {
  const actual = await vi.importActual<any>('next-intl')

  return {
    ...actual,
    useTranslations: (ns: string) => {
      return (key: string) => {
        if (!messages[ns]?.[key]) {
          throw new Error(`Missing translation: ${ns}.${key}`)
        }
        return messages[ns][key]
      }
    },
    NextIntlClientProvider: ({ children }: any) => <>{children}</>
  }
})
