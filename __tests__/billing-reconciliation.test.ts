import { beforeEach, describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'

/**
 * Tests for src/lib/billing/reconciliation.ts (§12.1, SA-028).
 *
 * Corrections require positive Stripe evidence; ambiguous premium rows
 * alert without auto-downgrade; Stripe errors leave rows untouched.
 */

type UserRow = {
  id: string
  subscription_tier: 'free' | 'premium' | 'lifetime'
  subscription_status: string | null
  subscription_renews_at: string | null
  premium_expires_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

let users: UserRow[] = []
/** When false, correction UPDATEs match no row (drift between read and write). */
let updateMatchesRow = true

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => {
      let filtered = users
      let mode: 'select' | 'update' = 'select'
      let updateValues: Record<string, unknown> = {}
      let matchedRows: Array<{ id: string }> = []
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn(() => {
        if (mode === 'update') {
          // .update().eq().select('id') — resolve with the rows the
          // UPDATE actually matched, so the writer can prove it wrote.
          return Promise.resolve({ data: matchedRows, error: null })
        }
        return chain
      })
      chain.or = vi.fn(() => {
        filtered = users.filter(
          (row) =>
            row.subscription_tier !== 'free' ||
            row.stripe_subscription_id !== null,
        )
        return chain
      })
      chain.range = vi.fn((from: number, to: number) => {
        const page = filtered.slice(from, to + 1)
        return Promise.resolve({ data: page, error: null })
      })
      chain.update = vi.fn((values: Record<string, unknown>) => {
        mode = 'update'
        updateValues = values
        return chain
      })
      chain.eq = vi.fn((col: string, val: unknown) => {
        if (mode === 'update') {
          const matched = updateMatchesRow
            ? users.filter((row) => row[col as 'id'] === val)
            : []
          matchedRows = matched.map((row) => ({ id: row.id }))
          users = users.map((row) =>
            matched.includes(row) ? { ...row, ...updateValues } : row,
          )
        }
        return chain
      })
      return chain
    },
  }),
}))

function baseUser(overrides: Partial<UserRow>): UserRow {
  return {
    id: 'u1',
    subscription_tier: 'free',
    subscription_status: null,
    subscription_renews_at: null,
    premium_expires_at: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    ...overrides,
  }
}

function fakeStripe(
  subs: Record<
    string,
    { status: string; current_period_end?: number } | 'missing' | 'error'
  >,
): Stripe {
  return {
    subscriptions: {
      retrieve: async (id: string) => {
        const entry = subs[id]
        if (entry === 'missing') {
          const err = new Error('No such subscription') as Error & {
            code: string
          }
          err.code = 'resource_missing'
          throw err
        }
        if (entry === 'error' || !entry) {
          throw new Error('network flake')
        }
        return {
          id,
          status: entry.status,
          items: {
            data: entry.current_period_end
              ? [{ current_period_end: entry.current_period_end }]
              : [],
          },
        } as unknown as Stripe.Subscription
      },
    },
  } as unknown as Stripe
}

beforeEach(() => {
  users = []
  updateMatchesRow = true
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('reconcileBillingState', () => {
  it('corrects a premium row whose Stripe subscription is canceled', async () => {
    users = [
      baseUser({
        subscription_tier: 'premium',
        subscription_status: 'active',
        stripe_subscription_id: 'sub_1',
      }),
    ]
    const { reconcileBillingState } =
      await import('@/lib/billing/reconciliation')
    const report = await reconcileBillingState({
      stripe: fakeStripe({ sub_1: { status: 'canceled' } }),
    })
    expect(report.corrected).toHaveLength(1)
    expect(report.corrected[0]).toMatchObject({
      userId: 'u1',
      field: 'subscription_tier',
      from: 'premium',
      to: 'free',
    })
    expect(users[0].subscription_tier).toBe('free')
    expect(users[0].subscription_status).toBe('canceled')
  })

  it('upgrades a free row whose Stripe subscription is actually active (missed webhook)', async () => {
    users = [
      baseUser({
        subscription_tier: 'free',
        stripe_subscription_id: 'sub_2',
      }),
    ]
    const { reconcileBillingState } =
      await import('@/lib/billing/reconciliation')
    const renewUnix = Math.floor(Date.parse('2027-01-01T00:00:00Z') / 1000)
    const report = await reconcileBillingState({
      stripe: fakeStripe({
        sub_2: { status: 'active', current_period_end: renewUnix },
      }),
    })
    expect(report.corrected).toHaveLength(1)
    expect(users[0].subscription_tier).toBe('premium')
    expect(users[0].subscription_renews_at).toBe('2027-01-01T00:00:00.000Z')
  })

  it('is a no-op when DB and Stripe agree', async () => {
    const renewUnix = Math.floor(Date.parse('2027-01-01T00:00:00Z') / 1000)
    users = [
      baseUser({
        subscription_tier: 'premium',
        subscription_status: 'active',
        subscription_renews_at: '2027-01-01T00:00:00.000Z',
        stripe_subscription_id: 'sub_3',
      }),
    ]
    const { reconcileBillingState } =
      await import('@/lib/billing/reconciliation')
    const report = await reconcileBillingState({
      stripe: fakeStripe({
        sub_3: { status: 'active', current_period_end: renewUnix },
      }),
    })
    expect(report.corrected).toHaveLength(0)
    expect(report.alerts).toHaveLength(0)
    expect(report.errors).toHaveLength(0)
  })

  it('treats a Stripe-deleted subscription (resource_missing) as free', async () => {
    users = [
      baseUser({
        subscription_tier: 'premium',
        stripe_subscription_id: 'sub_gone',
      }),
    ]
    const { reconcileBillingState } =
      await import('@/lib/billing/reconciliation')
    const report = await reconcileBillingState({
      stripe: fakeStripe({ sub_gone: 'missing' }),
    })
    expect(report.corrected).toHaveLength(1)
    expect(users[0].subscription_tier).toBe('free')
  })

  it('ALERTS but never auto-downgrades premium with no Stripe evidence', async () => {
    users = [
      baseUser({
        subscription_tier: 'premium',
        stripe_subscription_id: null,
      }),
    ]
    const { reconcileBillingState } =
      await import('@/lib/billing/reconciliation')
    const report = await reconcileBillingState({ stripe: fakeStripe({}) })
    expect(report.alerts).toHaveLength(1)
    expect(report.corrected).toHaveLength(0)
    expect(users[0].subscription_tier).toBe('premium')
  })

  it('leaves unexpired one-time term users untouched', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    users = [
      baseUser({
        subscription_tier: 'premium',
        premium_expires_at: future,
        stripe_subscription_id: null,
      }),
    ]
    const { reconcileBillingState } =
      await import('@/lib/billing/reconciliation')
    const report = await reconcileBillingState({ stripe: fakeStripe({}) })
    expect(report.alerts).toHaveLength(0)
    expect(report.corrected).toHaveLength(0)
    expect(users[0].subscription_tier).toBe('premium')
  })

  it('records Stripe errors and touches nothing', async () => {
    users = [
      baseUser({
        subscription_tier: 'premium',
        subscription_status: 'active',
        stripe_subscription_id: 'sub_flaky',
      }),
    ]
    const { reconcileBillingState } =
      await import('@/lib/billing/reconciliation')
    const report = await reconcileBillingState({
      stripe: fakeStripe({ sub_flaky: 'error' }),
    })
    expect(report.errors).toHaveLength(1)
    expect(report.corrected).toHaveLength(0)
    expect(users[0].subscription_tier).toBe('premium')
  })

  it('reports a failure, not a correction, when the UPDATE matches zero rows', async () => {
    users = [
      baseUser({
        subscription_tier: 'premium',
        subscription_status: 'active',
        stripe_subscription_id: 'sub_ghost',
      }),
    ]
    updateMatchesRow = false
    const { reconcileBillingState } =
      await import('@/lib/billing/reconciliation')
    const report = await reconcileBillingState({
      stripe: fakeStripe({ sub_ghost: { status: 'canceled' } }),
    })
    expect(report.corrected).toHaveLength(0)
    expect(report.errors).toHaveLength(1)
    expect(report.errors[0].error).toContain('matched 0 rows')
    expect(users[0].subscription_tier).toBe('premium')
  })

  it('flags legacy lifetime rows for founder review', async () => {
    users = [baseUser({ subscription_tier: 'lifetime' })]
    const { reconcileBillingState } =
      await import('@/lib/billing/reconciliation')
    const report = await reconcileBillingState({ stripe: fakeStripe({}) })
    expect(report.alerts).toHaveLength(1)
    expect(report.alerts[0].message).toContain('lifetime')
    expect(users[0].subscription_tier).toBe('lifetime')
  })
})
