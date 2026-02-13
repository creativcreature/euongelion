import { describe, expect, it } from 'vitest'
import {
  resolveBillingFlash,
  sanitizeBillingReturnPath,
  sanitizeCheckoutSessionId,
} from '@/lib/billing/flash'

describe('billing flash utilities', () => {
  it('sanitizes checkout session ids', () => {
    expect(sanitizeCheckoutSessionId('cs_test_abc123')).toBe('cs_test_abc123')
    expect(sanitizeCheckoutSessionId('cs_live_XYZ_123')).toBe('cs_live_XYZ_123')
    expect(sanitizeCheckoutSessionId('')).toBeNull()
    expect(sanitizeCheckoutSessionId('cs_invalid_x')).toBeNull()
    expect(sanitizeCheckoutSessionId('https://bad')).toBeNull()
  })

  it('sanitizes return paths', () => {
    expect(sanitizeBillingReturnPath('/settings')).toBe('/settings')
    expect(sanitizeBillingReturnPath('/settings?tab=billing')).toBe(
      '/settings?tab=billing',
    )
    expect(sanitizeBillingReturnPath('//evil.example')).toBe('/settings')
    expect(sanitizeBillingReturnPath('https://evil.example')).toBe('/settings')
    expect(sanitizeBillingReturnPath('')).toBe('/settings')
  })

  it('returns user-facing flash messages by platform', () => {
    expect(
      resolveBillingFlash({ billingStatus: 'success', platform: 'web' }),
    ).toEqual({
      message:
        'Subscription activated. You can now manage billing from settings.',
      error: null,
    })

    expect(
      resolveBillingFlash({ billingStatus: 'cancelled', platform: 'ios' }),
    ).toEqual({
      message: null,
      error: 'App Store purchase was cancelled.',
    })

    expect(
      resolveBillingFlash({ billingStatus: 'unknown_status', platform: 'web' }),
    ).toEqual({
      message: null,
      error: 'Billing status could not be verified. Please retry.',
    })
  })
})
