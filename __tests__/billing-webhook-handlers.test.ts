import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'

/**
 * Tests for src/lib/billing/webhook-handlers.ts.
 *
 * The handlers do two things: (1) resolve user from email,
 * (2) update subscription_tier. We mock both via the in-memory
 * Supabase admin client.
 */

type UserRow = {
  id: string
  email: string
  subscription_tier?: 'free' | 'premium' | 'lifetime'
  founding_member_at?: string | null
}

let users: UserRow[] = []
let updateShouldFail = false

function resetState() {
  users = []
  updateShouldFail = false
}

function makeChain(table: string) {
  let filtered = users
  let mode: 'select' | 'update' = 'select'
  let updateValues: Record<string, unknown> | null = null
  let countMode = false

  const chain: Record<string, unknown> = {}
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
  chain.eq = vi.fn((col: keyof UserRow, val: unknown) => {
    if (mode === 'update') {
      if (updateShouldFail) return chain
      users = users.map((u) => (u[col] === val ? { ...u, ...updateValues } : u))
    } else {
      filtered = users.filter((u) => u[col] === val)
    }
    return chain
  })
  chain.is = vi.fn((col: keyof UserRow, val: null) => {
    filtered = filtered.filter((u) => (u[col] ?? null) === val)
    return chain
  })
  chain.not = vi.fn((col: keyof UserRow, op: string, val: null) => {
    if (op === 'is' && val === null) {
      filtered = filtered.filter((u) => u[col] !== null && u[col] !== undefined)
    }
    return chain
  })
  chain.maybeSingle = vi.fn(() => {
    if (mode === 'update') {
      return Promise.resolve({
        data: filtered[0] ?? null,
        error: updateShouldFail ? { message: 'simulated' } : null,
      })
    }
    return Promise.resolve({ data: filtered[0] ?? null, error: null })
  })
  chain.then = (resolve: (value: unknown) => void) => {
    if (mode === 'update') {
      resolve({
        error: updateShouldFail ? { message: 'simulated' } : null,
      })
      return
    }
    if (countMode) {
      resolve({ count: filtered.length, error: null })
      return
    }
    resolve({ data: filtered, error: null })
  }
  return chain
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => makeChain(table),
  }),
}))

beforeEach(() => {
  resetState()
})

afterEach(() => {
  vi.clearAllMocks()
})

// Helpers to build minimal Stripe-shaped fixtures
function makeSubscription(opts: {
  status: string
  email?: string
  planId?: string
}): Stripe.Subscription {
  return {
    status: opts.status,
    customer: opts.email
      ? ({ email: opts.email, deleted: false } as unknown as Stripe.Customer)
      : 'cus_no_email',
    metadata: opts.planId ? { plan_id: opts.planId } : {},
  } as unknown as Stripe.Subscription
}

function makeInvoice(opts: {
  email?: string
  hasSubLines?: boolean
}): Stripe.Invoice {
  return {
    customer: opts.email
      ? ({ email: opts.email, deleted: false } as unknown as Stripe.Customer)
      : 'cus_no_email',
    lines: {
      data: opts.hasSubLines
        ? [{ subscription: 'sub_x' } as unknown as Stripe.InvoiceLineItem]
        : [{ subscription: null } as unknown as Stripe.InvoiceLineItem],
    },
  } as unknown as Stripe.Invoice
}

const fakeStripe = {
  customers: {
    retrieve: async () => ({ deleted: true }) as unknown,
  },
} as unknown as Stripe

describe('handleSubscriptionCreated', () => {
  it('marks user premium when subscription becomes active', async () => {
    users.push({
      id: 'u1',
      email: 'a@example.com',
      subscription_tier: 'free',
    })
    const sub = makeSubscription({
      status: 'active',
      email: 'a@example.com',
    })
    const { handleSubscriptionCreated } =
      await import('@/lib/billing/webhook-handlers')
    const result = await handleSubscriptionCreated(sub, fakeStripe)
    expect(result.handled).toBe(true)
    expect(result.userId).toBe('u1')
    expect(result.changes).toMatchObject({ subscription_tier: 'premium' })
    expect(users[0].subscription_tier).toBe('premium')
  })

  it('skips when status is not active or trialing', async () => {
    users.push({ id: 'u1', email: 'a@example.com' })
    const sub = makeSubscription({
      status: 'incomplete',
      email: 'a@example.com',
    })
    const { handleSubscriptionCreated } =
      await import('@/lib/billing/webhook-handlers')
    const result = await handleSubscriptionCreated(sub, fakeStripe)
    expect(result.handled).toBe(false)
    expect(result.skipReason).toContain('non-active')
  })

  it('skips when no matching user found', async () => {
    const sub = makeSubscription({
      status: 'active',
      email: 'unknown@example.com',
    })
    const { handleSubscriptionCreated } =
      await import('@/lib/billing/webhook-handlers')
    const result = await handleSubscriptionCreated(sub, fakeStripe)
    expect(result.handled).toBe(false)
    expect(result.skipReason).toBe('no matching user')
  })

  it('attempts Founding Member claim when plan is premium_annual', async () => {
    users.push({
      id: 'u1',
      email: 'a@example.com',
      subscription_tier: 'free',
      founding_member_at: null,
    })
    const sub = makeSubscription({
      status: 'active',
      email: 'a@example.com',
      planId: 'premium_annual',
    })
    const { handleSubscriptionCreated } =
      await import('@/lib/billing/webhook-handlers')
    const result = await handleSubscriptionCreated(sub, fakeStripe)
    expect(result.handled).toBe(true)
    expect(result.foundingMemberClaimed).toBe(true)
    expect(users[0].founding_member_at).toBeTruthy()
  })

  it('does NOT attempt Founding Member claim for monthly plan', async () => {
    users.push({
      id: 'u1',
      email: 'a@example.com',
      founding_member_at: null,
    })
    const sub = makeSubscription({
      status: 'active',
      email: 'a@example.com',
      planId: 'premium_monthly',
    })
    const { handleSubscriptionCreated } =
      await import('@/lib/billing/webhook-handlers')
    const result = await handleSubscriptionCreated(sub, fakeStripe)
    expect(result.foundingMemberClaimed).toBeUndefined()
    expect(users[0].founding_member_at ?? null).toBeNull()
  })
})

describe('handleSubscriptionDeleted', () => {
  it('marks user free without clearing founding_member_at', async () => {
    users.push({
      id: 'u1',
      email: 'a@example.com',
      subscription_tier: 'premium',
      founding_member_at: '2026-04-01T00:00:00.000Z',
    })
    const sub = makeSubscription({
      status: 'canceled',
      email: 'a@example.com',
    })
    const { handleSubscriptionDeleted } =
      await import('@/lib/billing/webhook-handlers')
    const result = await handleSubscriptionDeleted(sub, fakeStripe)
    expect(result.handled).toBe(true)
    expect(users[0].subscription_tier).toBe('free')
    expect(users[0].founding_member_at).toBe('2026-04-01T00:00:00.000Z')
  })
})

describe('handleSubscriptionUpdated', () => {
  it('downgrades to free when status becomes canceled', async () => {
    users.push({
      id: 'u1',
      email: 'a@example.com',
      subscription_tier: 'premium',
    })
    const sub = makeSubscription({
      status: 'canceled',
      email: 'a@example.com',
    })
    const { handleSubscriptionUpdated } =
      await import('@/lib/billing/webhook-handlers')
    const result = await handleSubscriptionUpdated(sub, fakeStripe)
    expect(result.handled).toBe(true)
    expect(users[0].subscription_tier).toBe('free')
  })

  it('keeps premium when status is active (renewal)', async () => {
    users.push({
      id: 'u1',
      email: 'a@example.com',
      subscription_tier: 'premium',
    })
    const sub = makeSubscription({
      status: 'active',
      email: 'a@example.com',
    })
    const { handleSubscriptionUpdated } =
      await import('@/lib/billing/webhook-handlers')
    const result = await handleSubscriptionUpdated(sub, fakeStripe)
    expect(result.handled).toBe(true)
    expect(users[0].subscription_tier).toBe('premium')
  })
})

describe('handleInvoicePaymentFailed', () => {
  it('does NOT change tier on payment failure (Stripe will retry)', async () => {
    users.push({
      id: 'u1',
      email: 'a@example.com',
      subscription_tier: 'premium',
    })
    const inv = makeInvoice({ email: 'a@example.com', hasSubLines: true })
    const { handleInvoicePaymentFailed } =
      await import('@/lib/billing/webhook-handlers')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await handleInvoicePaymentFailed(inv)
    expect(result.handled).toBe(true)
    expect(users[0].subscription_tier).toBe('premium')
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

describe('handleInvoicePaid', () => {
  it('re-affirms premium on subscription renewal invoice', async () => {
    users.push({
      id: 'u1',
      email: 'a@example.com',
      subscription_tier: 'free',
    })
    const inv = makeInvoice({ email: 'a@example.com', hasSubLines: true })
    const { handleInvoicePaid } = await import('@/lib/billing/webhook-handlers')
    const result = await handleInvoicePaid(inv)
    expect(result.handled).toBe(true)
    expect(users[0].subscription_tier).toBe('premium')
  })

  it('skips invoice with no subscription lines (one-time payment)', async () => {
    users.push({
      id: 'u1',
      email: 'a@example.com',
      subscription_tier: 'free',
    })
    const inv = makeInvoice({ email: 'a@example.com', hasSubLines: false })
    const { handleInvoicePaid } = await import('@/lib/billing/webhook-handlers')
    const result = await handleInvoicePaid(inv)
    expect(result.handled).toBe(false)
    expect(result.skipReason).toContain('no subscription lines')
    expect(users[0].subscription_tier).toBe('free')
  })
})
