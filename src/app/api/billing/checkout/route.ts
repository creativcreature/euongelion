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
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { readUserBillingState } from '@/lib/billing/subscription-state'
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

  // Master switch: checkout is OFF until billing is launch-ready
  // (BILLING_CHECKOUT_LIVE=true). This blocks ALL checkout initiation regardless
  // of Stripe / IAP configuration, so enabling the Stripe env alone cannot turn
  // on payments prematurely. The config route mirrors this so the UI never
  // offers a "Subscribe" CTA while it is off.
  if (process.env.BILLING_CHECKOUT_LIVE !== 'true') {
    return jsonWithRequestId(
      { ok: false, error: 'Checkout is not available yet.' },
      { status: 503, requestId },
    )
  }

  const key = getClientKey(request)
  const limit = await takeRateLimit({
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

  // SA-026/SA-028: checkout is an authenticated action. Subscriptions
  // entitle custom generation, which requires a verified account — and
  // requiring auth here lets us pass a durable user identity to Stripe
  // (metadata.user_id + a stored Customer) so webhooks map by id, never
  // by brittle email match.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return jsonWithRequestId(
      {
        error: 'Sign in to subscribe.',
        code: 'AUTH_REQUIRED',
      },
      { status: 401, requestId },
    )
  }

  try {
    const stripe = new Stripe(stripeKey)
    const base = appBaseUrl(request)
    const plan = getPlanById(planId)!

    // Reuse the stored Stripe customer or create one now, so the
    // customer↔user link exists BEFORE the first webhook arrives.
    const billingState = await readUserBillingState(user.id)
    let stripeCustomerId = billingState?.stripeCustomerId ?? null
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      })
      stripeCustomerId = customer.id
      try {
        const admin = createAdminClient()
        await admin
          .from('users')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', user.id)
      } catch {
        // Non-fatal: the webhook's metadata.user_id path still maps the
        // event, and handleCheckoutSessionCompleted persists the link.
      }
    }

    const isOneTime = plan.billingType === 'one_time'
    const session = await stripe.checkout.sessions.create({
      mode: isOneTime ? 'payment' : 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/settings?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/settings?billing=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      client_reference_id: user.id,
      metadata: {
        source: 'euangelion_web_checkout',
        plan_id: planId,
        user_id: user.id,
      },
      ...(isOneTime
        ? {}
        : {
            subscription_data: {
              metadata: {
                source: 'euangelion_web_checkout',
                plan_id: planId,
                user_id: user.id,
              },
            },
          }),
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
