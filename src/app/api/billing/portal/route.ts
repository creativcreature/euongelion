/**
 * POST /api/billing/portal — open Stripe's billing portal.
 *
 * Customer resolution, in precedence order:
 *   1. `public.users.stripe_customer_id` for the signed-in reader (the
 *      webhook-written link, read through the single reader in
 *      `subscription-state.ts`). This is the path that works on ANY
 *      device — a subscriber who signs in on a new phone still manages
 *      their own subscription.
 *   2. The checkout session id the browser kept from a checkout
 *      completed on THIS device — the only path available to a reader
 *      who is not signed in.
 * When neither exists we say so honestly (400) and the UI points at the
 * Stripe receipt email.
 */

import Stripe from 'stripe'
import { isAuthSessionMissingError } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { isStripeConfigured } from '@/lib/billing/catalog'
import {
  sanitizeBillingReturnPath,
  sanitizeCheckoutSessionId,
} from '@/lib/billing/flash'
import { readUserBillingState } from '@/lib/billing/subscription-state'
import { createClient } from '@/lib/supabase/server'
import {
  getClientKey,
  readJsonWithLimit,
  takeRateLimit,
  withRateLimitHeaders,
} from '@/lib/api-security'

interface BillingPortalBody {
  checkoutSessionId?: string
  returnPath?: string
}

const MAX_REQUESTS_PER_MINUTE = 10
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

/**
 * The signed-in reader's webhook-written Stripe customer id, or null
 * when they are anonymous or no link has been stored yet. A broken auth
 * read throws so the caller surfaces it instead of silently downgrading
 * the reader to "anonymous". (`readUserBillingState` itself fails closed
 * per SA-028 — a failed billing read reads as "no stored link", which
 * lands on the honest 400 rather than a wrong portal session.)
 */
async function resolveStoredCustomerId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  // A missing session is the legitimate anonymous reader; anything else
  // is a real auth failure and must not read as "anonymous".
  if (error && !isAuthSessionMissingError(error)) {
    throw new Error(`auth read failed: ${error.message}`)
  }
  if (!user) return null
  const state = await readUserBillingState(user.id)
  return state?.stripeCustomerId ?? null
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID()
  const key = getClientKey(request)
  const limit = await takeRateLimit({
    namespace: 'billing-portal',
    key,
    limit: MAX_REQUESTS_PER_MINUTE,
    windowMs: 60_000,
  })

  if (!limit.ok) {
    return jsonWithRequestId(
      {
        error: 'Too many billing portal requests. Try again shortly.',
        code: 'RATE_LIMITED',
      },
      {
        status: 429,
        requestId,
        rateLimit: limit,
      },
    )
  }

  const parsed = await readJsonWithLimit<BillingPortalBody>({
    request,
    maxBytes: MAX_BODY_BYTES,
  })
  if (!parsed.ok) {
    return jsonWithRequestId(
      { error: parsed.error, code: 'INVALID_REQUEST' },
      {
        status: parsed.status,
        requestId,
      },
    )
  }

  const checkoutSessionId = sanitizeCheckoutSessionId(
    parsed.data.checkoutSessionId,
  )

  // Stored link first — it is the only path that survives a new device.
  let storedCustomerId: string | null
  try {
    storedCustomerId = await resolveStoredCustomerId()
  } catch (error) {
    console.error('Billing portal customer lookup error:', error)
    return jsonWithRequestId(
      {
        error: 'Unable to open billing management right now.',
        code: 'PORTAL_UNAVAILABLE',
      },
      { status: 500, requestId },
    )
  }

  if (!storedCustomerId && !checkoutSessionId) {
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
        error: 'Billing portal is not configured right now.',
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

  try {
    const stripe = new Stripe(stripeKey)

    let customerId = storedCustomerId
    if (!customerId && checkoutSessionId) {
      const checkoutSession =
        await stripe.checkout.sessions.retrieve(checkoutSessionId)

      customerId =
        typeof checkoutSession.customer === 'string'
          ? checkoutSession.customer
          : (checkoutSession.customer?.id ?? null)
    }

    if (!customerId) {
      return jsonWithRequestId(
        {
          error:
            'No customer record found for this checkout session. Start checkout again to open billing management.',
          code: 'CHECKOUT_CUSTOMER_MISSING',
        },
        { status: 409, requestId },
      )
    }

    const returnPath = sanitizeBillingReturnPath(parsed.data.returnPath)
    const returnUrl = `${appBaseUrl(request)}${returnPath}`
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return jsonWithRequestId(
      {
        ok: true,
        portalUrl: portalSession.url,
      },
      { status: 200, requestId },
    )
  } catch (error) {
    console.error('Billing portal error:', error)
    return jsonWithRequestId(
      {
        error: 'Unable to open billing management right now.',
        code: 'PORTAL_UNAVAILABLE',
      },
      { status: 500, requestId },
    )
  }
}
