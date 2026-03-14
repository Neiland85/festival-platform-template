import { NextRequest, NextResponse } from "next/server"
import { createCsrfToken } from "@/lib/csrf"

export async function GET(req: NextRequest) {
  const secret = process.env["CSRF_SECRET"]
  if (!secret) {
    return NextResponse.json({ error: "CSRF not configured" }, { status: 500 })
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
