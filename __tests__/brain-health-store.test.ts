import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
  process.env = { ...ORIGINAL_ENV }
})

// Mock KV namespace + Cloudflare context
let kvStore: Map<string, string> = new Map()
let kvAvailable = true
let kvShouldThrow = false

beforeEach(() => {
  kvStore = new Map()
  kvAvailable = true
  kvShouldThrow = false
})

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: async () => ({
    env: kvAvailable
      ? {
          BRAIN_HEALTH_KV: {
            get: async (key: string) => {
              if (kvShouldThrow) throw new Error('simulated KV failure')
              return kvStore.get(key) ?? null
            },
            put: async (key: string, value: string) => {
              if (kvShouldThrow) throw new Error('simulated KV failure')
              kvStore.set(key, value)
            },
          },
        }
      : {},
  }),
}))

describe('healthStoreEnabled', () => {
  it('returns false when env flag is unset', async () => {
    delete process.env.BRAIN_HEALTH_KV_ENABLED
    const { healthStoreEnabled } = await import('@/lib/brain/health-store')
    expect(healthStoreEnabled()).toBe(false)
  })

  it("returns true only when env is exactly 'on'", async () => {
    process.env.BRAIN_HEALTH_KV_ENABLED = 'on'
    const { healthStoreEnabled } = await import('@/lib/brain/health-store')
    expect(healthStoreEnabled()).toBe(true)
    process.env.BRAIN_HEALTH_KV_ENABLED = 'true'
    // Strict check: 'true' is not 'on', so disabled.
    expect(healthStoreEnabled()).toBe(false)
    process.env.BRAIN_HEALTH_KV_ENABLED = '1'
    expect(healthStoreEnabled()).toBe(false)
  })
})

describe('loadProviderHealth', () => {
  it('returns null when feature flag is off', async () => {
    delete process.env.BRAIN_HEALTH_KV_ENABLED
    const { loadProviderHealth } = await import('@/lib/brain/health-store')
    expect(await loadProviderHealth()).toBeNull()
  })

  it('returns null when KV binding is unavailable', async () => {
    process.env.BRAIN_HEALTH_KV_ENABLED = 'on'
    kvAvailable = false
    const { loadProviderHealth } = await import('@/lib/brain/health-store')
    expect(await loadProviderHealth()).toBeNull()
  })

  it('returns null when KV throws', async () => {
    process.env.BRAIN_HEALTH_KV_ENABLED = 'on'
    kvShouldThrow = true
    const { loadProviderHealth } = await import('@/lib/brain/health-store')
    expect(await loadProviderHealth()).toBeNull()
  })

  it('returns the parsed snapshot when KV holds valid JSON', async () => {
    process.env.BRAIN_HEALTH_KV_ENABLED = 'on'
    kvStore.set(
      'BRAIN_HEALTH_V1',
      JSON.stringify({
        openai: { successes: 10, failures: 1, avgLatencyMs: 500 },
        google: { successes: 4, failures: 0, avgLatencyMs: 800 },
      }),
    )
    const { loadProviderHealth } = await import('@/lib/brain/health-store')
    const result = await loadProviderHealth()
    expect(result).not.toBeNull()
    expect(result?.openai.successes).toBe(10)
    expect(result?.google.avgLatencyMs).toBe(800)
  })

  it('returns null when KV holds garbage JSON', async () => {
    process.env.BRAIN_HEALTH_KV_ENABLED = 'on'
    kvStore.set('BRAIN_HEALTH_V1', '{not valid json}')
    const { loadProviderHealth } = await import('@/lib/brain/health-store')
    expect(await loadProviderHealth()).toBeNull()
  })
})

describe('persistProviderHealth', () => {
  it('is a no-op when feature flag is off', async () => {
    delete process.env.BRAIN_HEALTH_KV_ENABLED
    const { persistProviderHealth } = await import('@/lib/brain/health-store')
    await persistProviderHealth({
      openai: { successes: 1, failures: 0, avgLatencyMs: 500 },
    } as never)
    expect(kvStore.has('BRAIN_HEALTH_V1')).toBe(false)
  })

  it('writes to KV when feature flag is on', async () => {
    process.env.BRAIN_HEALTH_KV_ENABLED = 'on'
    const { persistProviderHealth } = await import('@/lib/brain/health-store')
    await persistProviderHealth({
      openai: { successes: 7, failures: 1, avgLatencyMs: 600 },
    } as never)
    const stored = kvStore.get('BRAIN_HEALTH_V1')
    expect(stored).toBeDefined()
    const parsed = JSON.parse(stored!)
    expect(parsed.openai.successes).toBe(7)
  })

  it('silently ignores KV failures', async () => {
    process.env.BRAIN_HEALTH_KV_ENABLED = 'on'
    kvShouldThrow = true
    const { persistProviderHealth } = await import('@/lib/brain/health-store')
    await expect(
      persistProviderHealth({
        openai: { successes: 1, failures: 0, avgLatencyMs: 500 },
      } as never),
    ).resolves.toBeUndefined()
  })
})
