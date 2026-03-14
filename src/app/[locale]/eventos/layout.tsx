import { setRequestLocale } from "next-intl/server"
import Header from "@/ui/components/Header"
import Footer from "@/ui/components/Footer"

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function EventosLayout({ children, params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  )
}
