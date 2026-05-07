import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { isStripeConfigured } from '@/lib/billing/catalog'
import {
  createRequestId,
  jsonError,
  logApiError,
  withRequestIdHeaders,
} from '@/lib/api-security'
import {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentFailed,
  handleInvoicePaid,
} from '@/lib/billing/webhook-handlers'

/**
 * POST /api/billing/webhook
 *
 * Stripe webhook endpoint. Verifies the HMAC signature using
 * `STRIPE_WEBHOOK_SECRET`, dispatches recognized events to handlers
 * in `src/lib/billing/webhook-handlers.ts`, returns 200 on every
 * known event (so Stripe doesn't retry).
 *
 * The 7 events we handle:
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.paid
 *   - invoice.payment_failed
 *   - checkout.session.completed (acknowledged; primary handling
 *     is via the existing GET /api/billing/lifecycle poll)
 *   - charge.refunded (acknowledged; future workstream for
 *     refund-handling logic)
 *
 * Unknown events return 200 with `{ ignored: true }` so Stripe
 * stops retrying. Always returns 200 for received-but-unhandled
 * events (Stripe best practice).
 *
 * Setup steps (founder):
 *   1. In Stripe dashboard: Add endpoint → URL
 *      `https://euangelion.app/api/billing/webhook` → Events: the
 *      7 listed above.
 *   2. Copy the webhook signing secret (starts with `whsec_`).
 *   3. Run `wrangler secret put STRIPE_WEBHOOK_SECRET` and paste
 *      the value when prompted (production + preview separately
 *      if needed).
 *   4. Deploy. Use `stripe listen --forward-to localhost:3333/api/billing/webhook`
 *      for local-dev event forwarding.
 *
 * Defense-in-depth: the existing GET poll at
 * `/api/billing/lifecycle` stays as the fast success-page
 * confirmation path. Webhook is the canonical authority.
 */

// Tell Next.js this route consumes the raw body — required for
// Stripe HMAC verification.
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const requestId = createRequestId()

  if (!isStripeConfigured()) {
    return jsonError({
      error: 'Stripe not configured.',
      status: 503,
      requestId,
      code: 'STRIPE_NOT_CONFIGURED',
    })
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripeKey) {
    return jsonError({
      error: 'Stripe secret key missing.',
      status: 503,
      requestId,
      code: 'STRIPE_KEY_MISSING',
    })
  }
  if (!webhookSecret) {
    return jsonError({
      error: 'Webhook secret not configured. Set STRIPE_WEBHOOK_SECRET.',
      status: 503,
      requestId,
      code: 'WEBHOOK_SECRET_MISSING',
    })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return jsonError({
      error: 'Missing stripe-signature header.',
      status: 400,
      requestId,
      code: 'MISSING_SIGNATURE',
    })
  }

  // CRITICAL: read the raw body BEFORE parsing. Stripe HMAC verification
  // operates on the exact bytes Stripe signed.
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch (error) {
    logApiError({
      scope: 'billing-webhook',
      requestId,
      error,
      method: request.method,
      path: '/api/billing/webhook',
      context: { reason: 'body-read-failed' },
    })
    return jsonError({
      error: 'Could not read request body.',
      status: 400,
      requestId,
      code: 'BODY_READ_FAILED',
    })
  }

  const stripe = new Stripe(stripeKey)
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    // Invalid signature — likely an unauthorized POST or a wrong
    // webhook secret. Return 400 (Stripe interprets this correctly).
    logApiError({
      scope: 'billing-webhook',
      requestId,
      error,
      method: request.method,
      path: '/api/billing/webhook',
      context: { reason: 'invalid-signature' },
    })
    return jsonError({
      error: 'Invalid signature.',
      status: 400,
      requestId,
      code: 'INVALID_SIGNATURE',
    })
  }

  // Event verified. Dispatch.
  let dispatchResult: Record<string, unknown> = {
    eventType: event.type,
    eventId: event.id,
  }
  try {
    switch (event.type) {
      case 'customer.subscription.created':
        dispatchResult = {
          ...dispatchResult,
          ...(await handleSubscriptionCreated(
            event.data.object as Stripe.Subscription,
            stripe,
          )),
        }
        break
      case 'customer.subscription.updated':
        dispatchResult = {
          ...dispatchResult,
          ...(await handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription,
            stripe,
          )),
        }
        break
      case 'customer.subscription.deleted':
        dispatchResult = {
          ...dispatchResult,
          ...(await handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription,
            stripe,
          )),
        }
        break
      case 'invoice.paid':
        dispatchResult = {
          ...dispatchResult,
          ...(await handleInvoicePaid(event.data.object as Stripe.Invoice)),
        }
        break
      case 'invoice.payment_failed':
        dispatchResult = {
          ...dispatchResult,
          ...(await handleInvoicePaymentFailed(
            event.data.object as Stripe.Invoice,
          )),
        }
        break
      case 'checkout.session.completed':
        // Primary handling is via the GET /api/billing/lifecycle poll.
        // Acknowledge here so Stripe stops retrying.
        dispatchResult = {
          ...dispatchResult,
          handled: true,
          delegatedTo: '/api/billing/lifecycle',
        }
        break
      case 'charge.refunded':
        // Acknowledge for now. Future workstream: revert any side
        // effects of the refunded subscription.
        dispatchResult = {
          ...dispatchResult,
          handled: true,
          note: 'acknowledged; refund-revert workstream pending',
        }
        break
      default:
        dispatchResult = {
          ...dispatchResult,
          ignored: true,
          note: 'event type not handled',
        }
    }
  } catch (error) {
    logApiError({
      scope: 'billing-webhook',
      requestId,
      error,
      method: request.method,
      path: '/api/billing/webhook',
      context: {
        reason: 'handler-threw',
        eventType: event.type,
        eventId: event.id,
      },
    })
    // Return 500 — Stripe will retry. Better to retry than to drop.
    return jsonError({
      error: `Handler threw for ${event.type}`,
      status: 500,
      requestId,
      code: 'HANDLER_FAILED',
      details: { eventType: event.type, eventId: event.id },
    })
  }

  return withRequestIdHeaders(
    NextResponse.json(
      { ok: true, ...dispatchResult },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    ),
    requestId,
  )
}
