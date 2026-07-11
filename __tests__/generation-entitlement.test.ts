import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Tests for src/lib/billing/generation-entitlement.ts (SA-026).
 *
 * The gate: verified account required; 1 free generation per account
 * (atomic reservation); subscribers get a monthly allowance counted
 * from real plan instances. Fail closed on lookup failures.
 */

type BillingState = {
  userId: string
  subscriptionTier: string
  effectiveTier: string
  premiumActive: boolean
  freeGenerationUsedAt: string | null
  subscriptionStatus?: string | null
  subscriptionRenewsAt?: string | null
  premiumExpiresAt?: string | null
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  foundingMemberAt?: string | null
}

let billingState: BillingState | null = null

vi.mock('@/lib/billing/subscription-state', () => ({
  readUserBillingState: vi.fn(() => Promise.resolve(billingState)),
}))

// In-memory users table for reserve/release + session/plan tables for
// the monthly allowance count.
let userRows: { id: string; free_generation_used_at: string | null }[] = []
let sessionRows: { session_token: string; user_id: string }[] = []
let planRows: { session_token: string; created_at: string }[] = []

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {}
      let mode: 'select' | 'update' = 'select'
      let updateValues: Record<string, unknown> = {}
      let usersFiltered = userRows
      let sessionsFiltered = sessionRows
      let plansFiltered = planRows
      let countMode = false

      chain.select = vi.fn(
        (_cols?: string, opts?: { count?: 'exact'; head?: boolean }) => {
          if (opts?.count === 'exact') countMode = true
          return chain
        },
      )
      chain.update = vi.fn((values: Record<string, unknown>) => {
        mode = 'update'
        updateValues = values
        return chain
      })
      chain.eq = vi.fn((col: string, val: unknown) => {
        if (table === 'users') {
          usersFiltered = usersFiltered.filter(
            (row) => row[col as 'id'] === val,
          )
        } else if (table === 'user_sessions') {
          sessionsFiltered = sessionsFiltered.filter(
            (row) => row[col as 'user_id'] === val,
          )
        }
        return chain
      })
      chain.is = vi.fn((col: string, val: null) => {
        if (table === 'users') {
          usersFiltered = usersFiltered.filter(
            (row) => (row[col as 'free_generation_used_at'] ?? null) === val,
          )
        }
        return chain
      })
      chain.in = vi.fn((_col: string, vals: string[]) => {
        plansFiltered = plansFiltered.filter((row) =>
          vals.includes(row.session_token),
        )
        return chain
      })
      chain.gte = vi.fn((_col: string, val: string) => {
        plansFiltered = plansFiltered.filter((row) => row.created_at >= val)
        return chain
      })
      chain.maybeSingle = vi.fn(() => {
        if (mode === 'update' && table === 'users') {
          const target = usersFiltered[0] ?? null
          if (target) {
            userRows = userRows.map((row) =>
              row.id === target.id ? { ...row, ...updateValues } : row,
            )
          }
          return Promise.resolve({
            data: target ? { id: target.id } : null,
            error: null,
          })
        }
        return Promise.resolve({ data: usersFiltered[0] ?? null, error: null })
      })
      chain.then = (resolve: (value: unknown) => void) => {
        if (mode === 'update' && table === 'users') {
          const target = usersFiltered[0] ?? null
          if (target) {
            userRows = userRows.map((row) =>
              row.id === target.id ? { ...row, ...updateValues } : row,
            )
          }
          resolve({ error: null })
          return
        }
        if (table === 'user_sessions') {
          resolve({ data: sessionsFiltered, error: null })
          return
        }
        if (countMode) {
          resolve({ count: plansFiltered.length, error: null })
          return
        }
        resolve({ data: [], error: null })
      }
      return chain
    },
  }),
}))

function premiumState(overrides: Partial<BillingState> = {}): BillingState {
  return {
    userId: 'u1',
    subscriptionTier: 'premium',
    effectiveTier: 'premium',
    premiumActive: true,
    freeGenerationUsedAt: null,
    ...overrides,
  }
}

function freeState(overrides: Partial<BillingState> = {}): BillingState {
  return {
    userId: 'u1',
    subscriptionTier: 'free',
    effectiveTier: 'free',
    premiumActive: false,
    freeGenerationUsedAt: null,
    ...overrides,
  }
}

beforeEach(() => {
  billingState = null
  userRows = []
  sessionRows = []
  planRows = []
  vi.unstubAllEnvs()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('generationGateLive', () => {
  it('is OFF unless GENERATION_GATE_LIVE is exactly "true"', async () => {
    const { generationGateLive } =
      await import('@/lib/billing/generation-entitlement')
    expect(generationGateLive()).toBe(false)
    vi.stubEnv('GENERATION_GATE_LIVE', 'true')
    expect(generationGateLive()).toBe(true)
  })
})

describe('checkGenerationEntitlement', () => {
  it('rejects anonymous callers (no_account)', async () => {
    const { checkGenerationEntitlement } =
      await import('@/lib/billing/generation-entitlement')
    const result = await checkGenerationEntitlement(null)
    expect(result.allowed).toBe(false)
    if (!result.allowed) expect(result.reason).toBe('no_account')
  })

  it('fails CLOSED when the billing state lookup fails', async () => {
    billingState = null
    const { checkGenerationEntitlement } =
      await import('@/lib/billing/generation-entitlement')
    const result = await checkGenerationEntitlement('u1')
    expect(result.allowed).toBe(false)
    if (!result.allowed) expect(result.reason).toBe('no_entitlement')
  })

  it('allows the free grant when unused', async () => {
    billingState = freeState({ freeGenerationUsedAt: null })
    const { checkGenerationEntitlement } =
      await import('@/lib/billing/generation-entitlement')
    const result = await checkGenerationEntitlement('u1')
    expect(result).toEqual({ allowed: true, source: 'free_grant' })
  })

  it('rejects when the free grant is spent and no subscription exists', async () => {
    billingState = freeState({
      freeGenerationUsedAt: '2026-07-01T00:00:00.000Z',
    })
    const { checkGenerationEntitlement } =
      await import('@/lib/billing/generation-entitlement')
    const result = await checkGenerationEntitlement('u1')
    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.reason).toBe('no_entitlement')
      expect(result.freeGenerationUsed).toBe(true)
    }
  })

  it('allows subscribers under the monthly allowance', async () => {
    billingState = premiumState()
    sessionRows = [{ session_token: 's1', user_id: 'u1' }]
    planRows = [
      { session_token: 's1', created_at: new Date().toISOString() },
      { session_token: 's1', created_at: new Date().toISOString() },
    ]
    const { checkGenerationEntitlement } =
      await import('@/lib/billing/generation-entitlement')
    const result = await checkGenerationEntitlement('u1')
    expect(result.allowed).toBe(true)
    if (result.allowed && result.source === 'subscription') {
      expect(result.allowance).toEqual({ used: 2, limit: 6 })
    }
  })

  it('rejects subscribers at the monthly allowance (allowance_exhausted)', async () => {
    vi.stubEnv('SUBSCRIPTION_MONTHLY_GENERATION_ALLOWANCE', '2')
    billingState = premiumState({
      freeGenerationUsedAt: '2026-07-01T00:00:00.000Z',
    })
    sessionRows = [{ session_token: 's1', user_id: 'u1' }]
    planRows = [
      { session_token: 's1', created_at: new Date().toISOString() },
      { session_token: 's1', created_at: new Date().toISOString() },
    ]
    const { checkGenerationEntitlement } =
      await import('@/lib/billing/generation-entitlement')
    const result = await checkGenerationEntitlement('u1')
    expect(result.allowed).toBe(false)
    if (!result.allowed) expect(result.reason).toBe('allowance_exhausted')
  })

  it('treats a non-positive allowance env as unlimited', async () => {
    vi.stubEnv('SUBSCRIPTION_MONTHLY_GENERATION_ALLOWANCE', '0')
    billingState = premiumState()
    const { checkGenerationEntitlement } =
      await import('@/lib/billing/generation-entitlement')
    const result = await checkGenerationEntitlement('u1')
    expect(result.allowed).toBe(true)
    if (result.allowed && result.source === 'subscription') {
      expect(result.allowance.limit).toBeNull()
    }
  })

  it('does not count last month’s plans against the allowance', async () => {
    vi.stubEnv('SUBSCRIPTION_MONTHLY_GENERATION_ALLOWANCE', '2')
    billingState = premiumState()
    sessionRows = [{ session_token: 's1', user_id: 'u1' }]
    planRows = [
      { session_token: 's1', created_at: '2020-01-05T00:00:00.000Z' },
      { session_token: 's1', created_at: '2020-01-06T00:00:00.000Z' },
    ]
    const { checkGenerationEntitlement } =
      await import('@/lib/billing/generation-entitlement')
    const result = await checkGenerationEntitlement('u1')
    expect(result.allowed).toBe(true)
  })
})

describe('reserveFreeGeneration', () => {
  it('consumes the grant exactly once (atomic conditional update)', async () => {
    userRows = [{ id: 'u1', free_generation_used_at: null }]
    const { reserveFreeGeneration } =
      await import('@/lib/billing/generation-entitlement')
    const first = await reserveFreeGeneration('u1')
    const second = await reserveFreeGeneration('u1')
    expect(first).toBe(true)
    expect(second).toBe(false)
    expect(userRows[0].free_generation_used_at).not.toBeNull()
  })

  it('returns false for an unknown user', async () => {
    const { reserveFreeGeneration } =
      await import('@/lib/billing/generation-entitlement')
    expect(await reserveFreeGeneration('nobody')).toBe(false)
  })
})

describe('releaseFreeGeneration', () => {
  it('restores the grant after a failed plan creation', async () => {
    userRows = [
      { id: 'u1', free_generation_used_at: '2026-07-10T00:00:00.000Z' },
    ]
    const { releaseFreeGeneration } =
      await import('@/lib/billing/generation-entitlement')
    await releaseFreeGeneration('u1')
    expect(userRows[0].free_generation_used_at).toBeNull()
  })
})
