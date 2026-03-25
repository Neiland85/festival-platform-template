const messages: Record<string, string> = {
  "promo.label": "Label",
  "promo.ctaButton": "Promociones limitadas",
  "promo.ctaDescription": "Accede a promociones exclusivas",

  "promo.rgpdTitle": "Protección de tus datos",
  "promo.rgpdIntro": "Protección de tus datos",
  "promo.rgpdDescription": "Descripción RGPD",
  "promo.back": "Volver",
  "promo.accept": "Promociones limitadas",

  "promo.labelName": "Nombre",
  "promo.labelSurname": "Apellidos",
  "promo.labelEmail": "Email",
  "promo.labelPhone": "Teléfono",
  "promo.labelProfession": "Profesión",
  "promo.optional": "opcional",
  "promo.placeholderName": "Nombre",
  "promo.placeholderSurname": "Apellidos",
  "promo.placeholderEmail": "Email",
  "promo.placeholderPhone": "Teléfono",
  "promo.placeholderProfession": "Profesión",
  "promo.submit": "Promociones limitadas",
  "promo.submitConsent": "Acepto la política de privacidad",
  "promo.privacyPolicy": "Política de privacidad",

  "promo.success": "Gracias por registrarte",
  "promo.error": "Ha ocurrido un error",
  "promo.retry": "Reintentar",

  "label": "Label",
  "ctaButton": "Promociones limitadas",
  "ctaDescription": "Accede a promociones exclusivas",

  "rgpdTitle": "Protección de tus datos",
  "rgpdIntro": "Protección de tus datos",
  "rgpdDescription": "Descripción RGPD",
  "back": "Volver",
  "accept": "Promociones limitadas",

  "labelName": "Nombre",
  "labelSurname": "Apellidos",
  "labelEmail": "Email",
  "labelPhone": "Teléfono",
  "labelProfession": "Profesión",
  "optional": "opcional",
  "placeholderName": "Nombre",
  "placeholderSurname": "Apellidos",
  "placeholderEmail": "Email",
  "placeholderPhone": "Teléfono",
  "placeholderProfession": "Profesión",
  "submit": "Promociones limitadas",
  "submitConsent": "Acepto la política de privacidad",
  "privacyPolicy": "Política de privacidad",

  "success": "Gracias por registrarte",
  "error": "Ha ocurrido un error",
  "retry": "Reintentar"
}

export const useTranslations = () => {
  return (key: string) => messages[key] || key
}
