import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"
import { TextEncoder, TextDecoder } from "util"

// ── Inject required env vars before any module imports them ────────────────────
process.env["DATABASE_URL"] ??= "postgres://test:test@localhost:5432/test"
process.env["SESSION_SECRET"] ??= "ci-test-only-never-use-in-prod-xxxxxxxxxxx"
process.env["ADMIN_PASSWORD"] ??= "test-admin-password"

// ── Shared translation messages for next-intl mock ────────────────────────────
// These mirror the messages in src/test/i18n-wrapper.tsx so component tests
// work both with and without <I18nWrapper>.
const globalMessages: Record<string, Record<string, string>> = {
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

// Active messages — updated by NextIntlClientProvider mock when <I18nWrapper> is used
let activeMessages: Record<string, Record<string, string>> = globalMessages

// ── next-intl mock ─────────────────────────────────────────────────────────────
vi.mock("next-intl", async () => {
  const actual = await vi.importActual<any>("next-intl")

  return {
    ...actual,
    NextIntlClientProvider: ({ messages, children }: any) => {
      if (messages) activeMessages = messages as typeof globalMessages
      return children
    },
    useTranslations: (ns: string) => {
      return (key: string) => {
        const val = activeMessages?.[ns]?.[key]
        if (val === undefined) {
          throw new Error(`Missing translation: ${ns}.${key}`)
        }
        return val
      }
    },
  }
})

global.TextEncoder = TextEncoder as any
global.TextDecoder = TextDecoder as any
