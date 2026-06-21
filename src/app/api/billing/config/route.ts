import { NextResponse } from 'next/server'
import {
  BILLING_PLANS,
  isIosIapConfigured,
  isStripeConfigured,
} from '@/lib/billing/catalog'
import type { BillingConfigResponse } from '@/types/billing'

export async function GET() {
  // Master switch: checkout stays OFF until billing is launch-ready, regardless
  // of whether Stripe / IAP are configured. Flip BILLING_CHECKOUT_LIVE=true to
  // enable. This keeps the UI honest (no "Subscribe" CTA offered) and is also
  // enforced server-side in the checkout route, so payments cannot go live by
  // setting the Stripe env alone.
  const checkoutLive = process.env.BILLING_CHECKOUT_LIVE === 'true'
  const payload: BillingConfigResponse = {
    ok: true,
    supportsBillingPortal: checkoutLive && isStripeConfigured(),
    paymentsEnabled: {
      iosIap: checkoutLive && isIosIapConfigured(),
      webStripe: checkoutLive && isStripeConfigured(),
    },
    plans: BILLING_PLANS,
  }

  return NextResponse.json(payload, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  })
}
