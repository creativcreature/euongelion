/**
 * health-store.ts — cross-isolate provider health persistence via
 * Cloudflare KV.
 *
 * Default behavior (when `BRAIN_HEALTH_KV_ENABLED` is not 'on' OR
 * the KV binding isn't available): no-op. The router falls back to
 * its per-isolate `Map<provider, ProviderHealthState>` and behaves
 * exactly as it did before this module existed.
 *
 * When enabled:
 *   - `loadProviderHealth()` reads the snapshot from KV and returns it.
 *     Called once per isolate on first generateWithBrain invocation.
 *   - `persistProviderHealth(snapshot)` writes the snapshot back to
 *     KV. Throttled at the call site to at most one write per 30s
 *     per isolate (writing on every LLM call would burn KV ops
 *     without adding precision).
 *
 * Failure mode: NEVER throws. KV unavailability is treated as
 * "no snapshot available" / "write skipped." The router continues
 * with its in-memory state.
 *
 * Storage shape: a single key `BRAIN_HEALTH_V1` whose value is the
 * JSON-stringified Map. Per-provider keys would be cleaner but
 * cost N KV reads per cold start; one key + one read is much
 * cheaper for our cardinality (4 providers).
 */

import type { BrainProviderId } from './types'

export type ProviderHealthState = {
  successes: number
  failures: number
  avgLatencyMs: number
}

export type ProviderHealthSnapshot = Record<
  Exclude<BrainProviderId, 'auto'>,
  ProviderHealthState
>

const KV_KEY = 'BRAIN_HEALTH_V1'

interface CloudflareKVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
}

/**
 * Returns true when the KV-backed health store is actively wired.
 * Cheap to call repeatedly. Does NOT actually contact KV.
 */
export function healthStoreEnabled(): boolean {
  return process.env.BRAIN_HEALTH_KV_ENABLED === 'on'
}

async function getKv(): Promise<CloudflareKVNamespace | null> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = await getCloudflareContext({ async: true })
    const candidate = (env as { BRAIN_HEALTH_KV?: CloudflareKVNamespace })
      .BRAIN_HEALTH_KV
    return candidate ?? null
  } catch {
    return null
  }
}

/**
 * Read the health snapshot from KV. Returns `null` when:
 * - the feature flag is off,
 * - KV binding is unavailable (local dev, missing binding),
 * - the stored value is missing or unparseable,
 * - KV throws.
 *
 * Caller should treat null as "no snapshot — keep current
 * in-memory state."
 */
export async function loadProviderHealth(): Promise<ProviderHealthSnapshot | null> {
  if (!healthStoreEnabled()) return null
  const kv = await getKv()
  if (!kv) return null
  try {
    const raw = await kv.get(KV_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ProviderHealthSnapshot
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Persist the health snapshot to KV. Silent on failure. Caller is
 * responsible for throttling — call this at most every 30s per
 * isolate to avoid KV-op burn.
 */
export async function persistProviderHealth(
  snapshot: ProviderHealthSnapshot,
): Promise<void> {
  if (!healthStoreEnabled()) return
  const kv = await getKv()
  if (!kv) return
  try {
    await kv.put(KV_KEY, JSON.stringify(snapshot))
  } catch {
    // intentional silent failure
  }
}
