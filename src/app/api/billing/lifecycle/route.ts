import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { sanitizeCheckoutSessionId } from '@/lib/billing/flash'
import { isStripeConfigured, getPlanById } from '@/lib/billing/catalog'
import { resolveBillingLifecycle } from '@/lib/billing/lifecycle'
import { claimFoundingMemberSlot } from '@/lib/billing/founding-member'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getClientKey,
  takeRateLimit,
  withRateLimitHeaders,
} from '@/lib/api-security'

const MAX_REQUESTS_PER_MINUTE = 30

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

export async function GET(request: NextRequest) {
  const requestId = randomUUID()
  const key = getClientKey(request)
  const limit = await takeRateLimit({
    namespace: 'billing-lifecycle',
    key,
    limit: MAX_REQUESTS_PER_MINUTE,
    windowMs: 60_000,
  })

  if (!limit.ok) {
    return jsonWithRequestId(
      {
        error: 'Too many billing lifecycle checks. Try again shortly.',
        code: 'RATE_LIMITED',
      },
      {
        status: 429,
        requestId,
        rateLimit: limit,
      },
    )
  }

  const sessionId = sanitizeCheckoutSessionId(
    request.nextUrl.searchParams.get('session_id'),
  )
  if (!sessionId) {
    return jsonWithRequestId(
      {
        error: 'A valid checkout session id is required.',
        code: 'INVALID_CHECKOUT_SESSION',
      },
      { status: 400, requestId },
    )
  }

  if (!isStripeConfigured()) {
    return jsonWithRequestId(
      {
        error: 'Billing lifecycle checks are not configured.',
        code: 'STRIPE_NOT_CONFIGURED',
      },
      { status: 503, requestId },
    )
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return jsonWithRequestId(
      {
        error: 'Stripe secret key missing.',
        code: 'STRIPE_KEY_MISSING',
      },
      { status: 503, requestId },
    )
  }

  try {
    const stripe = new Stripe(stripeKey)
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id || null
    const subscription = subscriptionId
      ? await stripe.subscriptions.retrieve(subscriptionId)
      : null

    const lifecycle = resolveBillingLifecycle({
      session: {
        status: session.status,
        payment_status: session.payment_status,
        mode: session.mode,
      },
      subscription: subscription
        ? {
            status: subscription.status,
          }
        : null,
    })

    // Founding Member claim: when an annual subscription has just gone
    // active and we can resolve the buyer to an authenticated user
    // (matched by customer_email against auth.users), attempt to
    // claim a slot. Idempotent — re-polling the same session never
    // double-claims. Silent on failure so it never blocks the
    // success-page redirect.
    let foundingMemberClaimed = false
    if (lifecycle.premiumActive && subscription) {
      const planId = subscription.metadata?.plan_id as string | undefined
      const plan = planId ? getPlanById(planId) : null
      const buyerEmail =
        typeof session.customer_details?.email === 'string'
          ? session.customer_details.email
          : typeof session.customer_email === 'string'
            ? session.customer_email
            : null

      if (plan?.awardsFoundingMember && buyerEmail) {
        try {
          const supabase = createAdminClient()
          const { data: userRow } = await supabase
            .from('users')
            .select('id')
            .eq('email', buyerEmail.toLowerCase())
            .maybeSingle()
          const userId = (userRow as { id?: string } | null)?.id ?? null
          if (userId) {
            const result = await claimFoundingMemberSlot(userId)
            foundingMemberClaimed = result.claimed
          }
        } catch (claimError) {
          console.error(
            '[billing-lifecycle] Founding Member claim attempt failed:',
            claimError instanceof Error ? claimError.message : claimError,
          )
        }
      }
    }

    return jsonWithRequestId(
      {
        ok: true,
        checkoutSessionId: session.id,
        billingStatus: lifecycle.billingStatus,
        premiumActive: lifecycle.premiumActive,
        subscriptionStatus: lifecycle.subscriptionStatus,
        foundingMemberClaimed,
      },
      { status: 200, requestId },
    )
  } catch (error) {
    console.error('Billing lifecycle error:', error)
    return jsonWithRequestId(
      {
        error: 'Unable to resolve billing lifecycle right now.',
        code: 'LIFECYCLE_UNAVAILABLE',
      },
      { status: 500, requestId },
    )
  }
}
