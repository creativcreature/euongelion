import Stripe from 'stripe'
import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  getPlanById,
  getStripePriceIdForPlan,
  isStripeConfigured,
} from '@/lib/billing/catalog'
import {
  getClientKey,
  readJsonWithLimit,
  takeRateLimit,
  withRateLimitHeaders,
} from '@/lib/api-security'
import type { BillingPlanId, BillingPlatform } from '@/types/billing'

interface CheckoutBody {
  planId?: string
  platform?: BillingPlatform
}

const MAX_CHECKOUTS_PER_MINUTE = 10
const MAX_BODY_BYTES = 2_048

function appBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (configured && configured.trim().length > 0) {
    return configured.replace(/\/$/, '')
  }
  return request.nextUrl.origin
}

function jsonWithRequestId(
  body: Record<string, unknown>,
  init: {
    status: number
    requestId: string
    rateLimit?:
      | number
      | {
          retryAfterSeconds: number
          limit?: number
          remaining?: number
          resetAtSeconds?: number
        }
  },
) {
  const response = NextResponse.json(body, {
    status: init.status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Request-Id': init.requestId,
    },
  })

  if (typeof init.rateLimit === 'number') {
    return withRateLimitHeaders(response, init.rateLimit)
  }
  if (init.rateLimit) {
    return withRateLimitHeaders(response, init.rateLimit)
  }

  return response
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID()
  const key = getClientKey(request)
  const limit = takeRateLimit({
    namespace: 'billing-checkout',
    key,
    limit: MAX_CHECKOUTS_PER_MINUTE,
    windowMs: 60_000,
  })

  if (!limit.ok) {
    return jsonWithRequestId(
      {
        error: 'Too many checkout requests. Try again shortly.',
        code: 'RATE_LIMITED',
      },
      {
        status: 429,
        requestId,
        rateLimit: limit,
      },
    )
  }

  const parsed = await readJsonWithLimit<CheckoutBody>({
    request,
    maxBytes: MAX_BODY_BYTES,
  })
  if (!parsed.ok) {
    return jsonWithRequestId(
      { error: parsed.error, code: 'INVALID_REQUEST' },
      { status: parsed.status, requestId },
    )
  }

  const planId = (parsed.data.planId || '').trim() as BillingPlanId
  const platform = (parsed.data.platform || 'web').trim() as BillingPlatform

  if (!planId || !getPlanById(planId)) {
    return jsonWithRequestId(
      { error: 'A valid planId is required.', code: 'INVALID_PLAN' },
      { status: 400, requestId },
    )
  }

  if (platform === 'ios') {
    return jsonWithRequestId(
      {
        error:
          'iOS purchases must use in-app purchase. Use native checkout in the iOS app.',
        code: 'IOS_IAP_REQUIRED',
      },
      { status: 409, requestId },
    )
  }

  if (!isStripeConfigured()) {
    return jsonWithRequestId(
      {
        error: 'Web checkout is not configured yet.',
        code: 'STRIPE_NOT_CONFIGURED',
      },
      { status: 503, requestId },
    )
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return jsonWithRequestId(
      { error: 'Stripe secret key missing.', code: 'STRIPE_KEY_MISSING' },
      { status: 503, requestId },
    )
  }

  const priceId = getStripePriceIdForPlan(planId)
  if (!priceId) {
    return jsonWithRequestId(
      {
        error: 'Price is not configured for the selected plan.',
        code: 'PRICE_NOT_CONFIGURED',
      },
      { status: 503, requestId },
    )
  }

  try {
    const stripe = new Stripe(stripeKey)
    const base = appBaseUrl(request)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/settings?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/settings?billing=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      client_reference_id: key.slice(0, 120),
      subscription_data: {
        metadata: {
          source: 'euangelion_web_checkout',
          plan_id: planId,
        },
      },
    })

    return jsonWithRequestId(
      { ok: true, checkoutUrl: session.url, checkoutSessionId: session.id },
      { status: 200, requestId },
    )
  } catch (error) {
    console.error('Billing checkout error:', error)
    return jsonWithRequestId(
      {
        error: 'Unable to create checkout session right now.',
        code: 'CHECKOUT_UNAVAILABLE',
      },
      { status: 500, requestId },
    )
  }
}
