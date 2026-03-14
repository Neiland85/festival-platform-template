import { isIP } from "node:net"
import type { NextRequest } from "next/server"

export function _isValidIp(value: string): boolean {
  if (!value) return false
  return isIP(value) !== 0
}

export function _getClientIp(req: NextRequest): string {
  const realIp = req.headers.get("x-real-ip")?.trim()

  if (realIp && _isValidIp(realIp)) {
    return realIp
  }

  const forwarded = req.headers.get("x-forwarded-for")

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()

    if (first && _isValidIp(first)) {
      return first
    }
  }

  return "unknown"
}
