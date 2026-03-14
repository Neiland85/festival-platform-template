export const dynamic = 'force-dynamic';
import HeroVideo from "@/ui/components/HeroVideo"
import EventosSection from "@/ui/components/EventosSection"
import CarouselSection from "@/ui/components/CarouselSection"
import LocationSection from "@/ui/components/LocationSection"
import PromoFormSection from "@/ui/components/PromoFormSection"
import SolarisShowcaseFooter from "@/ui/components/SolarisShowcaseFooter"

export default function HomePage(){

  return (

    <main>

      <HeroVideo />

      <EventosSection />

      <CarouselSection />

      <LocationSection />

      <PromoFormSection />

      <SolarisShowcaseFooter />

    </main>

  )

}
