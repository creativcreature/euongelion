import type { BillingPlatform } from '@/types/billing'

const CHECKOUT_SESSION_ID_RE = /^cs_(test|live)_[A-Za-z0-9_]+$/

export type BillingLifecycleState =
  | 'idle'
  | 'processing'
  | 'succeeded'
  | 'cancelled'
  | 'restore_succeeded'
  | 'restore_failed'
  | 'requires_action'
  | 'failed'
  | 'unknown'

export interface BillingFlash {
  state: BillingLifecycleState
  message: string | null
  error: string | null
  recoverable: boolean
}

export function sanitizeCheckoutSessionId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  if (!value) return null
  return CHECKOUT_SESSION_ID_RE.test(value) ? value : null
}

export function sanitizeBillingReturnPath(raw: unknown): string {
  if (typeof raw !== 'string') return '/settings'
  const value = raw.trim()
  if (!value) return '/settings'
  if (!value.startsWith('/')) return '/settings'
  if (value.startsWith('//')) return '/settings'
  if (value.includes('://')) return '/settings'
  if (value.includes('\n') || value.includes('\r')) return '/settings'
  if (value.length > 200) return '/settings'
  return value
}

export function resolveBillingFlash(params: {
  billingStatus: string | null
  platform: BillingPlatform
}): BillingFlash {
  const status = (params.billingStatus || '').trim().toLowerCase()

  if (!status) {
    return { state: 'idle', message: null, error: null, recoverable: true }
  }

  if (status === 'pending' || status === 'processing') {
    return {
      state: 'processing',
      message: 'Payment is processing. We will unlock access once confirmed.',
      error: null,
      recoverable: true,
    }
  }

  if (status === 'success') {
    return {
      state: 'succeeded',
      message:
        params.platform === 'ios'
          ? 'Subscription activated through App Store.'
          : 'Subscription activated. You can now manage billing from settings.',
      error: null,
      recoverable: true,
    }
  }

  if (status === 'cancelled' || status === 'canceled') {
    return {
      state: 'cancelled',
      message: null,
      error:
        params.platform === 'ios'
          ? 'App Store purchase was cancelled.'
          : 'Checkout was cancelled before completion.',
      recoverable: true,
    }
  }

  if (status === 'restore_success') {
    return {
      state: 'restore_succeeded',
      message: 'Purchases restored successfully.',
      error: null,
      recoverable: true,
    }
  }

  if (status === 'restore_failed') {
    return {
      state: 'restore_failed',
      message: null,
      error: 'Could not restore purchases right now. Please try again.',
      recoverable: true,
    }
  }

  if (status === 'requires_action') {
    return {
      state: 'requires_action',
      message: null,
      error:
        'Payment requires additional action. Please retry checkout and follow your bank prompts.',
      recoverable: true,
    }
  }

  if (status === 'failed' || status === 'expired') {
    return {
      state: 'failed',
      message: null,
      error:
        'Payment did not complete. Please retry or use a different payment method.',
      recoverable: true,
    }
  }

  return {
    state: 'unknown',
    message: null,
    error: 'Billing status could not be verified. Please retry.',
    recoverable: true,
  }
}
