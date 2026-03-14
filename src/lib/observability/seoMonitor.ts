/**
 * M5: SEO Health Monitor
 *
 * Detecta regresiones SEO antes de que impacten en Search Console.
 * Verifica metadata, sitemap, robots, canonical URLs y og:image.
 *
 * NO modifica archivos existentes. Se ejecuta como check read-only.
 *
 * Uso:
 *   const report = validateSEOHealth(pages, sitemapEntries, robotsConfig)
 *
 * Integración CI:
 *   curl -H "Cookie: admin_session=$TOKEN" https://solarisnerja.com/api/admin/seo
 */

// ── Types ───────────────────────────────────────────────

export type SEOCheckSeverity = "error" | "warning" | "info"

export type SEOIssue = {
  severity: SEOCheckSeverity
  check: string
  page: string
  message: string
  actual?: string | number
  expected?: string
}

export type PageMeta = {
  path: string
  title?: string
  description?: string
  ogImage?: string
  canonical?: string
  lang?: string
  noindex?: boolean
}

export type SitemapEntry = {
  url: string
  lastModified?: string
  changeFrequency?: string
  priority?: number
}

export type RobotsConfig = {
  allowAll: boolean
  disallowPatterns: string[]
  sitemapUrl?: string
}

export type SEOHealthReport = {
  score: number                // 0-100
  grade: "A" | "B" | "C" | "D" | "F"
  totalChecks: number
  passed: number
  issues: SEOIssue[]
  summary: {
    errors: number
    warnings: number
    infos: number
  }
  checkedAt: string
}

// ── Config ──────────────────────────────────────────────

const TITLE_MIN = 10
const TITLE_MAX = 70
const TITLE_IDEAL_MIN = 30
const TITLE_IDEAL_MAX = 60
const DESC_MIN = 50
const DESC_MAX = 320
const DESC_IDEAL_MIN = 120
const DESC_IDEAL_MAX = 160

// ── Public API ──────────────────────────────────────────

/**
 * Ejecuta todos los checks SEO y devuelve un report con score y issues.
 */
export function validateSEOHealth(
  pages: PageMeta[],
  sitemapEntries: SitemapEntry[],
  robotsConfig: RobotsConfig,
  baseUrl: string = "https://solarisnerja.com"
): SEOHealthReport {
  const issues: SEOIssue[] = []
  let totalChecks = 0

  // ── Per-page checks ─────────────────────────────────
  for (const page of pages) {
    totalChecks += checkTitle(page, issues)
    totalChecks += checkDescription(page, issues)
    totalChecks += checkOgImage(page, issues)
    totalChecks += checkCanonical(page, baseUrl, issues)
    totalChecks += checkLang(page, issues)
    totalChecks += checkNoindex(page, issues)
  }

  // ── Sitemap checks ──────────────────────────────────
  totalChecks += checkSitemapCompleteness(pages, sitemapEntries, baseUrl, issues)
  totalChecks += checkSitemapDuplicates(sitemapEntries, issues)
  totalChecks += checkSitemapPriorities(sitemapEntries, issues)

  // ── Robots checks ───────────────────────────────────
  totalChecks += checkRobots(robotsConfig, issues)

  // ── Cross-page checks ──────────────────────────────
  totalChecks += checkDuplicateTitles(pages, issues)
  totalChecks += checkDuplicateDescriptions(pages, issues)

  // ── Calculate score ─────────────────────────────────
  const errors = issues.filter((i) => i.severity === "error").length
  const warnings = issues.filter((i) => i.severity === "warning").length
  const infos = issues.filter((i) => i.severity === "info").length
  const passed = totalChecks - errors - warnings - infos

  // Score: errors=-10, warnings=-3, infos=-1
  const rawScore = Math.max(0, 100 - errors * 10 - warnings * 3 - infos * 1)
  const score = Math.min(100, rawScore)

  const grade = scoreToGrade(score)

  return {
    score,
    grade,
    totalChecks,
    passed,
    issues,
    summary: { errors, warnings, infos },
    checkedAt: new Date().toISOString(),
  }
}

// ── Individual checks ───────────────────────────────────

function checkTitle(page: PageMeta, issues: SEOIssue[]): number {
  let checks = 0

  checks++
  if (!page.title) {
    issues.push({
      severity: "error",
      check: "title.missing",
      page: page.path,
      message: "Missing title tag",
    })
    return checks
  }

  const len = page.title.length
  checks++
  if (len < TITLE_MIN) {
    issues.push({
      severity: "error",
      check: "title.too_short",
      page: page.path,
      message: `Title too short (${len} chars)`,
      actual: len,
      expected: `${TITLE_MIN}-${TITLE_MAX}`,
    })
  } else if (len > TITLE_MAX) {
    issues.push({
      severity: "error",
      check: "title.too_long",
      page: page.path,
      message: `Title too long (${len} chars), will be truncated in SERP`,
      actual: len,
      expected: `${TITLE_MIN}-${TITLE_MAX}`,
    })
  } else if (len < TITLE_IDEAL_MIN || len > TITLE_IDEAL_MAX) {
    issues.push({
      severity: "info",
      check: "title.suboptimal_length",
      page: page.path,
      message: `Title length (${len}) outside ideal range`,
      actual: len,
      expected: `${TITLE_IDEAL_MIN}-${TITLE_IDEAL_MAX}`,
    })
  }

  return checks
}

function checkDescription(page: PageMeta, issues: SEOIssue[]): number {
  let checks = 0

  checks++
  if (!page.description) {
    issues.push({
      severity: "error",
      check: "description.missing",
      page: page.path,
      message: "Missing meta description",
    })
    return checks
  }

  const len = page.description.length
  checks++
  if (len < DESC_MIN) {
    issues.push({
      severity: "warning",
      check: "description.too_short",
      page: page.path,
      message: `Description too short (${len} chars)`,
      actual: len,
      expected: `${DESC_IDEAL_MIN}-${DESC_IDEAL_MAX}`,
    })
  } else if (len > DESC_MAX) {
    issues.push({
      severity: "warning",
      check: "description.too_long",
      page: page.path,
      message: `Description too long (${len} chars)`,
      actual: len,
      expected: `${DESC_IDEAL_MIN}-${DESC_IDEAL_MAX}`,
    })
  } else if (len < DESC_IDEAL_MIN || len > DESC_IDEAL_MAX) {
    issues.push({
      severity: "info",
      check: "description.suboptimal_length",
      page: page.path,
      message: `Description length (${len}) outside ideal range`,
      actual: len,
      expected: `${DESC_IDEAL_MIN}-${DESC_IDEAL_MAX}`,
    })
  }

  return checks
}

function checkOgImage(page: PageMeta, issues: SEOIssue[]): number {
  // Only check public-facing pages (skip dashboard, login, api)
  if (page.path.startsWith("/dashboard") || page.path.startsWith("/login") || page.path.startsWith("/api")) {
    return 0
  }

  if (!page.ogImage) {
    issues.push({
      severity: "warning",
      check: "og_image.missing",
      page: page.path,
      message: "Missing og:image — social shares will have no preview",
    })
  }
  return 1
}

function checkCanonical(page: PageMeta, baseUrl: string, issues: SEOIssue[]): number {
  if (!page.canonical) return 0 // canonical is optional

  if (!page.canonical.startsWith(baseUrl)) {
    issues.push({
      severity: "warning",
      check: "canonical.wrong_domain",
      page: page.path,
      message: `Canonical URL points to different domain`,
      actual: page.canonical,
      expected: `${baseUrl}${page.path}`,
    })
  }
  return 1
}

function checkLang(page: PageMeta, issues: SEOIssue[]): number {
  if (page.path === "/" && !page.lang) {
    issues.push({
      severity: "warning",
      check: "lang.missing",
      page: page.path,
      message: "Missing lang attribute on root page",
    })
    return 1
  }
  return 0
}

function checkNoindex(page: PageMeta, issues: SEOIssue[]): number {
  // Public pages should not be noindex
  if (page.noindex && !page.path.startsWith("/dashboard") && !page.path.startsWith("/login")) {
    issues.push({
      severity: "error",
      check: "noindex.public_page",
      page: page.path,
      message: "Public page has noindex — will be excluded from search results",
    })
    return 1
  }
  return page.noindex ? 1 : 0
}

function checkSitemapCompleteness(
  pages: PageMeta[],
  sitemapEntries: SitemapEntry[],
  baseUrl: string,
  issues: SEOIssue[]
): number {
  const sitemapUrls = new Set(sitemapEntries.map((e) => e.url))
  let checks = 0

  for (const page of pages) {
    // Skip non-public pages
    if (page.path.startsWith("/dashboard") || page.path.startsWith("/login") || page.noindex) {
      continue
    }

    checks++
    const expectedUrl = `${baseUrl}${page.path === "/" ? "" : page.path}`
    if (!sitemapUrls.has(expectedUrl)) {
      issues.push({
        severity: "warning",
        check: "sitemap.missing_page",
        page: page.path,
        message: `Public page not found in sitemap`,
        expected: expectedUrl,
      })
    }
  }

  return checks
}

function checkSitemapDuplicates(entries: SitemapEntry[], issues: SEOIssue[]): number {
  const seen = new Map<string, number>()
  for (const entry of entries) {
    seen.set(entry.url, (seen.get(entry.url) ?? 0) + 1)
  }

  let checks = 0
  for (const [url, count] of seen) {
    checks++
    if (count > 1) {
      issues.push({
        severity: "warning",
        check: "sitemap.duplicate",
        page: url,
        message: `URL appears ${count} times in sitemap`,
        actual: count,
      })
    }
  }

  return checks
}

function checkSitemapPriorities(entries: SitemapEntry[], issues: SEOIssue[]): number {
  let checks = 0

  for (const entry of entries) {
    if (entry.priority !== undefined) {
      checks++
      if (entry.priority < 0 || entry.priority > 1) {
        issues.push({
          severity: "error",
          check: "sitemap.invalid_priority",
          page: entry.url,
          message: `Invalid sitemap priority: ${entry.priority}`,
          actual: entry.priority,
          expected: "0.0-1.0",
        })
      }
    }
  }

  return checks
}

function checkRobots(config: RobotsConfig, issues: SEOIssue[]): number {
  let checks = 0

  checks++
  if (!config.allowAll) {
    issues.push({
      severity: "warning",
      check: "robots.restrictive",
      page: "/robots.txt",
      message: "Robots.txt does not allow all crawlers",
    })
  }

  checks++
  if (!config.sitemapUrl) {
    issues.push({
      severity: "warning",
      check: "robots.no_sitemap",
      page: "/robots.txt",
      message: "Robots.txt does not reference sitemap",
    })
  }

  checks++
  const hasApiDisallow = config.disallowPatterns.some((p) => p.includes("/api"))
  if (!hasApiDisallow) {
    issues.push({
      severity: "info",
      check: "robots.api_exposed",
      page: "/robots.txt",
      message: "Consider disallowing /api/ paths in robots.txt",
    })
  }

  return checks
}

function checkDuplicateTitles(pages: PageMeta[], issues: SEOIssue[]): number {
  const titleMap = new Map<string, string[]>()

  for (const page of pages) {
    if (page.title) {
      const paths = titleMap.get(page.title) ?? []
      paths.push(page.path)
      titleMap.set(page.title, paths)
    }
  }

  let checks = 0
  for (const [title, paths] of titleMap) {
    if (paths.length > 1) {
      checks++
      issues.push({
        severity: "warning",
        check: "title.duplicate",
        page: paths.join(", "),
        message: `Duplicate title "${title}" found on ${paths.length} pages`,
        actual: paths.length,
      })
    }
  }

  return Math.max(1, checks) // at least 1 check
}

function checkDuplicateDescriptions(pages: PageMeta[], issues: SEOIssue[]): number {
  const descMap = new Map<string, string[]>()

  for (const page of pages) {
    if (page.description) {
      const paths = descMap.get(page.description) ?? []
      paths.push(page.path)
      descMap.set(page.description, paths)
    }
  }

  let checks = 0
  for (const [, paths] of descMap) {
    if (paths.length > 1) {
      checks++
      issues.push({
        severity: "warning",
        check: "description.duplicate",
        page: paths.join(", "),
        message: `Duplicate description found on ${paths.length} pages`,
        actual: paths.length,
      })
    }
  }

  return Math.max(1, checks)
}

// ── Helpers ─────────────────────────────────────────────

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A"
  if (score >= 75) return "B"
  if (score >= 60) return "C"
  if (score >= 40) return "D"
  return "F"
}
