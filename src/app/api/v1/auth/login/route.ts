import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { _getClientIp } from "@/lib/ip"
import { createSessionAsync } from "@/lib/auth/sessionStore"
import { audit } from "@/lib/observability/auditLog"
import { isLoginBlocked, recordFailedAttempt, clearAttempts } from "@/lib/auth/loginRateLimit"
import { loginSchema } from "@/contracts/schemas/login.schema"
import { serverEnv } from "@/lib/env"

export async function POST(req: NextRequest) {
  const ip = _getClientIp(req)

  if (await isLoginBlocked(ip)) {
    return NextResponse.json(
      { error: "too many attempts, try again later" },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid credentials format" }, { status: 400 })
  }

  const password = parsed.data.password
  const adminPassword = serverEnv.ADMIN_PASSWORD

  const passwordMatch =
    password.length === adminPassword.length &&
    timingSafeEqual(Buffer.from(password), Buffer.from(adminPassword))

  if (!passwordMatch) {
    await recordFailedAttempt(ip)
    audit({ action: "admin.login_failed", ip, details: { reason: "bad_password" } })
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  await clearAttempts(ip)

  const session = await createSessionAsync()
  audit({ action: "admin.login", ip, actor: "admin" })
  const response = NextResponse.json({ success: true })

  response.cookies.set("admin_session", session.token, {
    httpOnly: true,
    secure: serverEnv.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  })

  return response
}
