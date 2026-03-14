import { NextRequest, NextResponse } from "next/server"
import { destroySession } from "@/lib/auth/sessionStore"
import { audit } from "@/lib/observability/auditLog"

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value
  destroySession(token)
  audit({ action: "admin.logout", req })

  const response = NextResponse.json({ success: true })
  response.cookies.set("admin_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
  return response
}
