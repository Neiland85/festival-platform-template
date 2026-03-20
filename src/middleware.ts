import createIntlMiddleware from "next-intl/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifySignedToken } from "@/lib/auth/signedSession"
import { routing } from "@/i18n/routing"
// Direct import — rateLimitLocal has ZERO dependencies, edge-safe.
// We do NOT import from rate-limit.ts (facade) because it imports serverEnv
// which calls process.exit() — incompatible with edge runtime.
import { rateLimit as rateLimitLocal } from "@/lib/rateLimitLocal"

const intlMiddleware = createIntlMiddleware(routing)

// ── Config (read directly from process.env — edge runtime) ───
// NOTE: middleware runs in edge runtime. We read process.env directly here
// because the Zod env module uses Node.js APIs (process.exit) incompatible
// with edge. The values are still validated at server boot by src/lib/env.ts.
const ALLOWED_ORIGINS = new Set([
  process.env["NEXT_PUBLIC_SITE_URL"] ?? "https://www.your-platform.com",
])

const RL_WINDOW_MS = Number(process.env["RATE_LIMIT_WINDOW_MS"]) || 60_000
const RL_MAX_REQUESTS = Number(process.env["RATE_LIMIT_MAX_REQUESTS"]) || 20
const RL_API_MAX = Number(process.env["RATE_LIMIT_API_MAX_REQUESTS"]) || 10

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  if (process.env.NODE_ENV === "development") return true
  return ALLOWED_ORIGINS.has(origin)
}

// ── IP extraction ────────────────────────────────────

function getClientIp(req: NextRequest): string {
  // Vercel / Cloudflare set these reliably
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  )
}

// ── Session verification (SIGNED TOKENS ONLY) ────────
//
// Security: NO fallback to UUID, regex-based, or format-only checks.
// Every token MUST pass full HMAC-SHA256 verification + expiry + iat window.
// If SESSION_SECRET is missing, verifySignedToken throws → auth fails → 403/redirect.
//
async function isAdminAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("admin_session")?.value
  if (!token) return false

  const payload = await verifySignedToken(token)
  return payload !== null
}

// ── Rate limit response helper ───────────────────────

function rateLimitResponse(requestId: string, retryAfterMs: number, remaining: number, limit: number): NextResponse {
  return new NextResponse(
    JSON.stringify({ error: "Too many requests", requestId }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "x-request-id": requestId,
        "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
      },
    },
  )
}

// ── Middleware ────────────────────────────────────────

export default async function middleware(req: NextRequest) {
  const start = Date.now()
  const requestId = crypto.randomUUID()
  const origin = req.headers.get("origin")
  const { pathname } = req.nextUrl
  const ip = getClientIp(req)

  // --- Skip locale routing for non-i18n paths ---
  const skipIntl =
    pathname.startsWith("/api/") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/monitoring") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"

  // --- Rate limiting for API routes ---
  if (pathname.startsWith("/api/")) {
    // Stricter limit for auth/checkout endpoints
    const isStrict =
      pathname.startsWith("/api/v1/auth/") ||
      pathname.startsWith("/api/v1/checkout") ||
      pathname.startsWith("/api/checkout")

    const limit = isStrict ? RL_API_MAX : RL_MAX_REQUESTS
    const rl = rateLimitLocal(ip, RL_WINDOW_MS, limit)

    if (!rl.allowed) {
      return rateLimitResponse(requestId, rl.retryAfterMs, rl.remaining, rl.limit)
    }
  }

  // --- Protected pages: redirect to login if not authenticated ---
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/studio")) {
    if (!(await isAdminAuthenticated(req))) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
  }

  // --- Webhooks: skip CSRF/auth (each uses its own secret verification) ---
  if (pathname === "/api/v1/revalidate" || pathname === "/api/v1/webhooks/stripe") {
    const response = NextResponse.next()
    response.headers.set("x-request-id", requestId)
    return response
  }

  // --- Admin API: return 403 if not authenticated ---
  if (pathname.startsWith("/api/admin/")) {
    if (!(await isAdminAuthenticated(req))) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 })
    }
  }

  // --- CORS preflight ---
  if (req.method === "OPTIONS" && pathname.startsWith("/api/")) {
    if (!isAllowedOrigin(origin) || !origin) {
      return new NextResponse(null, { status: 403 })
    }

    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PATCH, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, x-request-id, idempotency-key, x-csrf-token",
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Max-Age": "86400",
        "x-request-id": requestId,
      },
    })
  }

  // --- For locale-routed pages, use next-intl middleware ---
  if (!skipIntl) {
    const response = intlMiddleware(req)
    response.headers.set("x-request-id", requestId)
    response.headers.set("server-timing", `middleware;dur=${Date.now() - start}`)
    return response
  }

  // --- Default: pass through with request ID and CORS header ---
  const response = NextResponse.next()
  response.headers.set("x-request-id", requestId)
  response.headers.set("server-timing", `middleware;dur=${Date.now() - start}`)

  if (pathname.startsWith("/api/") && origin && isAllowedOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin)
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|mp4|ico)$).*)"],
}
