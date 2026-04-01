import { setRequestLocale } from "next-intl/server"
import { ContactForm } from "./ContactForm"

export const metadata = {
  title: "Cuéntanos tu evento | Clarity",
  description:
    "Solicita una demo personalizada. Te mostramos cómo aumentar ventas de tu festival en menos de 30 minutos.",
}

type Props = {
  params: Promise<{ locale: string }>
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return <ContactForm />
}
