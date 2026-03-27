/**
 * Next.js Middleware — DDoS Shield + Auth enforcement.
 *
 * Runs in Edge Runtime on EVERY request before route handlers.
 * Two layers:
 *   1. DDoS Shield — global rate limiting, IP auto-ban, header validation,
 *      body size enforcement (all routes)
 *   2. Admin Auth — session cookie validation (/api/admin/* only)
 *
 * ATTACK VECTORS BLOCKED:
 *   - HTTP Flood: 60 req/min per IP globally
 *   - Slowloris: Header validation + body size limits
 *   - Brute Force: Auto-ban after 50 violations (15 min)
 *   - Header Bomb: User-agent length + header count limits
 *   - Cache Bust: Query string / referer length limits
 *   - Payload Bomb: Per-route body size enforcement
 */

import { NextRequest, NextResponse } from "next/server"
import { validateSession } from "@/lib/auth/sessionStore"
import { shieldCheck } from "@/lib/security/ddos-shield"

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

  // ── Pass through with rate limit headers ───────────
  const response = NextResponse.next()
  if (shield.headers) {
    for (const [k, v] of Object.entries(shield.headers)) {
      response.headers.set(k, v)
    }
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
