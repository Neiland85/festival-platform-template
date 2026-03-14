import { setRequestLocale } from "next-intl/server"
import HeroVideo from "@/ui/components/HeroVideo"
import EventosSection from "@/ui/components/EventosSection"
import CarouselSection from "@/ui/components/CarouselSection"
import LocationSection from "@/ui/components/LocationSection"
import PromoFormSection from "@/ui/components/PromoFormSection"
import ShowcaseFooter from "@/ui/components/ShowcaseFooter"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main>
      <HeroVideo />
      <EventosSection />
      <CarouselSection />
      <LocationSection />
      <PromoFormSection />
      <ShowcaseFooter />
    </main>
  )
}
