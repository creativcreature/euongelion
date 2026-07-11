export type BillingPlatform = 'ios' | 'web'

/**
 * Recurring + multi-year subscription tier ids per master plan
 * Section 0.2 (founder-locked 2026-05-03):
 *   - premium_monthly  $7 / month   (Stripe recurring)
 *   - premium_annual   $77 / year   (Stripe recurring)
 *   - premium_2year    $140 / 2yr   (Stripe one-time, grants 24 mo)
 *   - premium_3year    $200 / 3yr   (Stripe one-time, grants 36 mo)
 *
 * Donations are NOT plan ids — they're separate one-time payments
 * that don't grant entitlement. See `donationAmounts.ts` (todo) for
 * the donation tier ids.
 *
 * `lifetime` was REJECTED in Section 0.2 and is not added here.
 * Legacy `subscription_tier='lifetime'` rows still grant premium
 * access via the entitlements normalizer for backward compatibility.
 */
export type BillingPlanId =
  | 'premium_monthly'
  | 'premium_annual'
  | 'premium_2year'
  | 'premium_3year'

export type StripePriceIdEnv =
  | 'STRIPE_PRICE_PREMIUM_MONTHLY'
  | 'STRIPE_PRICE_PREMIUM_ANNUAL'
  | 'STRIPE_PRICE_PREMIUM_2YEAR'
  | 'STRIPE_PRICE_PREMIUM_3YEAR'

export interface BillingPlan {
  id: BillingPlanId
  name: string
  priceLabel: string
  /** Per-month equivalent for fair comparison across tiers. */
  effectiveMonthlyLabel: string
  description: string
  iosProductId: string | null
  stripePriceIdEnv: StripePriceIdEnv
  /** Recurring (subscription) vs one-time (multi-year prepay). */
  billingType: 'recurring' | 'one_time'
  /** Months of access granted per purchase (12 for annual, 24, 36). */
  termMonths: number
  /** Pre-baked savings phrasing for the comparison row. */
  savingsLabel?: string
  /** True if Founding Member badge is awarded on this tier (annual only). */
  awardsFoundingMember: boolean
}

export interface BillingConfigResponse {
  ok: boolean
  supportsBillingPortal: boolean
  paymentsEnabled: {
    iosIap: boolean
    webStripe: boolean
  }
  plans: BillingPlan[]
}

/**
 * Founding Member status per master plan Section 0.2: first 500 paid
 * annual subscribers receive a permanent badge. Status is set ONCE at
 * the first annual subscription via the Stripe lifecycle webhook and
 * NEVER unset, even on cancellation.
 */
export interface FoundingMemberCount {
  /** Number of slots currently claimed (0..500). */
  claimed: number
  /** Hard cap. */
  total: number
  /** True when the cap is reached. */
  full: boolean
}

export interface BillingEntitlementsResponse {
  ok: boolean
  requestId: string
  authenticated: boolean
  entitlements: {
    /**
     * 'lifetime' is DEPRECATED per master plan Section 0.2 (REJECTED).
     * Legacy rows still recognized; new subscriptions never write it.
     */
    subscriptionTier: 'free' | 'premium' | 'lifetime'
    premiumActive: boolean
    /** True when the user holds Founding Member status. */
    foundingMember: boolean
    /** ISO timestamp at which the user claimed Founding Member. */
    foundingMemberAt: string | null
    ownedThemes: string[]
    ownedStickerPacks: string[]
    features: {
      'premium-subscription': boolean
      'premium-series': boolean
      'archive-tools': boolean
      'theme-customization': boolean
      'sticker-overlays': boolean
    }
    /** Raw Stripe subscription status as of the last verified webhook. */
    subscriptionStatus?: string | null
    /** ISO renewal date of the active subscription (management UI). */
    subscriptionRenewsAt?: string | null
    /** Term expiry for one-time 2yr/3yr plans. */
    premiumExpiresAt?: string | null
    /** SA-026: whether the one-time free custom generation is spent. */
    freeGenerationUsed?: boolean
  }
}
