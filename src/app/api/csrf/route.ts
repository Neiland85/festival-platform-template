import { NextRequest, NextResponse } from "next/server"
import { createCsrfToken } from "@/lib/csrf"

export async function GET(req: NextRequest) {
  // ── Preview: return dummy token so forms render without crashing ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ csrfToken: "preview-token", preview: true })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { serverEnv } = await import("@/lib/env")

  const secret = serverEnv.CSRF_SECRET
  if (!secret) {
    return NextResponse.json({ error: "CSRF not configured" }, { status: 503 })
  }

  const cookies = req.cookies
  const existingSid = cookies.get("sn_sid")?.value
  const sessionId = existingSid ?? crypto.randomUUID()

  const token = createCsrfToken({ secret, sessionId })

  const res = NextResponse.json({ csrfToken: token })

  if (!existingSid) {
    res.cookies.set("sn_sid", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    })
  }

  return res
}
