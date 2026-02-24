/**
 * outline-cache.ts
 *
 * In-memory LRU cache for outline generation results.
 * Similar audit inputs often produce similar outlines — caching avoids
 * regenerating from scratch for common themes (prayer, anxiety, faith, etc).
 *
 * At scale, 50-80% cache hit rate on the outline generation call alone
 * saves ~$0.001/plan × hit rate — the second most expensive call.
 *
 * TTL: 1 hour (in-memory, dies with server restart).
 * Max entries: 200 (each ~2-4KB).
 */

import type { OutlineGeneratorResult } from './outline-generator'

// ─── Types ──────────────────────────────────────────────────────────

interface CacheEntry {
  result: OutlineGeneratorResult
  createdAt: number
}

// ─── Constants ──────────────────────────────────────────────────────

const MAX_ENTRIES = 200
const TTL_MS = 60 * 60 * 1000 // 1 hour

// ─── Cache Store ────────────────────────────────────────────────────

const cache = new Map<string, CacheEntry>()

// ─── Key Generation ─────────────────────────────────────────────────

/**
 * Generate a cache key from intent fields.
 *
 * Normalizes themes + tone into a stable key so "prayer, anxiety" and
 * "anxiety, prayer" hit the same cache entry.
 */
export function buildOutlineCacheKey(intent: {
  themes: string[]
  tone: string
  intentTags?: string[]
}): string {
  const themes = [...intent.themes]
    .map((t) => t.toLowerCase().trim())
    .filter(Boolean)
    .sort()
    .join('|')

  const tags = (intent.intentTags || [])
    .map((t) => t.toLowerCase().trim())
    .filter(Boolean)
    .sort()
    .join('|')

  return `outline:${themes}:${intent.tone}:${tags}`
}

// ─── Cache Operations ───────────────────────────────────────────────

export function getOutlineFromCache(
  key: string,
): OutlineGeneratorResult | null {
  const entry = cache.get(key)
  if (!entry) return null

  // Check TTL
  if (Date.now() - entry.createdAt > TTL_MS) {
    cache.delete(key)
    return null
  }

  // Move to end (LRU refresh)
  cache.delete(key)
  cache.set(key, entry)

  return entry.result
}

export function setOutlineInCache(
  key: string,
  result: OutlineGeneratorResult,
): void {
  // Evict oldest if at capacity
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next()
    if (!oldest.done) {
      cache.delete(oldest.value)
    }
  }

  cache.set(key, {
    result,
    createdAt: Date.now(),
  })
}

/** Clear entire cache (for testing). */
export function clearOutlineCache(): void {
  cache.clear()
}

/** Cache diagnostics. */
export function outlineCacheStats(): {
  size: number
  maxSize: number
  ttlMs: number
} {
  return {
    size: cache.size,
    maxSize: MAX_ENTRIES,
    ttlMs: TTL_MS,
  }
}
