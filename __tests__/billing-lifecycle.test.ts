import { describe, expect, it } from 'vitest'
import { resolveBillingLifecycle } from '@/lib/billing/lifecycle'

describe('billing lifecycle resolver', () => {
  it('maps active subscription to success premium state', () => {
    const lifecycle = resolveBillingLifecycle({
      session: { status: 'complete', payment_status: 'paid' },
      subscription: { status: 'active' },
    })

    expect(lifecycle.billingStatus).toBe('success')
    expect(lifecycle.premiumActive).toBe(true)
    expect(lifecycle.subscriptionStatus).toBe('active')
  })

  it('maps incomplete subscription to requires_action', () => {
    const lifecycle = resolveBillingLifecycle({
      session: { status: 'complete', payment_status: 'unpaid' },
      subscription: { status: 'past_due' },
    })

    expect(lifecycle.billingStatus).toBe('requires_action')
    expect(lifecycle.premiumActive).toBe(false)
  })

  it('maps expired checkout sessions to expired state without premium access', () => {
    const lifecycle = resolveBillingLifecycle({
      session: { status: 'expired', payment_status: 'unpaid' },
    })

    expect(lifecycle.billingStatus).toBe('expired')
    expect(lifecycle.premiumActive).toBe(false)
    expect(lifecycle.subscriptionStatus).toBeNull()
  })
})
