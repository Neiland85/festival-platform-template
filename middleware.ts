import { NextRequest, NextResponse } from "next/server"
import { getInstanceHeaders } from "@/lib/platform/runtime/instance-resolution"

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (shouldBypass(pathname)) {
    return NextResponse.next()
  }

  const host = request.headers.get("host")
  const instanceHeaders = getInstanceHeaders(host)

  if (!instanceHeaders) {
    return new NextResponse("Unknown instance", { status: 404 })
  }

  const requestHeaders = new Headers(request.headers)

  for (const [key, value] of Object.entries(instanceHeaders)) {
    requestHeaders.set(key, value)
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
