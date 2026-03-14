import { randomUUID } from "node:crypto"
import type { Role } from "./rbac"
import { createSignedToken } from "./signedSession"
import { getRedis } from "@/lib/redis/client"

export interface Session {
  token: string
  role: Role
  userId?: string
  createdAt: number
  expiresAt: number
}

const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours
const SESSION_TTL_SECONDS = 8 * 60 * 60
const MAX_SESSIONS = 100
const REDIS_PREFIX = "solaris:sess:"

// ── In-memory fallback ────────────────────────────────

const sessions = new Map<string, Session>()
const revokedTokens = new Set<string>()

function purgeExpired(): void {
  const now = Date.now()
  for (const [token, session] of sessions) {
    if (now >= session.expiresAt) sessions.delete(token)
  }
}

// ── Redis helpers ─────────────────────────────────────

async function redisSet(session: Session): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return false
  try {
    await redis.set(
      `${REDIS_PREFIX}${session.token}`,
      JSON.stringify(session),
      { ex: SESSION_TTL_SECONDS }
    )
    return true
  } catch {
    return false
  }
}

async function redisGet(token: string): Promise<Session | null> {
  const redis = getRedis()
  if (!redis) return null
  try {
    const raw = await redis.get<string>(`${REDIS_PREFIX}${token}`)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

async function redisDel(token: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.del(`${REDIS_PREFIX}${token}`)
  } catch {
    // swallow
  }
}

async function redisRevoke(token: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.set(
      `solaris:revoked:${token}`,
      "1",
      { ex: SESSION_TTL_SECONDS }
    )
  } catch {
    // swallow
  }
}

async function redisIsRevoked(token: string): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return false
  try {
    const val = await redis.get(`solaris:revoked:${token}`)
    return val !== null
  } catch {
    return false
  }
}

// ── Public API ────────────────────────────────────────

/**
 * Crea sesión. Si SESSION_SECRET está disponible, genera token firmado
 * verificable en edge. Si no, usa UUID (fallback dev).
 *
 * Stores in Redis if available, otherwise in-memory.
 */
export async function createSessionAsync(
  opts: { role?: Role; userId?: string } = {}
): Promise<Session> {
  purgeExpired()

  if (sessions.size >= MAX_SESSIONS) {
    const oldest = [...sessions.entries()].sort(
      (a, b) => a[1].createdAt - b[1].createdAt
    )[0]
    if (oldest) sessions.delete(oldest[0])
  }

  const now = Date.now()
  const role = opts.role ?? "admin"

  let token: string
  if (process.env["SESSION_SECRET"]) {
    token = await createSignedToken({ role, userId: opts.userId })
  } else {
    token = randomUUID()
  }

  const session: Session = {
    token,
    role,
    userId: opts.userId,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  }

  // Try Redis first, always keep local copy as cache
  await redisSet(session)
  sessions.set(session.token, session)

  return session
}

/**
 * Sync version — always UUID. Kept for backward compatibility in tests.
 */
export function createSession(
  opts: { role?: Role; userId?: string } = {}
): Session {
  purgeExpired()

  if (sessions.size >= MAX_SESSIONS) {
    const oldest = [...sessions.entries()].sort(
      (a, b) => a[1].createdAt - b[1].createdAt
    )[0]
    if (oldest) sessions.delete(oldest[0])
  }

  const now = Date.now()
  const session: Session = {
    token: randomUUID(),
    role: opts.role ?? "admin",
    userId: opts.userId,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  }

  sessions.set(session.token, session)
  return session
}

export function validateSession(token: string | undefined): boolean {
  if (!token) return false
  if (revokedTokens.has(token)) return false

  purgeExpired()

  const session = sessions.get(token)
  if (!session) return false

  if (Date.now() >= session.expiresAt) {
    sessions.delete(token)
    return false
  }

  return true
}

/**
 * Async validation — checks Redis if local miss.
 */
export async function validateSessionAsync(token: string | undefined): Promise<boolean> {
  if (!token) return false
  if (revokedTokens.has(token)) return false

  // Check Redis revocation list
  if (await redisIsRevoked(token)) {
    revokedTokens.add(token)
    return false
  }

  purgeExpired()

  // Try local first
  let session = sessions.get(token)
  if (!session) {
    // Try Redis
    session = await redisGet(token) ?? undefined
    if (session) sessions.set(token, session) // cache locally
  }

  if (!session) return false

  if (Date.now() >= session.expiresAt) {
    sessions.delete(token)
    await redisDel(token)
    return false
  }

  return true
}

export function getSessionRole(token: string | undefined): Role | null {
  if (!token) return null
  if (revokedTokens.has(token)) return null
  const session = sessions.get(token)
  if (!session || Date.now() >= session.expiresAt) return null
  return session.role
}

export function destroySession(token: string | undefined): void {
  if (!token) return
  sessions.delete(token)
  revokedTokens.add(token)
}

/**
 * Async destroy — removes from Redis too.
 */
export async function destroySessionAsync(token: string | undefined): Promise<void> {
  if (!token) return
  sessions.delete(token)
  revokedTokens.add(token)
  await redisDel(token)
  await redisRevoke(token)
}

export function isRevoked(token: string): boolean {
  return revokedTokens.has(token)
}

/** Visible for testing only */
export function _clearAllSessions(): void {
  sessions.clear()
  revokedTokens.clear()
}
