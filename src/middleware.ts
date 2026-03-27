/**
 * Next.js Middleware — DDoS Shield + Privacy Shield + Auth enforcement.
 *
 * Runs in Edge Runtime on EVERY request before route handlers.
 * Three layers:
 *   1. DDoS Shield — global rate limiting, IP auto-ban, header validation,
 *      body size enforcement (all routes)
 *   2. Privacy Shield — response header sanitization, info leak prevention,
 *      server fingerprint removal (VPN-equivalent protections)
 *   3. Admin Auth — session cookie validation (/api/admin/* only)
 *
 * VPN-EQUIVALENT PROTECTIONS:
 *   - IP masking: hashIp() in all logging (never stores raw IPs)
 *   - Encryption: TLS enforced via HSTS (63072000s + preload)
 *   - DNS privacy: X-DNS-Prefetch-Control: off
 *   - Anti-fingerprint: 17 browser APIs disabled via Permissions-Policy
 *   - Anti-tracking: FLoC/Topics API disabled
 *   - Cross-origin isolation: COOP + CORP headers
 *   - Server info stripped: X-Powered-By, Server headers removed
 *   - API responses: no-store cache headers on sensitive endpoints
 */

import { NextRequest, NextResponse } from "next/server"
import { validateSession } from "@/lib/auth/sessionStore"
import { shieldCheck } from "@/lib/security/ddos-shield"
import { sanitizeResponseHeaders } from "@/lib/security/privacy-shield"

export function middleware(req: NextRequest) {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  const contentLength = Number(req.headers.get("content-length") ?? "0") || undefined

  // ── Layer 1: DDoS Shield (all routes) ──────────────
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

  // ── Layer 2: Admin auth (/api/admin/* only) ────────
  if (req.nextUrl.pathname.startsWith("/api/admin")) {
    const token = req.cookies.get("admin_session")?.value
    if (!validateSession(token)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 })
    }
  }

  // ── Layer 3: Privacy Shield (all responses) ────────
  const response = NextResponse.next()

  // Add rate limit headers
  if (shield.headers) {
    for (const [k, v] of Object.entries(shield.headers)) {
      response.headers.set(k, v)
    }
  }

  // Strip server fingerprint headers
  sanitizeResponseHeaders(response)

  // Prevent sensitive API data from being cached by proxies
  if (req.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
  }

  return response
}

export const config = {
  // Run on ALL API routes + pages (not static assets)
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm)).*)",
  ],
}
