import type { MetadataRoute } from "next"
import { EVENTS } from "@/config/events"

const BASE = "https://solarisnerja.com"

export default function sitemap(): MetadataRoute.Sitemap {
  const eventPages = EVENTS.map((e) => ({
    url: `${BASE}/eventos/${e.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))

  return [
    { url: BASE, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/eventos`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/privacidad`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    ...eventPages,
  ]
}
