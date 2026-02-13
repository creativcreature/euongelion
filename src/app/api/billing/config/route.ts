import { NextResponse } from 'next/server'
import {
  BILLING_PLANS,
  isIosIapConfigured,
  isStripeConfigured,
} from '@/lib/billing/catalog'
import type { BillingConfigResponse } from '@/types/billing'

export async function GET() {
  const payload: BillingConfigResponse = {
    ok: true,
    supportsBillingPortal: isStripeConfigured(),
    paymentsEnabled: {
      iosIap: isIosIapConfigured(),
      webStripe: isStripeConfigured(),
    },
    plans: BILLING_PLANS,
  }

  return NextResponse.json(payload, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  })
}
