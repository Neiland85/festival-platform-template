import { NextRequest, NextResponse } from "next/server"
import { destroySessionAsync } from "@/lib/auth/sessionStore"
import { audit } from "@/lib/observability/auditLog"

export async function POST(req: NextRequest) {
  // ── Preview: no session store configured ──
  if (process.env["VERCEL_ENV"] === "preview") {
    return NextResponse.json({ ok: true, preview: true })
  }

  // ── Dynamic imports (avoid module-load crash in preview) ──
  const { serverEnv } = await import("@/lib/env")

  const token = req.cookies.get("admin_session")?.value
  await destroySessionAsync(token)
  audit({ action: "admin.logout", req })

  const response = NextResponse.json({ success: true })
  response.cookies.set("admin_session", "", {
    httpOnly: true,
    secure: serverEnv.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
  return response
}
