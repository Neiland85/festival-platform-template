import { setRequestLocale } from "next-intl/server"
import HeroVideo from "@/ui/components/HeroVideo"
import CarouselSection from "@/ui/components/CarouselSection"
import PricingSection from "@/ui/components/PricingSection"
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
      <CarouselSection />
      <PricingSection />
      <ShowcaseFooter />
    </main>
  )
}
