/**
 * catalog.ts — billing-tier source of truth.
 *
 * Every tier in `BILLING_PLANS` matches master plan Section 0.2
 * (founder-locked 2026-05-03). Prices in code MUST match Stripe
 * dashboard Prices; sync via `STRIPE_PRICE_*` env vars. See
 * `docs/copy-specs/stripe-alignment-audit-2026-05-05.md` for the
 * pre-launch checklist when these values change.
 *
 * Founding Member is NOT a separate tier — it's a status awarded to
 * the first 500 users who claim `premium_annual`, locked permanently.
 * `awardsFoundingMember: true` on a plan means subscribing to that
 * plan attempts to claim a Founding Member slot.
 *
 * iOS product IDs are kept as forward-compat scaffolding for the
 * v1.5+ Capacitor shell (master plan Section 0.13 Gap closure 5).
 * The fields are inert in v1 — RevenueCat key is not set.
 *
 * Donation tier is intentionally NOT in this file. Donations are
 * one-time payments that do NOT grant entitlement, so they live in
 * `donations.ts` (forthcoming) not `BILLING_PLANS`.
 */

import type { BillingPlan, BillingPlanId } from '@/types/billing'

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: 'premium_monthly',
    name: 'Monthly',
    priceLabel: '$7 / month',
    effectiveMonthlyLabel: '$7 / mo',
    description:
      'Unlimited AI-composed devotional plans, written for your specific reflection.',
    iosProductId: 'app.euangelion.premium.monthly',
    stripePriceIdEnv: 'STRIPE_PRICE_PREMIUM_MONTHLY',
    billingType: 'recurring',
    termMonths: 1,
    awardsFoundingMember: false,
  },
  {
    id: 'premium_annual',
    name: 'Annual',
    priceLabel: '$77 / year',
    effectiveMonthlyLabel: '$6.42 / mo',
    description:
      'Best value for consistent devotional rhythm. Founding Member badge for the first 500 annual subscribers.',
    iosProductId: 'app.euangelion.premium.annual',
    stripePriceIdEnv: 'STRIPE_PRICE_PREMIUM_ANNUAL',
    billingType: 'recurring',
    termMonths: 12,
    savingsLabel: 'Save $7 vs monthly',
    awardsFoundingMember: true,
  },
  {
    id: 'premium_2year',
    name: '2 Years',
    priceLabel: '$140 / 2 years',
    effectiveMonthlyLabel: '$5.83 / mo',
    description:
      'Two years of unlimited AI plans. One-time payment, grants 24 months of access.',
    iosProductId: null,
    stripePriceIdEnv: 'STRIPE_PRICE_PREMIUM_2YEAR',
    billingType: 'one_time',
    termMonths: 24,
    savingsLabel: 'Save $28 vs monthly',
    awardsFoundingMember: false,
  },
  {
    id: 'premium_3year',
    name: '3 Years',
    priceLabel: '$200 / 3 years',
    effectiveMonthlyLabel: '$5.55 / mo',
    description:
      'Three years of unlimited AI plans. One-time payment, grants 36 months of access.',
    iosProductId: null,
    stripePriceIdEnv: 'STRIPE_PRICE_PREMIUM_3YEAR',
    billingType: 'one_time',
    termMonths: 36,
    savingsLabel: 'Save $52 vs monthly',
    awardsFoundingMember: false,
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
