import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'

/**
 * Tests for src/lib/billing/webhook-handlers.ts (SA-028).
 *
 * The handlers resolve the user (stored stripe_customer_id →
 * metadata.user_id → email fallback) and write the full subscription
 * state to public.users. We mock via the in-memory Supabase admin
 * client.
 */

type UserRow = {
  id: string
  email: string
  subscription_tier?: 'free' | 'premium' | 'lifetime'
  founding_member_at?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  subscription_status?: string | null
  subscription_renews_at?: string | null
  premium_expires_at?: string | null
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
  // Rows an UPDATE actually matched — the writer `.select('id')`s to
  // prove it wrote, so the mock must report matched rows, not just the
  // absence of an error.
  let updatedRows: UserRow[] = []

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
      updatedRows = users.filter((u) => u[col] === val)
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
        data: updateShouldFail ? null : updatedRows,
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
  customerId?: string
  metadataUserId?: string
  subscriptionId?: string
}): Stripe.Subscription {
  return {
    id: opts.subscriptionId ?? 'sub_test',
    status: opts.status,
    customer: opts.email
      ? ({
          id: opts.customerId ?? 'cus_test',
          email: opts.email,
          deleted: false,
        } as unknown as Stripe.Customer)
      : (opts.customerId ?? 'cus_no_email'),
    metadata: {
      ...(opts.planId ? { plan_id: opts.planId } : {}),
      ...(opts.metadataUserId ? { user_id: opts.metadataUserId } : {}),
    },
    items: { data: [] },
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
    // The writer proved it wrote — a matched-row update reports no error.
    expect(result.error).toBeUndefined()
    expect(users[0].subscription_tier).toBe('premium')
  })

  it('records a non-active status honestly without granting premium', async () => {
    users.push({
      id: 'u1',
      email: 'a@example.com',
      subscription_tier: 'free',
    })
    const sub = makeSubscription({
      status: 'incomplete',
      email: 'a@example.com',
    })
    const { handleSubscriptionCreated } =
      await import('@/lib/billing/webhook-handlers')
    const result = await handleSubscriptionCreated(sub, fakeStripe)
    expect(result.handled).toBe(true)
    expect(users[0].subscription_tier).toBe('free')
    expect(users[0].subscription_status).toBe('incomplete')
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
    const result = await handleInvoicePaymentFailed(inv, fakeStripe)
    expect(result.handled).toBe(true)
    expect(users[0].subscription_tier).toBe('premium')
    expect(users[0].subscription_status).toBe('past_due')
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
    const result = await handleInvoicePaid(inv, fakeStripe)
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
    const result = await handleInvoicePaid(inv, fakeStripe)
    expect(result.handled).toBe(false)
    expect(result.skipReason).toContain('no subscription lines')
    expect(users[0].subscription_tier).toBe('free')
  })
})

describe('customer→user mapping precedence (SA-028)', () => {
  it('maps by stored stripe_customer_id before anything else', async () => {
    users.push(
      {
        id: 'u-linked',
        email: 'linked@example.com',
        subscription_tier: 'free',
        stripe_customer_id: 'cus_stored',
      },
      // Same email as the event customer — must NOT win over the id.
      { id: 'u-email', email: 'buyer@example.com', subscription_tier: 'free' },
    )
    const sub = makeSubscription({
      status: 'active',
      email: 'buyer@example.com',
      customerId: 'cus_stored',
    })
    const { handleSubscriptionCreated } =
      await import('@/lib/billing/webhook-handlers')
    const result = await handleSubscriptionCreated(sub, fakeStripe)
    expect(result.userId).toBe('u-linked')
    expect(users.find((u) => u.id === 'u-linked')?.subscription_tier).toBe(
      'premium',
    )
    expect(users.find((u) => u.id === 'u-email')?.subscription_tier).toBe(
      'free',
    )
  })

  it('maps by metadata.user_id when no stored customer link exists', async () => {
    users.push({
      id: 'u-meta',
      email: 'different@example.com',
      subscription_tier: 'free',
    })
    const sub = makeSubscription({
      status: 'active',
      customerId: 'cus_unknown',
      metadataUserId: 'u-meta',
    })
    const { handleSubscriptionCreated } =
      await import('@/lib/billing/webhook-handlers')
    const result = await handleSubscriptionCreated(sub, fakeStripe)
    expect(result.userId).toBe('u-meta')
    expect(users[0].subscription_tier).toBe('premium')
  })

  it('falls back to email match and persists the customer link', async () => {
    users.push({
      id: 'u-legacy',
      email: 'legacy@example.com',
      subscription_tier: 'free',
    })
    const sub = makeSubscription({
      status: 'active',
      email: 'legacy@example.com',
      customerId: 'cus_legacy',
    })
    const { handleSubscriptionCreated } =
      await import('@/lib/billing/webhook-handlers')
    const result = await handleSubscriptionCreated(sub, fakeStripe)
    expect(result.userId).toBe('u-legacy')
    expect(users[0].stripe_customer_id).toBe('cus_legacy')
    expect(users[0].stripe_subscription_id).toBe('sub_test')
  })
})

describe('handleCheckoutSessionCompleted', () => {
  function makeSession(opts: {
    mode: 'payment' | 'subscription'
    planId?: string
    userId?: string
    customerId?: string
    paymentStatus?: string
  }): Stripe.Checkout.Session {
    return {
      mode: opts.mode,
      status: 'complete',
      payment_status: opts.paymentStatus ?? 'paid',
      customer: opts.customerId ?? 'cus_test',
      client_reference_id: opts.userId ?? null,
      created: Math.floor(Date.parse('2026-07-10T00:00:00.000Z') / 1000),
      metadata: {
        ...(opts.planId ? { plan_id: opts.planId } : {}),
        ...(opts.userId ? { user_id: opts.userId } : {}),
      },
    } as unknown as Stripe.Checkout.Session
  }

  it('grants term premium for a one-time 2-year plan', async () => {
    users.push({ id: 'u1', email: 'a@example.com', subscription_tier: 'free' })
    const session = makeSession({
      mode: 'payment',
      planId: 'premium_2year',
      userId: 'u1',
    })
    const { handleCheckoutSessionCompleted } =
      await import('@/lib/billing/webhook-handlers')
    const result = await handleCheckoutSessionCompleted(session, fakeStripe)
    expect(result.handled).toBe(true)
    expect(result.userId).toBe('u1')
    expect(users[0].premium_expires_at).toBe('2028-07-10T00:00:00.000Z')
    expect(users[0].subscription_status).toBe('term_active')
  })

  it('only persists the customer link for subscription-mode sessions', async () => {
    users.push({ id: 'u1', email: 'a@example.com', subscription_tier: 'free' })
    const session = makeSession({
      mode: 'subscription',
      planId: 'premium_annual',
      userId: 'u1',
      customerId: 'cus_new',
    })
    const { handleCheckoutSessionCompleted } =
      await import('@/lib/billing/webhook-handlers')
    const result = await handleCheckoutSessionCompleted(session, fakeStripe)
    expect(result.handled).toBe(true)
    expect(users[0].stripe_customer_id).toBe('cus_new')
    // Premium itself arrives via customer.subscription.created.
    expect(users[0].subscription_tier).toBe('free')
    expect(users[0].premium_expires_at ?? null).toBeNull()
  })
})
