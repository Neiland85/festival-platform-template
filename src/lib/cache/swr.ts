/**
 * M4: Cache Layer — Stale-While-Revalidate
 *
 * Cache genérico con patrón SWR para reducir queries a DB desde el dashboard admin.
 *
 * Comportamiento:
 *   - FRESH (< ttl):           Devuelve cached inmediatamente.
 *   - STALE (ttl < age < 2*ttl): Devuelve cached + revalida en background.
 *   - EXPIRED (> 2*ttl):       Bloquea y ejecuta fetcher.
 *
 * Impacto estimado: ~80% reducción de queries para tráfico de dashboard.
 *
 * NO modifica rutas existentes. Integración:
 *   import { swrCache } from "@/lib/cache/swr"
 *   const data = await swrCache.get("metrics", fetchMetrics, 30_000)
 *
 * In-memory — se resetea en cold start (aceptable para serverless).
 */

// ── Types ───────────────────────────────────────────────

type CacheEntry<T> = {
  value: T
  createdAt: number
  ttl: number
  revalidating: boolean
}

export type CacheStats = {
  size: number
  hits: number
  misses: number
  staleHits: number
  revalidations: number
  invalidations: number
  hitRate: string
  entries: CacheEntryInfo[]
}

export type CacheEntryInfo = {
  key: string
  ageMs: number
  ttl: number
  state: "fresh" | "stale" | "expired"
  revalidating: boolean
}

// ── Recommended TTLs ────────────────────────────────────

export const TTL = {
  ACTIVITY: 15_000,     // 15s — datos de actividad reciente
  METRICS: 30_000,      // 30s — métricas agregadas
  CAPACITY: 60_000,     // 60s — capacidad del venue
  HEALTH: 60_000,       // 60s — health check
  FORECAST: 120_000,    // 2m  — predicciones
  LEADS_PER_DAY: 60_000,// 60s — leads por día
  TRENDING: 30_000,     // 30s — trending keywords
  VIRAL: 30_000,        // 30s — viral coefficient
} as const

// ── SWRCache class ──────────────────────────────────────

export class SWRCache {
  private store = new Map<string, CacheEntry<unknown>>()
  private stats = {
    hits: 0,
    misses: 0,
    staleHits: 0,
    revalidations: 0,
    invalidations: 0,
  }

  /**
   * Obtiene un valor del cache con stale-while-revalidate.
   *
   * @param key     - Clave única del cache
   * @param fetcher - Función async que obtiene el dato fresco
   * @param ttl     - Time-to-live en ms (usar constantes TTL.*)
   * @returns       - El valor cacheado o fresco
   */
  async get<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
    const now = Date.now()
    const entry = this.store.get(key) as CacheEntry<T> | undefined

    // MISS: no hay entrada
    if (!entry) {
      this.stats.misses++
      return this.fetchAndStore<T>(key, fetcher, ttl)
    }

    const age = now - entry.createdAt

    // FRESH: dentro del TTL
    if (age <= ttl) {
      this.stats.hits++
      return entry.value
    }

    // STALE: entre TTL y 2*TTL → devolver cached + revalidar background
    if (age <= ttl * 2) {
      this.stats.staleHits++

      if (!entry.revalidating) {
        entry.revalidating = true
        this.stats.revalidations++
        // Fire-and-forget revalidation
        this.revalidate<T>(key, fetcher, ttl).catch(() => {
          // Si falla revalidación, mantener cached y desmarcar
          entry.revalidating = false
        })
      }

      return entry.value
    }

    // EXPIRED: bloquear y fetch nuevo
    this.stats.misses++
    return this.fetchAndStore<T>(key, fetcher, ttl)
  }

  /**
   * Invalida una o más entradas del cache.
   */
  invalidate(...keys: string[]): void {
    for (const key of keys) {
      if (this.store.delete(key)) {
        this.stats.invalidations++
      }
    }
  }

  /**
   * Invalida todas las entradas que matchean un prefijo.
   * Útil para invalidar todo el dashboard: invalidatePrefix("admin:")
   */
  invalidatePrefix(prefix: string): number {
    let count = 0
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key)
        this.stats.invalidations++
        count++
      }
    }
    return count
  }

  /**
   * Invalida todo el cache.
   */
  clear(): void {
    const count = this.store.size
    this.store.clear()
    this.stats.invalidations += count
  }

  /**
   * Devuelve estadísticas del cache.
   */
  getStats(): CacheStats {
    const now = Date.now()
    const entries: CacheEntryInfo[] = []

    for (const [key, entry] of this.store) {
      const age = now - entry.createdAt
      let state: "fresh" | "stale" | "expired"
      if (age <= entry.ttl) state = "fresh"
      else if (age <= entry.ttl * 2) state = "stale"
      else state = "expired"

      entries.push({
        key,
        ageMs: age,
        ttl: entry.ttl,
        state,
        revalidating: entry.revalidating,
      })
    }

    const totalRequests = this.stats.hits + this.stats.staleHits + this.stats.misses
    const hitRate =
      totalRequests > 0
        ? (((this.stats.hits + this.stats.staleHits) / totalRequests) * 100).toFixed(1) + "%"
        : "0%"

    return {
      size: this.store.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      staleHits: this.stats.staleHits,
      revalidations: this.stats.revalidations,
      invalidations: this.stats.invalidations,
      hitRate,
      entries,
    }
  }

  /**
   * Reset completo (para tests).
   */
  reset(): void {
    this.store.clear()
    this.stats = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      revalidations: 0,
      invalidations: 0,
    }
  }

  // ── Private methods ─────────────────────────────────────

  private async fetchAndStore<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    const value = await fetcher()
    this.store.set(key, {
      value,
      createdAt: Date.now(),
      ttl,
      revalidating: false,
    })
    return value
  }

  private async revalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<void> {
    const value = await fetcher()
    this.store.set(key, {
      value,
      createdAt: Date.now(),
      ttl,
      revalidating: false,
    })
  }
}

// ── Singleton export ────────────────────────────────────

export const swrCache = new SWRCache()
