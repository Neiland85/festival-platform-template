import { NextRequest, NextResponse } from "next/server"
import { shieldCheck } from "@/lib/security/ddos-shield"
import { inspectRequest, inspectBody } from "@/lib/security/waf"
import { sanitizeResponseHeaders } from "@/lib/security/privacy-shield"

function shouldBypass(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/healthz") ||
    pathname.startsWith("/api/readyz") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap") ||
    pathname.match(/\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt)$/) !== null
  )
}

function skipWafBody(pathname: string): boolean {
  return (
    pathname.startsWith("/api/v1/webhooks") ||
    pathname.includes("/leads") ||
    pathname.includes("/contacto") ||
    pathname.includes("/contact")
  )
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (shouldBypass(pathname)) {
    return NextResponse.next()
  }

  // Tenant-by-Host without node:fs (Edge-safe).
  // Full instance config stays in Node (route handlers / server).
  const host = req.headers.get("host") ?? ""
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-instance-host", host)

  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  const wafResult = inspectRequest(
    req.method,
    pathname,
    req.nextUrl.search.slice(1),
    req.headers,
  )
  if (wafResult.blocked) {
    return NextResponse.json({ error: "blocked" }, { status: 403 })
  }

  const BODY_METHODS = new Set(["POST", "PUT", "PATCH"])
  if (BODY_METHODS.has(req.method) && !skipWafBody(pathname)) {
    const cl = Number(req.headers.get("content-length") ?? "0")
    if (cl > 0 && cl <= 65_536) {
      try {
        const cloned = req.clone()
        const text = await cloned.text()
        const bodyResult = inspectBody(text)
        if (bodyResult.blocked) {
          return NextResponse.json({ error: "blocked" }, { status: 403 })
        }
      } catch {
        // don't block on body read errors
      }
    }
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0") || undefined
  const shield = shieldCheck(ip, req.method, pathname, req.headers, contentLength)
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

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  if (shield.headers) {
    for (const [k, v] of Object.entries(shield.headers)) {
      response.headers.set(k, v)
    }
  }
  sanitizeResponseHeaders(response)
  if (pathname.startsWith("/api/")) {
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
