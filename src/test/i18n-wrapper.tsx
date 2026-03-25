import React from "react"
import { NextIntlClientProvider } from "next-intl"

const messages = {
  promo: {
    // ── CTA state ──
    label: "Oferta exclusiva",
    ctaButton: "Promociones limitadas",
    ctaDescription: "Accede a ofertas exclusivas antes que nadie.",

    // ── RGPD state ──
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

    // ── Form state ──
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

    // ── Success state ──
    successTitle: "¡Estás dentro!",
    successDescription: "Te notificaremos con las mejores ofertas.",

    // ── Error state ──
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

export function I18nWrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="es" messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
