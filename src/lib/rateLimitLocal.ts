type Entry = {
  count: number
  timestamp: number
}

const WINDOW = 60 * 1000 // 1 min
const LIMIT = 20
const CLEANUP_EVERY = 25
const MAX_STORE_SIZE = 10_000

const store = new Map<string, Entry>()
let callCounter = 0

// Lazy cleanup to prevent memory leak without background timers
function cleanupExpiredEntries(now: number) {
  for (const [key, entry] of store) {
    if (now - entry.timestamp > WINDOW) {
      store.delete(key)
    }
  }
}

function maybeCleanupExpiredEntries(now: number) {
  callCounter++
  if (callCounter % CLEANUP_EVERY !== 0) {
    return
  }

  cleanupExpiredEntries(now)
}

export function rateLimit(ip: string): boolean {
  const now = Date.now()
  maybeCleanupExpiredEntries(now)
  const entry = store.get(ip)

  if (!entry) {
    // Evict oldest if store is too large (safety valve)
    if (store.size >= MAX_STORE_SIZE) {
      const firstKey = store.keys().next().value
      if (firstKey !== undefined) {
        store.delete(firstKey)
      }
    }

    store.set(ip, { count: 1, timestamp: now })
    return true
  }

  if (now - entry.timestamp > WINDOW) {
    store.set(ip, { count: 1, timestamp: now })
    return true
  }

  if (entry.count >= LIMIT) {
    return false
  }

  entry.count++
  return true
}

/** Exposed for testing */
export function _resetStore() {
  store.clear()
  callCounter = 0
}

/** Exposed for testing */
export function _getStoreSize() {
  return store.size
}

/** Exposed for testing */
export function _getCleanupEvery() {
  return CLEANUP_EVERY
}
