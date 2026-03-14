import type { Metadata, Viewport } from "next"
import { Space_Mono } from "next/font/google"
import MetaPixel from "@/ui/components/MetaPixel"
import SolarisThemeProvider from "@/ui/components/SolarisThemeProvider"
import "./globals.css"

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
})

const SITE_URL = process.env["NEXT_PUBLIC_SITE_URL"] ?? "https://www.solarisnerja.com"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: {
    default: "Solaris Nerja — Festival Cultural Costa del Sol 2026",
    template: "%s — Solaris Nerja",
  },
  description:
    "Festival cultural y musical en El Playazo, Nerja. 19–28 junio 2026. Chambao, Bresh, Oh See Málaga, GOA, Tropicalia y más.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Solaris Nerja",
    title: "Solaris Nerja — Festival Cultural Costa del Sol 2026",
    description:
      "Festival cultural y musical en El Playazo, Nerja. 19–28 junio 2026.",
    url: SITE_URL,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Solaris Nerja Festival 2026",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Solaris Nerja — Festival Cultural Costa del Sol 2026",
    description:
      "Festival cultural y musical en El Playazo, Nerja. 19–28 junio 2026.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: SITE_URL,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={spaceMono.variable}>
      <body>

        <MetaPixel />
        <SolarisThemeProvider />

        {children}

      </body>
    </html>
  )
}
