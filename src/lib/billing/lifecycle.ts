export type StripeCheckoutSessionSnapshot = {
  status?: string | null
  payment_status?: string | null
  mode?: string | null
}

export type StripeSubscriptionSnapshot = {
  status?: string | null
}

export type BillingLifecycleResolution = {
  billingStatus:
    | 'pending'
    | 'success'
    | 'cancelled'
    | 'requires_action'
    | 'failed'
    | 'expired'
  premiumActive: boolean
  subscriptionStatus: string | null
}

function normalize(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

function fromSubscriptionStatus(
  status: string,
): Pick<BillingLifecycleResolution, 'billingStatus' | 'premiumActive'> {
  if (!status) return { billingStatus: 'pending', premiumActive: false }
  if (status === 'active' || status === 'trialing') {
    return { billingStatus: 'success', premiumActive: true }
  }
  if (
    status === 'incomplete' ||
    status === 'past_due' ||
    status === 'incomplete_expired'
  ) {
    return { billingStatus: 'requires_action', premiumActive: false }
  }
  if (status === 'canceled' || status === 'unpaid') {
    return { billingStatus: 'failed', premiumActive: false }
  }
  return { billingStatus: 'pending', premiumActive: false }
}

export function resolveBillingLifecycle(params: {
  session: StripeCheckoutSessionSnapshot
  subscription?: StripeSubscriptionSnapshot | null
}): BillingLifecycleResolution {
  const status = normalize(params.session.status)
  const paymentStatus = normalize(params.session.payment_status)
  const subscriptionStatus = normalize(params.subscription?.status) || null

  if (subscriptionStatus) {
    const fromSubscription = fromSubscriptionStatus(subscriptionStatus)
    return {
      ...fromSubscription,
      subscriptionStatus,
    }
  }

  if (status === 'expired') {
    return {
      billingStatus: 'expired',
      premiumActive: false,
      subscriptionStatus: null,
    }
  }

  if (status === 'open') {
    return {
      billingStatus: 'pending',
      premiumActive: false,
      subscriptionStatus: null,
    }
  }

  if (status === 'complete') {
    if (paymentStatus === 'paid' || paymentStatus === 'no_payment_required') {
      return {
        billingStatus: 'success',
        premiumActive: true,
        subscriptionStatus: null,
      }
    }
    if (paymentStatus === 'unpaid') {
      return {
        billingStatus: 'requires_action',
        premiumActive: false,
        subscriptionStatus: null,
      }
    }
  }

  if (paymentStatus === 'paid') {
    return {
      billingStatus: 'success',
      premiumActive: true,
      subscriptionStatus: null,
    }
  }

  return {
    billingStatus: 'failed',
    premiumActive: false,
    subscriptionStatus,
  }
}
