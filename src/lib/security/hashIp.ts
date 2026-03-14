import { createHash } from "node:crypto"

const IP_SALT = process.env["IP_HASH_SALT"] ?? "solaris-default-salt-change-me"

/**
 * One-way hash of IP address for privacy compliance (GDPR).
 * Original IP cannot be recovered from the hash.
 */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${IP_SALT}:${ip}`).digest("hex").slice(0, 16)
}
