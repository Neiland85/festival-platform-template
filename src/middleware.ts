/**
 * Next.js Middleware — 4-Layer Security Stack.
 *
 * Runs in Edge Runtime on EVERY request before route handlers.
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  Layer 1: WAF (Web Application Firewall)                │
 * │  → SQL injection, XSS, path traversal, RCE, SSRF,     │
 * │    Log4Shell, scanner detection, protocol smuggling     │
 * ├─────────────────────────────────────────────────────────┤
 * │  Layer 2: DDoS Shield                                   │
 * │  → Rate limiting (60/min), IP auto-ban, header/body    │
 * ├─────────────────────────────────────────────────────────┤
 * │  Layer 3: Admin Authentication                          │
 * │  → HMAC-SHA256 session cookies for /api/admin/*        │
 * ├─────────────────────────────────────────────────────────┤
 * │  Layer 4: Privacy Shield                                │
 * │  → Strip server info, no-cache APIs, COOP/CORP         │
 * └─────────────────────────────────────────────────────────┘
 */

import { NextRequest, NextResponse } from "next/server"
import { validateSession } from "@/lib/auth/sessionStore"
import { shieldCheck } from "@/lib/security/ddos-shield"
import { inspectRequest } from "@/lib/security/waf"
import { sanitizeResponseHeaders } from "@/lib/security/privacy-shield"

export function middleware(req: NextRequest) {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  // ── Layer 1: WAF — Deep Packet Inspection ──────────
  const wafResult = inspectRequest(
    req.method,
    req.nextUrl.pathname,
    req.nextUrl.search.slice(1), // Remove leading "?"
    req.headers,
  )

  if (wafResult.blocked) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "warn",
        event: "waf_block",
        ip: ip.slice(0, 8) + "***",
        rule: wafResult.rule,
        category: wafResult.category,
        path: req.nextUrl.pathname,
        method: req.method,
      }),
    )

    return NextResponse.json(
      { error: "blocked" },
      { status: 403 },
    )
  }

  // ── Layer 2: DDoS Shield ───────────────────────────
  const contentLength = Number(req.headers.get("content-length") ?? "0") || undefined

  const shield = shieldCheck(
    ip,
    req.method,
    req.nextUrl.pathname,
    req.headers,
    contentLength,
  )

  if (!shield.allowed) {
    const headers = new Headers()
    if (shield.headers) {
      for (const [k, v] of Object.entries(shield.headers)) {
        headers.set(k, v)
      }
    }
    return NextResponse.json(
      { error: shield.reason ?? "blocked" },
      { status: shield.status ?? 429, headers },
    )
  }

  // ── Layer 3: Admin Auth (/api/admin/* only) ────────
  if (req.nextUrl.pathname.startsWith("/api/admin")) {
    const token = req.cookies.get("admin_session")?.value
    if (!validateSession(token)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 })
    }
  }

  // ── Layer 4: Privacy Shield (all responses) ────────
  const response = NextResponse.next()

  // Rate limit headers
  if (shield.headers) {
    for (const [k, v] of Object.entries(shield.headers)) {
      response.headers.set(k, v)
    }
  }

  // Strip server fingerprint
  sanitizeResponseHeaders(response)

  // Prevent API data caching
  if (req.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
  }

  return response
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm)).*)",
  ],
}
