import createIntlMiddleware from "next-intl/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifySignedToken, looksLikeSignedToken } from "@/lib/auth/signedSession"
import { routing } from "@/i18n/routing"

const intlMiddleware = createIntlMiddleware(routing)

// TODO: Replace with your production domain(s)
const ALLOWED_ORIGINS = new Set([
  process.env["NEXT_PUBLIC_SITE_URL"] ?? "https://www.your-festival.com",
])

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  if (process.env.NODE_ENV === "development") return true
  return ALLOWED_ORIGINS.has(origin)
}

async function isAdminAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("admin_session")?.value
  if (!token) return false

  if (looksLikeSignedToken(token)) {
    const payload = await verifySignedToken(token)
    return payload !== null
  }

  return UUID_V4_RE.test(token)
}

export default async function middleware(req: NextRequest) {
  const requestId = crypto.randomUUID()
  const origin = req.headers.get("origin")
  const { pathname } = req.nextUrl

  // --- Skip locale routing for API, dashboard, login, studio, _next ---
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

  // --- Dashboard pages: redirect to login if not authenticated ---
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/studio")) {
    if (!(await isAdminAuthenticated(req))) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
  }

  // --- Sanity webhook: skip auth (uses its own secret) ---
  if (pathname === "/api/v1/revalidate") {
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
        "Access-Control-Allow-Headers": "Content-Type, x-request-id, idempotency-key",
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
    return response
  }

  // --- Default: pass through with request ID and CORS header ---
  const response = NextResponse.next()
  response.headers.set("x-request-id", requestId)

  if (pathname.startsWith("/api/") && origin && isAllowedOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin)
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|mp4|ico)$).*)"],
}
