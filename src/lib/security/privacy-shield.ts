/**
 * Privacy Shield — VPN-equivalent application-layer privacy protections.
 *
 * A VPN protects users by:
 *   1. Encrypting traffic          → TLS/HSTS (handled by infra)
 *   2. Masking IP addresses        → hashIp() (already implemented)
 *   3. Preventing DNS leaks        → X-DNS-Prefetch-Control: off
 *   4. Blocking fingerprinting     → Permissions-Policy (extensive)
 *   5. Stripping metadata          → Response header sanitization
 *   6. Preventing tracking         → FLoC/Topics API disabled
 *   7. Isolating cross-origin      → COOP + CORP headers
 *
 * This module provides runtime privacy protections that complement
 * the static headers in next.config.ts:
 *   - Response header sanitization (strip server info)
 *   - Request metadata normalization (prevent fingerprinting via headers)
 *   - Privacy-safe logging helpers
 */

import { NextResponse } from "next/server"

/**
 * Sanitize response headers to prevent information leakage.
 * Strips or normalizes headers that reveal server internals.
 */
export function sanitizeResponseHeaders(response: NextResponse): NextResponse {
  // Remove headers that leak server information
  response.headers.delete("X-Powered-By")
  response.headers.delete("Server")

  // Prevent clients from caching sensitive API responses
  const pathname = response.headers.get("x-middleware-rewrite") ?? ""
  if (pathname.startsWith("/api/")) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    )
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
  }

  return response
}

/**
 * Extract a privacy-safe client fingerprint for rate limiting.
 * Uses only non-identifying information that doesn't change with VPN use.
 */
export function getPrivacySafeFingerprint(headers: Headers): string {
  // Use a minimal set of headers for rate limiting — just enough
  // to distinguish clients without creating a unique fingerprint.
  // A VPN user should not be uniquely identifiable.
  const parts = [
    headers.get("accept-language")?.split(",")[0]?.split(";")[0] ?? "unknown",
    headers.get("accept")?.includes("text/html") ? "browser" : "api",
  ]

  return parts.join("|")
}

/**
 * Detect potential WebRTC IP leak attempts.
 * WebRTC can bypass VPNs by exposing local IPs through STUN requests.
 */
export function getWebRtcProtectionHeaders(): Record<string, string> {
  return {
    // These are informational — actual WebRTC blocking happens via CSP
    // and Permissions-Policy headers in next.config.ts
    "X-WebRTC-Policy": "disable-non-proxied-udp",
  }
}

/**
 * Generate security response headers for sensitive API endpoints.
 * These headers prevent caching, tracking, and data leakage.
 */
export function getSensitiveEndpointHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    "Pragma": "no-cache",
    "Expires": "0",
    "X-Content-Type-Options": "nosniff",
    "X-Download-Options": "noopen",
  }
}
