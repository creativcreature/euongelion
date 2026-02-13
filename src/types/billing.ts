export type BillingPlatform = 'ios' | 'web'

export type BillingPlanId = 'premium_monthly' | 'premium_annual'

export interface BillingPlan {
  id: BillingPlanId
  name: string
  priceLabel: string
  description: string
  iosProductId: string
  stripePriceIdEnv:
    | 'STRIPE_PRICE_PREMIUM_MONTHLY'
    | 'STRIPE_PRICE_PREMIUM_ANNUAL'
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
