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
      state: 'succeeded',
      message:
        'Subscription activated. You can now manage billing from settings.',
      error: null,
      recoverable: true,
    })

    expect(
      resolveBillingFlash({ billingStatus: 'cancelled', platform: 'ios' }),
    ).toEqual({
      state: 'cancelled',
      message: null,
      error: 'App Store purchase was cancelled.',
      recoverable: true,
    })

    expect(
      resolveBillingFlash({ billingStatus: 'unknown_status', platform: 'web' }),
    ).toEqual({
      state: 'unknown',
      message: null,
      error: 'Billing status could not be verified. Please retry.',
      recoverable: true,
    })
  })

  it('maps processing and requires-action lifecycle states', () => {
    expect(
      resolveBillingFlash({ billingStatus: 'processing', platform: 'web' }),
    ).toEqual({
      state: 'processing',
      message: 'Payment is processing. We will unlock access once confirmed.',
      error: null,
      recoverable: true,
    })

    expect(
      resolveBillingFlash({
        billingStatus: 'requires_action',
        platform: 'web',
      }),
    ).toEqual({
      state: 'requires_action',
      message: null,
      error:
        'Payment requires additional action. Please retry checkout and follow your bank prompts.',
      recoverable: true,
    })
  })

  it('maps restore and terminal failure lifecycle states', () => {
    expect(
      resolveBillingFlash({
        billingStatus: 'restore_success',
        platform: 'web',
      }),
    ).toEqual({
      state: 'restore_succeeded',
      message: 'Purchases restored successfully.',
      error: null,
      recoverable: true,
    })

    expect(
      resolveBillingFlash({ billingStatus: 'restore_failed', platform: 'ios' }),
    ).toEqual({
      state: 'restore_failed',
      message: null,
      error: 'Could not restore purchases right now. Please try again.',
      recoverable: true,
    })

    expect(
      resolveBillingFlash({ billingStatus: 'failed', platform: 'web' }),
    ).toEqual({
      state: 'failed',
      message: null,
      error:
        'Payment did not complete. Please retry or use a different payment method.',
      recoverable: true,
    })
  })
})
