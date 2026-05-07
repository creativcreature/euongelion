/**
 * reference-index-loader.ts
 *
 * Shared async loader for the pre-built reference index (15 MB, 5,114 chunks).
 * Uses three strategies in order:
 *
 * 1. Cloudflare ASSETS binding (production — loads full index via ASSETS, no network hop)
 * 2. fs.readFileSync (local dev — reads from public/)
 * 3. Self-fetch via NEXT_PUBLIC_APP_URL (universal fallback)
 *
 * Result is cached in a module-level variable so it's fetched
 * once per Worker/server instance, not on every request.
 * Concurrent calls deduplicate via loadPromise.
 *
 * NO SLIM INDEX. NO SILENT FALLBACKS. If load fails, throw.
 */

import fs from 'fs'
import path from 'path'
import type { BaseChunk } from './reference-utils'

let cachedIndex: BaseChunk[] | null = null
let loadPromise: Promise<BaseChunk[]> | null = null

export async function loadReferenceIndex(): Promise<BaseChunk[]> {
  if (cachedIndex) return cachedIndex
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    // Strategy 1: Cloudflare ASSETS binding (fastest, no network hop)
    try {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare')
      const { env } = await getCloudflareContext({ async: true })
      if (env?.ASSETS) {
        const res = await env.ASSETS.fetch(
          new Request('https://assets.local/reference-index.json'),
        )
        if (res.ok) {
          const data = (await res.json()) as BaseChunk[]
          if (Array.isArray(data) && data.length > 0) {
            cachedIndex = data
            return cachedIndex
          }
        }
      }
    } catch {
      // Not on Cloudflare or ASSETS unavailable — fall through
    }

    // Strategy 2: fs (local dev)
    try {
      const indexPath = path.join(
        process.cwd(),
        'public',
        'reference-index.json',
      )
      if (fs.existsSync(indexPath)) {
        const raw = fs.readFileSync(indexPath, 'utf8')
        const data = JSON.parse(raw) as BaseChunk[]
        if (Array.isArray(data) && data.length > 0) {
          cachedIndex = data
          return cachedIndex
        }
      }
    } catch {
      // fs unavailable or file corrupt — fall through
    }

    // Strategy 3: Self-fetch (universal fallback)
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'https://euangelion.app'
      const res = await fetch(`${baseUrl}/reference-index.json`)
      if (res.ok) {
        const data = (await res.json()) as BaseChunk[]
        if (Array.isArray(data) && data.length > 0) {
          cachedIndex = data
          return cachedIndex
        }
      }
    } catch {
      // Network unavailable — fall through
    }

    throw new Error('Reference library failed to load from all strategies')
  })()

  try {
    return await loadPromise
  } finally {
    loadPromise = null
  }
}

/** Clear cached index (for testing). */
export function clearReferenceIndexCache(): void {
  cachedIndex = null
}
