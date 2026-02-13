import type { BillingPlan, BillingPlanId } from '@/types/billing'

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: 'premium_monthly',
    name: 'Premium Monthly',
    priceLabel: '$4.99 / month',
    description: 'Unlock premium reading tools and archive features.',
    iosProductId: 'app.euangelion.premium.monthly',
    stripePriceIdEnv: 'STRIPE_PRICE_PREMIUM_MONTHLY',
  },
  {
    id: 'premium_annual',
    name: 'Premium Annual',
    priceLabel: '$39.99 / year',
    description: 'Best value for consistent devotional rhythm.',
    iosProductId: 'app.euangelion.premium.annual',
    stripePriceIdEnv: 'STRIPE_PRICE_PREMIUM_ANNUAL',
  },
]

export function getPlanById(planId: string): BillingPlan | null {
  return BILLING_PLANS.find((plan) => plan.id === planId) || null
}

export function getStripePriceIdForPlan(planId: BillingPlanId): string | null {
  const plan = BILLING_PLANS.find((item) => item.id === planId)
  if (!plan) return null
  const value = process.env[plan.stripePriceIdEnv]
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

export function isIosIapConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY
  return typeof key === 'string' && key.trim().length > 0
}

export function isStripeConfigured(): boolean {
  const secret = process.env.STRIPE_SECRET_KEY
  return typeof secret === 'string' && secret.trim().length > 0
}
