import type { BillingPlatform } from '@/types/billing'

const CHECKOUT_SESSION_ID_RE = /^cs_(test|live)_[A-Za-z0-9_]+$/

export interface BillingFlash {
  message: string | null
  error: string | null
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
    return { message: null, error: null }
  }

  if (status === 'success') {
    return {
      message:
        params.platform === 'ios'
          ? 'Subscription activated through App Store.'
          : 'Subscription activated. You can now manage billing from settings.',
      error: null,
    }
  }

  if (status === 'cancelled' || status === 'canceled') {
    return {
      message: null,
      error:
        params.platform === 'ios'
          ? 'App Store purchase was cancelled.'
          : 'Checkout was cancelled before completion.',
    }
  }

  if (status === 'restore_success') {
    return {
      message: 'Purchases restored successfully.',
      error: null,
    }
  }

  if (status === 'restore_failed') {
    return {
      message: null,
      error: 'Could not restore purchases right now. Please try again.',
    }
  }

  return {
    message: null,
    error: 'Billing status could not be verified. Please retry.',
  }
}
