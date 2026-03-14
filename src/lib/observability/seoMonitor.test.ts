/**
 * Tests para M5: SEO Health Monitor
 */

import { describe, it, expect } from "vitest"
import {
  validateSEOHealth,
  type PageMeta,
  type SitemapEntry,
  type RobotsConfig,
} from "./seoMonitor"

// ── Helpers ─────────────────────────────────────────────

const BASE_URL = "https://solarisnerja.com"

function goodPage(path: string, overrides?: Partial<PageMeta>): PageMeta {
  return {
    path,
    title: `Solaris Nerja — ${path === "/" ? "Festival Cultural" : path.slice(1)}`,
    description:
      "Solaris Nerja es el festival cultural y musical de la Costa del Sol. Descubre artistas, horarios y compra tu entrada para vivir una experiencia única frente al mar.",
    ogImage: `${BASE_URL}/og${path === "/" ? "/home" : path}.jpg`,
    lang: "es",
    ...overrides,
  }
}

function defaultRobots(overrides?: Partial<RobotsConfig>): RobotsConfig {
  return {
    allowAll: true,
    disallowPatterns: ["/api/"],
    sitemapUrl: `${BASE_URL}/sitemap.xml`,
    ...overrides,
  }
}

function defaultSitemap(pages: PageMeta[]): SitemapEntry[] {
  return pages
    .filter((p) => !p.path.startsWith("/dashboard") && !p.path.startsWith("/login"))
    .map((p) => ({
      url: `${BASE_URL}${p.path === "/" ? "" : p.path}`,
      lastModified: new Date().toISOString(),
      priority: p.path === "/" ? 1 : 0.8,
    }))
}

// ── Tests ───────────────────────────────────────────────

describe("seoMonitor", () => {
  describe("validateSEOHealth()", () => {
    it("returns perfect score for healthy site", () => {
      const pages = [
        goodPage("/"),
        goodPage("/eventos"),
        goodPage("/privacidad"),
      ]
      const sitemap = defaultSitemap(pages)
      const robots = defaultRobots()

      const report = validateSEOHealth(pages, sitemap, robots, BASE_URL)

      expect(report.score).toBeGreaterThanOrEqual(90)
      expect(report.grade).toBe("A")
      expect(report.summary.errors).toBe(0)
    })

    it("includes checkedAt timestamp", () => {
      const report = validateSEOHealth([], [], defaultRobots(), BASE_URL)
      expect(report.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe("title checks", () => {
    it("detects missing title", () => {
      const pages = [{ path: "/", description: "Some desc" }]
      const report = validateSEOHealth(pages, [], defaultRobots(), BASE_URL)

      const issue = report.issues.find((i) => i.check === "title.missing")
      expect(issue).toBeDefined()
      expect(issue!.severity).toBe("error")
    })

    it("detects title too short", () => {
      const pages = [goodPage("/", { title: "Hi" })]
      const report = validateSEOHealth(pages, [], defaultRobots(), BASE_URL)

      const issue = report.issues.find((i) => i.check === "title.too_short")
      expect(issue).toBeDefined()
      expect(issue!.severity).toBe("error")
    })

    it("detects title too long", () => {
      const pages = [goodPage("/", { title: "A".repeat(80) })]
      const report = validateSEOHealth(pages, [], defaultRobots(), BASE_URL)

      const issue = report.issues.find((i) => i.check === "title.too_long")
      expect(issue).toBeDefined()
    })

    it("flags suboptimal title length as info", () => {
      const pages = [goodPage("/", { title: "Short title here" })] // 16 chars, above min but below ideal
      const report = validateSEOHealth(pages, [], defaultRobots(), BASE_URL)

      const issue = report.issues.find((i) => i.check === "title.suboptimal_length")
      expect(issue).toBeDefined()
      expect(issue!.severity).toBe("info")
    })

    it("detects duplicate titles", () => {
      const pages = [
        goodPage("/", { title: "Same Title" }),
        goodPage("/eventos", { title: "Same Title" }),
      ]
      const report = validateSEOHealth(pages, [], defaultRobots(), BASE_URL)

      const issue = report.issues.find((i) => i.check === "title.duplicate")
      expect(issue).toBeDefined()
      expect(issue!.severity).toBe("warning")
    })
  })

  describe("description checks", () => {
    it("detects missing description", () => {
      const pages = [{ path: "/", title: "Solaris Nerja Festival" }]
      const report = validateSEOHealth(pages, [], defaultRobots(), BASE_URL)

      const issue = report.issues.find((i) => i.check === "description.missing")
      expect(issue).toBeDefined()
      expect(issue!.severity).toBe("error")
    })

    it("detects description too short", () => {
      const pages = [goodPage("/", { description: "Short." })]
      const report = validateSEOHealth(pages, [], defaultRobots(), BASE_URL)

      const issue = report.issues.find((i) => i.check === "description.too_short")
      expect(issue).toBeDefined()
    })

    it("detects duplicate descriptions", () => {
      const desc = "Festival cultural y musical en la Costa del Sol. Descubre artistas y horarios del festival Solaris Nerja este verano."
      const pages = [
        goodPage("/", { description: desc }),
        goodPage("/eventos", { description: desc }),
      ]
      const report = validateSEOHealth(pages, [], defaultRobots(), BASE_URL)

      const issue = report.issues.find((i) => i.check === "description.duplicate")
      expect(issue).toBeDefined()
    })
  })

  describe("og:image checks", () => {
    it("detects missing og:image on public page", () => {
      const pages = [goodPage("/", { ogImage: undefined })]
      const report = validateSEOHealth(pages, [], defaultRobots(), BASE_URL)

      const issue = report.issues.find((i) => i.check === "og_image.missing")
      expect(issue).toBeDefined()
      expect(issue!.severity).toBe("warning")
    })

    it("skips og:image check for dashboard pages", () => {
      const pages = [{ path: "/dashboard", title: "Admin" }]
      const report = validateSEOHealth(pages, [], defaultRobots(), BASE_URL)

      const ogIssues = report.issues.filter((i) => i.check === "og_image.missing")
      expect(ogIssues).toHaveLength(0)
    })
  })

  describe("sitemap checks", () => {
    it("detects public page missing from sitemap", () => {
      const pages = [goodPage("/"), goodPage("/eventos")]
      const sitemap: SitemapEntry[] = [
        { url: `${BASE_URL}`, priority: 1 },
        // /eventos missing
      ]

      const report = validateSEOHealth(pages, sitemap, defaultRobots(), BASE_URL)

      const issue = report.issues.find((i) => i.check === "sitemap.missing_page")
      expect(issue).toBeDefined()
      expect(issue!.page).toBe("/eventos")
    })

    it("detects duplicate URLs in sitemap", () => {
      const sitemap: SitemapEntry[] = [
        { url: `${BASE_URL}/eventos`, priority: 0.8 },
        { url: `${BASE_URL}/eventos`, priority: 0.8 },
      ]

      const report = validateSEOHealth([], sitemap, defaultRobots(), BASE_URL)

      const issue = report.issues.find((i) => i.check === "sitemap.duplicate")
      expect(issue).toBeDefined()
    })

    it("detects invalid sitemap priority", () => {
      const sitemap: SitemapEntry[] = [
        { url: `${BASE_URL}/eventos`, priority: 1.5 },
      ]

      const report = validateSEOHealth([], sitemap, defaultRobots(), BASE_URL)

      const issue = report.issues.find((i) => i.check === "sitemap.invalid_priority")
      expect(issue).toBeDefined()
      expect(issue!.severity).toBe("error")
    })

    it("skips dashboard pages in sitemap check", () => {
      const pages = [goodPage("/dashboard/leads")]
      const sitemap: SitemapEntry[] = []

      const report = validateSEOHealth(pages, sitemap, defaultRobots(), BASE_URL)

      const sitemapIssues = report.issues.filter((i) => i.check === "sitemap.missing_page")
      expect(sitemapIssues).toHaveLength(0)
    })
  })

  describe("robots checks", () => {
    it("warns when robots is restrictive", () => {
      const robots = defaultRobots({ allowAll: false })
      const report = validateSEOHealth([], [], robots, BASE_URL)

      const issue = report.issues.find((i) => i.check === "robots.restrictive")
      expect(issue).toBeDefined()
    })

    it("warns when robots has no sitemap reference", () => {
      const robots = defaultRobots({ sitemapUrl: undefined })
      const report = validateSEOHealth([], [], robots, BASE_URL)

      const issue = report.issues.find((i) => i.check === "robots.no_sitemap")
      expect(issue).toBeDefined()
    })

    it("info when /api/ not disallowed", () => {
      const robots = defaultRobots({ disallowPatterns: [] })
      const report = validateSEOHealth([], [], robots, BASE_URL)

      const issue = report.issues.find((i) => i.check === "robots.api_exposed")
      expect(issue).toBeDefined()
      expect(issue!.severity).toBe("info")
    })
  })

  describe("noindex checks", () => {
    it("errors when public page has noindex", () => {
      const pages = [goodPage("/eventos", { noindex: true })]
      const report = validateSEOHealth(pages, [], defaultRobots(), BASE_URL)

      const issue = report.issues.find((i) => i.check === "noindex.public_page")
      expect(issue).toBeDefined()
      expect(issue!.severity).toBe("error")
    })

    it("allows noindex on dashboard pages", () => {
      const pages = [{ path: "/dashboard", title: "Admin", noindex: true }]
      const report = validateSEOHealth(pages, [], defaultRobots(), BASE_URL)

      const noindexIssues = report.issues.filter((i) => i.check === "noindex.public_page")
      expect(noindexIssues).toHaveLength(0)
    })
  })

  describe("scoring", () => {
    it("returns F grade for many errors", () => {
      const pages = [
        { path: "/" },       // missing title + description
        { path: "/eventos" }, // missing title + description
        { path: "/privacidad" }, // missing title + description
        { path: "/contacto" },   // missing title + description
        { path: "/ubicacion" },  // missing title + description
      ]

      const report = validateSEOHealth(pages, [], defaultRobots(), BASE_URL)
      expect(report.score).toBeLessThan(40)
      expect(report.grade).toBe("F")
    })

    it("returns A grade with no issues", () => {
      const pages = [goodPage("/"), goodPage("/eventos"), goodPage("/privacidad")]
      const sitemap = defaultSitemap(pages)
      const robots = defaultRobots()

      const report = validateSEOHealth(pages, sitemap, robots, BASE_URL)
      expect(report.grade).toBe("A")
    })
  })

  describe("Solaris Nerja real scenario", () => {
    it("validates real site metadata structure", () => {
      // Real metadata from the project
      const pages: PageMeta[] = [
        {
          path: "/",
          title: "Solaris Nerja",
          description: "Festival cultural y musical en la Costa del Sol",
          lang: "es",
        },
        {
          path: "/eventos",
          title: undefined, // inherits from root layout — no explicit
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
      ]

      const sitemap: SitemapEntry[] = [
        { url: `${BASE_URL}`, priority: 1 },
        { url: `${BASE_URL}/eventos`, priority: 0.9 },
        { url: `${BASE_URL}/privacidad`, priority: 0.3 },
      ]

      const robots: RobotsConfig = {
        allowAll: true,
        disallowPatterns: ["/api/"],
        sitemapUrl: `${BASE_URL}/sitemap.xml`,
      }

      const report = validateSEOHealth(pages, sitemap, robots, BASE_URL)

      // Should detect real issues:
      // - /eventos missing title + description
      // - /privacidad missing title + description
      // - / title too short ("Solaris Nerja" = 13 chars)
      // - / description too short
      // - Missing og:image on all public pages
      // - /ubicacion not in sitemap
      expect(report.summary.errors).toBeGreaterThan(0)
      expect(report.summary.warnings).toBeGreaterThan(0)
      expect(report.issues.length).toBeGreaterThan(3)
    })
  })
})
