'use client'

import HeroVideo from "@/ui/components/HeroVideo"
import CarouselSection from "@/ui/components/CarouselSection"
import ProgrammingSection from "@/ui/components/ProgrammingSection"
import PromoFormSection from "@/ui/components/PromoFormSection"
import PricingSection from "@/ui/components/PricingSection"
import LocationSection from "@/ui/components/LocationSection"
import GalleryGrid from "@/ui/components/GalleryGrid"
import ShowcaseFooter from "@/ui/components/ShowcaseFooter"
import { CookieBanner } from "@/ui/components/CookieBanner"
import StickyMobileCTA from "@/ui/components/StickyMobileCTA"
import SolarOrb from "@/ui/components/SolarOrb"

export default function LocalePage() {
  return (
    <>
      {/* Parallax background orb — fixed, z-0 */}
      <SolarOrb />

      {/* Hero — full-screen carousel with auto-advance */}
      <HeroVideo />

      {/* Lead capture — multi-state CTA → RGPD → Form → Success */}
      <PromoFormSection />

      {/* Event lineup — blur-to-reveal grid */}
      <ProgrammingSection />

      {/* Dual-row infinite marquee gallery */}
      <CarouselSection />

      {/* 3-tier pricing — Indie / Business / Enterprise */}
      <PricingSection />

      {/* Venue location with Google Maps */}
      <LocationSection />

      {/* 4-column responsive gallery */}
      <GalleryGrid />

      {/* Branded footer with particle effects */}
      <ShowcaseFooter />

      {/* GDPR cookie consent — bottom sticky overlay */}
      <CookieBanner />

      {/* Mobile CTA — fixed bottom button */}
      <StickyMobileCTA onTap={() => {
        document.getElementById("programacion")?.scrollIntoView({ behavior: "smooth" })
      }} />
    </>
  )
}
