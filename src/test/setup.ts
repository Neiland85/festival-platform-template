import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

const messages: Record<string, Record<string, string>> = {
  promo: {
    label: "Oferta exclusiva",
    ctaButton: "Promociones limitadas",
    ctaDescription: "Accede a ofertas exclusivas antes que nadie.",
    back: "Volver",
    rgpdTitle: "Protección de tus datos",
    rgpdIntro: "Introducción RGPD",
    rgpdDescription: "Descripción RGPD",
    rgpdNoSell: "No vendemos datos",
    rgpdNoSellDesc: "Nunca vendemos",
    rgpdCookies: "Cookies",
    rgpdCookiesDesc: "Uso de cookies",
    rgpdSecure: "Seguro",
    rgpdSecureDesc: "Datos seguros",
    rgpdEmail: "Email",
    rgpdEmailDesc: "Solo email",
    rgpdRights: "Tus derechos",
    rgpdRightsPrefix: "Puedes ejercer",
    rgpdRightsSuffix: "cuando quieras",
    rgpdLegal: "Legal",
    rgpdPrivacyLink: "Privacidad",
    formTitle: "Formulario",
    formSubtitle: "Completa tus datos",
    labelName: "Nombre",
    labelSurname: "Apellidos",
    labelEmail: "Email",
    labelPhone: "Teléfono",
    labelProfession: "Profesión",
    placeholderName: "Nombre",
    placeholderSurname: "Apellidos",
    placeholderEmail: "Email",
    placeholderPhone: "Teléfono",
    placeholderProfession: "Profesión",
    optional: "opcional",
    submitConsent: "Acepto",
    privacyPolicy: "Política de privacidad",
    sending: "Enviando...",
    successTitle: "¡Estás dentro!",
    successDescription: "Te notificaremos con las mejores ofertas.",
    errorTitle: "Ha ocurrido un error",
    errorDescription: "No hemos podido procesar tu solicitud.",
    retry: "Reintentar",
  },
  cookie: {
    ariaLabel: "Consentimiento de cookies",
    message: "Usamos cookies para mejorar tu experiencia.",
    privacyPolicy: "Política de privacidad",
    accept: "Aceptar",
    reject: "Rechazar",
  },
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
    NextIntlClientProvider: ({ children }: any) => children
  }
})

import { TextEncoder, TextDecoder } from 'util'

global.TextEncoder = TextEncoder as any
global.TextDecoder = TextDecoder as any

