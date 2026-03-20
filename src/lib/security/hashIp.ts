import { createHash } from "node:crypto"
import { serverEnv } from "@/lib/env"

/**
 * One-way hash of IP address for privacy compliance (GDPR).
 * Original IP cannot be recovered from the hash.
 */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${serverEnv.IP_HASH_SALT}:${ip}`).digest("hex").slice(0, 16)
}
