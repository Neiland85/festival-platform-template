/**
 * GET /api/admin/seo
 *
 * Ejecuta checks SEO y devuelve report con score, grade e issues.
 * Protegido con requireAdmin.
 *
 * Integración CI (post-deploy):
 *   curl -s -H "Cookie: admin_session=$TOKEN" \
 *     https://solarisnerja.com/api/admin/seo | jq '.score, .grade'
 *
 * Response:
 * {
 *   score: 0-100, grade: "A"|"B"|"C"|"D"|"F",
 *   totalChecks, passed, issues: [...], summary: { errors, warnings, infos }
 * }
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import {
  validateSEOHealth,
  type PageMeta,
  type SitemapEntry,
  type RobotsConfig,
} from "@/lib/observability/seoMonitor"
import { EVENTS } from "@/config/events"

const BASE_URL = "https://solarisnerja.com"

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 403 }
    )
  }

  // Build page metadata from known routes
  const pages: PageMeta[] = [
    {
      path: "/",
      title: "Solaris Nerja",
      description: "Festival cultural y musical en la Costa del Sol",
      lang: "es",
    },
    {
      path: "/eventos",
      title: undefined,
      description: undefined,
    },
    {
      path: "/ubicacion",
      title: "Dónde es Solaris Nerja | El Playazo Costa del Sol",
      description:
        "Solaris Nerja se celebra en El Playazo, Costa del Sol. Más de 20.000 m² frente al mar con Village libre y Arena de conciertos.",
    },
    {
      path: "/privacidad",
      title: undefined,
      description: undefined,
    },
    {
      path: "/contacto",
      title: undefined,
      description: undefined,
    },
    // Dynamic event pages
    ...EVENTS.map((e) => ({
      path: `/eventos/${e.id}`,
      title: undefined as string | undefined,
      description: undefined as string | undefined,
    })),
    // Dashboard (should be noindex)
    {
      path: "/dashboard",
      title: "Dashboard",
      noindex: true,
    },
    {
      path: "/login",
      title: "Login",
      noindex: true,
    },
  ]

  // Build sitemap entries
  const sitemapEntries: SitemapEntry[] = [
    { url: BASE_URL, priority: 1 },
    { url: `${BASE_URL}/eventos`, priority: 0.9 },
    { url: `${BASE_URL}/privacidad`, priority: 0.3 },
    ...EVENTS.map((e) => ({
      url: `${BASE_URL}/eventos/${e.id}`,
      priority: 0.8,
    })),
  ]

  const robotsConfig: RobotsConfig = {
    allowAll: true,
    disallowPatterns: ["/api/"],
    sitemapUrl: `${BASE_URL}/sitemap.xml`,
  }

  const report = validateSEOHealth(pages, sitemapEntries, robotsConfig, BASE_URL)

  return NextResponse.json(report, {
    headers: { "Cache-Control": "no-store" },
  })
}
