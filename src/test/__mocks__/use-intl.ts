export const useTranslations = () => {
  return (key: string) => {
    const map: Record<string, string> = {
      // botones
      "promo.back": "Volver",
      "promo.submit": "Promociones limitadas",

      // labels
      "promo.labelName": "Nombre",
      "promo.labelSurname": "Apellidos",
      "promo.labelEmail": "Email",
      "promo.labelPhone": "Teléfono",
      "promo.labelProfession": "Profesión",

      // placeholders
      "promo.placeholderName": "Nombre",
      "promo.placeholderSurname": "Apellidos",
      "promo.placeholderEmail": "Email",
      "promo.placeholderPhone": "Teléfono",
      "promo.placeholderProfession": "Profesión",

      // otros
      "promo.optional": "opcional",
      "promo.formTitle": "Formulario",
      "promo.formSubtitle": "Completa tus datos",

      // RGPD
      "promo.rgpdIntro": "Introducción RGPD",
      "promo.rgpdDescription": "Descripción RGPD",
      "promo.rgpdNoSell": "No vendemos datos",
      "promo.rgpdNoSellDesc": "Nunca vendemos",
      "promo.rgpdCookies": "Cookies",
      "promo.rgpdCookiesDesc": "Uso de cookies",
      "promo.rgpdSecure": "Seguro",
      "promo.rgpdSecureDesc": "Datos seguros",
      "promo.rgpdEmail": "Email",
      "promo.rgpdEmailDesc": "Solo email",
      "promo.rgpdRights": "Tus derechos",
      "promo.rgpdRightsPrefix": "Puedes ejercer",
      "promo.rgpdRightsSuffix": "cuando quieras",
      "promo.rgpdLegal": "Legal",
      "promo.rgpdPrivacyLink": "Privacidad"
    }

    return map[key] || key
  }
}
