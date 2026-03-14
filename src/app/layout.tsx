import type { Metadata, Viewport } from "next"
import { Space_Mono } from "next/font/google"
import MetaPixel from "@/ui/components/MetaPixel"
import FestivalThemeProvider from "@/ui/components/FestivalThemeProvider"
import "./globals.css"

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
})

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env["NEXT_PUBLIC_SITE_URL"] ?? "https://www.your-festival.com",
  ),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html className={spaceMono.variable} suppressHydrationWarning>
      <body>
        <MetaPixel />
        <FestivalThemeProvider />
        {children}
      </body>
    </html>
  )
}
