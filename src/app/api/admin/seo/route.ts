/**
 * GET /api/admin/seo
 *
 * Ejecuta checks SEO y devuelve report con score, grade e issues.
 * Protegido con requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import {
  validateSEOHealth,
  type PageMeta,
  type SitemapEntry,
  type RobotsConfig,
} from "@/lib/observability/seoMonitor"
import { clientEnv } from "@/lib/env"

const BASE_URL = clientEnv.NEXT_PUBLIC_SITE_URL

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 403 }
    )
  }

  const pages: PageMeta[] = [
    {
      path: "/",
      title: "Platform",
      description: "SaaS template marketplace",
      lang: "es",
    },
    {
      path: "/catalog",
      title: "Catalog",
      description: "Browse available assets and templates",
    },
    {
      path: "/privacidad",
      title: undefined,
      description: undefined,
    },
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

  const sitemapEntries: SitemapEntry[] = [
    { url: BASE_URL, priority: 1 },
    { url: `${BASE_URL}/catalog`, priority: 0.9 },
    { url: `${BASE_URL}/privacidad`, priority: 0.3 },
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
