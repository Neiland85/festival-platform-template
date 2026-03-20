import type { MetadataRoute } from "next"
import { clientEnv } from "@/lib/env"

const BASE = clientEnv.NEXT_PUBLIC_SITE_URL

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/catalog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/privacidad`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ]
}
