/**
 * Billing hygiene now the columns exist (audit B10/B11/M8).
 *
 * Contract under test:
 *  - POST /api/billing/portal resolves the Stripe customer from the
 *    signed-in reader's stored `stripe_customer_id` FIRST (SA-028's
 *    webhook-written link, read through `readUserBillingState`). That is
 *    the path that works on a device which never saw the checkout.
 *  - The device-local checkout session is the FALLBACK, used only when
 *    no stored id exists — and the honest 400 for a reader with neither
 *    is unchanged.
 *  - The webhook writer proves it wrote: an UPDATE that matches zero
 *    rows is a failure, not a green log (B11).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { AuthSessionMissingError } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import type { UserBillingState } from '@/lib/billing/subscription-state'

const {
  getUserMock,
  readUserBillingStateMock,
  checkoutRetrieveMock,
  portalCreateMock,
  adminState,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  readUserBillingStateMock: vi.fn(),
  checkoutRetrieveMock: vi.fn(),
  portalCreateMock: vi.fn(),
  /** Rows the mocked UPDATE reports as matched. */
  adminState: { updateRows: [] as Array<{ id: string }> },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: getUserMock } }),
}))

vi.mock('@/lib/billing/subscription-state', () => ({
  readUserBillingState: readUserBillingStateMock,
  // Webhook handlers resolve the user by metadata.user_id here, so the
  // stored-id lookup deliberately finds nothing.
  findUserIdByStripeCustomerId: async () => null,
}))

vi.mock('stripe', () => ({
  // `new Stripe(key)` in the route — a class, not an arrow factory.
  default: class StripeMock {
    checkout = { sessions: { retrieve: checkoutRetrieveMock } }
    billingPortal = { sessions: { create: portalCreateMock } }
  },
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => {
      const chain: Record<string, unknown> = {}
      chain.update = vi.fn(() => chain)
      chain.eq = vi.fn(() => chain)
      chain.select = vi.fn(() => chain)
      chain.then = (resolve: (value: unknown) => void) => {
        resolve({ data: adminState.updateRows, error: null })
      }
      return chain
    },
  }),
}))

import { POST as portalHandler } from '@/app/api/billing/portal/route'
import { handleSubscriptionCreated } from '@/lib/billing/webhook-handlers'

const originalStripeKey = process.env.STRIPE_SECRET_KEY

let requestCounter = 0

function makeRequest(body: Record<string, unknown>): NextRequest {
  requestCounter += 1
  // A real NextRequest — the route reads request.nextUrl.origin. Unique
  // IP per request so the in-memory rate limiter never couples tests.
  return new NextRequest('http://localhost:3333/api/billing/portal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': `10.9.${requestCounter}.1`,
    },
    body: JSON.stringify(body),
  })
}

function billingState(
  overrides: Partial<UserBillingState> & { userId: string },
): UserBillingState {
  return {
    subscriptionTier: 'premium',
    effectiveTier: 'premium',
    premiumActive: true,
    subscriptionStatus: 'active',
    subscriptionRenewsAt: '2027-01-01T00:00:00.000Z',
    premiumExpiresAt: null,
    stripeCustomerId: null,
    stripeSubscriptionId: 'sub_test',
    foundingMemberAt: null,
    freeGenerationUsedAt: null,
    generationCredits: 0,
    ...overrides,
  }
}

beforeEach(() => {
  getUserMock.mockReset()
  readUserBillingStateMock.mockReset()
  checkoutRetrieveMock.mockReset()
  portalCreateMock.mockReset()
  adminState.updateRows = []
  process.env.STRIPE_SECRET_KEY = 'sk_test_portal'
  portalCreateMock.mockResolvedValue({
    url: 'https://billing.stripe.com/p/session_test',
  })
})

afterEach(() => {
  if (originalStripeKey === undefined) {
    delete process.env.STRIPE_SECRET_KEY
  } else {
    process.env.STRIPE_SECRET_KEY = originalStripeKey
  }
  vi.clearAllMocks()
})

describe('POST /api/billing/portal — customer resolution', () => {
  it('opens the portal from the stored customer id with no device session', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } })
    readUserBillingStateMock.mockResolvedValue(
      billingState({ userId: 'u1', stripeCustomerId: 'cus_stored' }),
    )

    const response = await portalHandler(
      makeRequest({ returnPath: '/settings/subscription' }),
    )
    expect(response.status).toBe(200)

    const payload = (await response.json()) as { portalUrl?: string }
    expect(payload.portalUrl).toBe('https://billing.stripe.com/p/session_test')
    expect(readUserBillingStateMock).toHaveBeenCalledWith('u1')
    expect(checkoutRetrieveMock).not.toHaveBeenCalled()
    expect(portalCreateMock).toHaveBeenCalledWith({
      customer: 'cus_stored',
      return_url: 'http://localhost:3333/settings/subscription',
    })
  })

  it('prefers the stored customer id over a device checkout session', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1' } } })
    readUserBillingStateMock.mockResolvedValue(
      billingState({ userId: 'u1', stripeCustomerId: 'cus_stored' }),
    )

    const response = await portalHandler(
      makeRequest({
        checkoutSessionId: 'cs_test_deviceonly',
        returnPath: '/settings/subscription',
      }),
    )
    expect(response.status).toBe(200)
    expect(checkoutRetrieveMock).not.toHaveBeenCalled()
    expect(portalCreateMock.mock.calls[0][0]).toMatchObject({
      customer: 'cus_stored',
    })
  })

  it('falls back to the checkout session when no customer id is stored', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u2' } } })
    readUserBillingStateMock.mockResolvedValue(
      billingState({ userId: 'u2', stripeCustomerId: null }),
    )
    checkoutRetrieveMock.mockResolvedValue({ customer: 'cus_from_session' })

    const response = await portalHandler(
      makeRequest({
        checkoutSessionId: 'cs_test_abc123',
        returnPath: '/settings/subscription',
      }),
    )
    expect(response.status).toBe(200)
    expect(checkoutRetrieveMock).toHaveBeenCalledWith('cs_test_abc123')
    expect(portalCreateMock.mock.calls[0][0]).toMatchObject({
      customer: 'cus_from_session',
    })
  })

  it('keeps the anonymous path on the checkout session (no billing read)', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    checkoutRetrieveMock.mockResolvedValue({
      customer: { id: 'cus_expanded' },
    })

    const response = await portalHandler(
      makeRequest({
        checkoutSessionId: 'cs_test_anon456',
        returnPath: '/settings/subscription',
      }),
    )
    expect(response.status).toBe(200)
    expect(readUserBillingStateMock).not.toHaveBeenCalled()
    expect(portalCreateMock.mock.calls[0][0]).toMatchObject({
      customer: 'cus_expanded',
    })
  })

  it('treats a missing auth session as the anonymous reader, not a failure', async () => {
    // supabase-js answers a session-less getUser() with an
    // AuthSessionMissingError — that IS the anonymous reader, and the
    // device checkout session must still work for them.
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: new AuthSessionMissingError(),
    })
    checkoutRetrieveMock.mockResolvedValue({ customer: 'cus_sessionless' })

    const response = await portalHandler(
      makeRequest({
        checkoutSessionId: 'cs_test_sessionless',
        returnPath: '/settings/subscription',
      }),
    )
    expect(response.status).toBe(200)
    expect(readUserBillingStateMock).not.toHaveBeenCalled()
    expect(portalCreateMock.mock.calls[0][0]).toMatchObject({
      customer: 'cus_sessionless',
    })
  })

  it('500s on a broken auth read instead of downgrading to anonymous', async () => {
    // Any auth error that is NOT session-missing (network/auth outage)
    // must surface — silently treating a signed-in subscriber as
    // anonymous would open the portal for the wrong resolution path.
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: new Error('auth service unreachable'),
    })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await portalHandler(
      makeRequest({
        checkoutSessionId: 'cs_test_wouldresolve',
        returnPath: '/settings/subscription',
      }),
    )
    expect(response.status).toBe(500)
    const payload = (await response.json()) as { code?: string }
    expect(payload.code).toBe('PORTAL_UNAVAILABLE')
    expect(checkoutRetrieveMock).not.toHaveBeenCalled()
    expect(portalCreateMock).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('still 400s honestly when neither path is available', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u3' } } })
    readUserBillingStateMock.mockResolvedValue(
      billingState({ userId: 'u3', stripeCustomerId: null }),
    )

    const response = await portalHandler(
      makeRequest({ returnPath: '/settings/subscription' }),
    )
    expect(response.status).toBe(400)
    const payload = (await response.json()) as {
      code?: string
      error?: string
    }
    expect(payload.code).toBe('INVALID_CHECKOUT_SESSION')
    expect(payload.error).toBe('A valid checkout session id is required.')
    expect(portalCreateMock).not.toHaveBeenCalled()
  })
})

describe('webhook writer proves it wrote (B11)', () => {
  function makeSubscription(): Stripe.Subscription {
    return {
      id: 'sub_zero_rows',
      status: 'active',
      customer: 'cus_ghost',
      metadata: { user_id: 'u-ghost' },
      items: { data: [] },
    } as unknown as Stripe.Subscription
  }

  const fakeStripe = {
    customers: { retrieve: async () => ({ deleted: true }) as unknown },
  } as unknown as Stripe

  it('reports failure when the UPDATE matches zero rows', async () => {
    adminState.updateRows = []
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await handleSubscriptionCreated(
      makeSubscription(),
      fakeStripe,
    )

    expect(result.handled).toBe(true)
    expect(result.userId).toBe('u-ghost')
    expect(result.error).toBe('failed to update users subscription state')
    expect(errorSpy).toHaveBeenCalled()
    expect(String(errorSpy.mock.calls[0][0])).toContain('matched 0 rows')
    errorSpy.mockRestore()
  })

  it('reports success when the UPDATE matches the row', async () => {
    adminState.updateRows = [{ id: 'u-ghost' }]
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await handleSubscriptionCreated(
      makeSubscription(),
      fakeStripe,
    )

    expect(result.handled).toBe(true)
    expect(result.error).toBeUndefined()
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
