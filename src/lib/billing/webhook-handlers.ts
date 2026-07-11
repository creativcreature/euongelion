/**
 * webhook-handlers.ts — Stripe webhook event handlers (SA-028).
 *
 * Each function takes the relevant `Stripe.*` object and applies the
 * appropriate state changes to our database. Handlers are idempotent:
 * re-running the same event is safe (Stripe retries on transient
 * failures, and the route-level idempotency store records events only
 * after successful dispatch — at-least-once delivery).
 *
 * Customer→user mapping (SA-028, founder-ratified 2026-07-10), in
 * precedence order:
 *   1. `public.users.stripe_customer_id` — the stored link, written at
 *      checkout-session creation and re-affirmed here.
 *   2. `metadata.user_id` on the subscription / checkout session — set
 *      by our checkout route for every session it creates.
 *   3. Email match — FIRST-LINK FALLBACK ONLY (legacy sessions created
 *      before SA-028). When it hits, the handler persists the customer
 *      id so subsequent events map by id.
 *
 * State written to public.users (the single source of truth —
 * `src/lib/billing/subscription-state.ts` is the only reader):
 *   subscription_tier, subscription_status, subscription_renews_at,
 *   stripe_customer_id, stripe_subscription_id, premium_expires_at
 *   (one-time term plans).
 *
 * Tier mapping:
 *   - subscription.status='active'|'trialing' → tier='premium'
 *   - any other terminal status → tier='free'
 *   - one-time term plans (premium_2year/3year): premium_expires_at =
 *     paid-at + termMonths; tier stays webhook-managed but effective
 *     premium is derived from the expiry in subscription-state.ts.
 *   - founding_member_at is NEVER cleared by handlers (badge persists
 *     even on cancellation, per founder direction).
 */

import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { claimFoundingMemberSlot } from './founding-member'
import { getPlanById } from './catalog'
import { findUserIdByStripeCustomerId } from './subscription-state'

export interface HandlerResult {
  handled: boolean
  userId?: string
  changes?: Record<string, unknown>
  /** Founding Member claim result if applicable. */
  foundingMemberClaimed?: boolean
  /** Skipped reason when handled=false (no user, etc.). */
  skipReason?: string
  error?: string
}

/** Extract the Stripe customer id from a customer field of any shape. */
function customerIdOf(
  customer:
    | string
    | Stripe.Customer
    | Stripe.DeletedCustomer
    | null
    | undefined,
): string | null {
  if (!customer) return null
  if (typeof customer === 'string') return customer
  return customer.id ?? null
}

/** Extract email from an expanded Stripe Customer object (null for ids). */
function customerEmail(
  customer:
    | string
    | Stripe.Customer
    | Stripe.DeletedCustomer
    | null
    | undefined,
): string | null {
  if (!customer || typeof customer === 'string') return null
  if ('deleted' in customer && customer.deleted) return null
  return (customer as Stripe.Customer).email ?? null
}

/** Legacy fallback: resolve a user id by email match against public.users. */
async function findUserIdByEmail(email: string | null): Promise<string | null> {
  if (!email) return null
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null

  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch {
    return null
  }

  try {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalized)
      .maybeSingle()
    return (data as { id?: string } | null)?.id ?? null
  } catch {
    return null
  }
}

/**
 * Resolve the user for a Stripe event using the SA-028 precedence:
 * stored customer id → metadata.user_id → email (retrieving the
 * customer from Stripe when only an id is on the event).
 */
async function resolveUser(params: {
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
  metadataUserId?: string | null
  stripe: Stripe
}): Promise<{ userId: string; stripeCustomerId: string | null } | null> {
  const stripeCustomerId = customerIdOf(params.customer)

  // 1. Stored link.
  const byStoredId = await findUserIdByStripeCustomerId(stripeCustomerId)
  if (byStoredId) return { userId: byStoredId, stripeCustomerId }

  // 2. metadata.user_id set by our checkout route.
  const metaUserId = params.metadataUserId?.trim()
  if (metaUserId) return { userId: metaUserId, stripeCustomerId }

  // 3. Email fallback (legacy sessions only).
  let email = customerEmail(params.customer)
  if (!email && stripeCustomerId) {
    try {
      const c = await params.stripe.customers.retrieve(stripeCustomerId)
      if (c && !('deleted' in c && c.deleted)) {
        email = (c as Stripe.Customer).email ?? null
      }
    } catch {
      // ignore — resolution simply fails below
    }
  }
  const byEmail = await findUserIdByEmail(email)
  if (byEmail) return { userId: byEmail, stripeCustomerId }

  return null
}

/**
 * The single writer for subscription state on public.users. Undefined
 * fields are left untouched; null clears. Returns true on success.
 */
async function applySubscriptionState(
  userId: string,
  state: {
    subscription_tier?: 'free' | 'premium'
    subscription_status?: string | null
    subscription_renews_at?: string | null
    stripe_customer_id?: string | null
    stripe_subscription_id?: string | null
    premium_expires_at?: string | null
  },
): Promise<boolean> {
  const update: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(state)) {
    if (value !== undefined) update[key] = value
  }
  if (Object.keys(update).length === 0) return true

  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch {
    return false
  }
  try {
    const { error } = await supabase
      .from('users')
      .update(update)
      .eq('id', userId)
    return !error
  } catch {
    return false
  }
}

/**
 * current_period_end moved from Subscription to SubscriptionItem in
 * newer Stripe API versions. Read whichever is present.
 */
function subscriptionRenewsAt(
  subscription: Stripe.Subscription,
): string | null {
  const item = subscription.items?.data?.[0] as
    | { current_period_end?: number }
    | undefined
  const legacy = (subscription as unknown as { current_period_end?: number })
    .current_period_end
  const unix = item?.current_period_end ?? legacy
  return typeof unix === 'number' && Number.isFinite(unix)
    ? new Date(unix * 1000).toISOString()
    : null
}

async function maybeClaimFoundingMember(
  userId: string,
  planId: string | undefined,
  result: HandlerResult,
): Promise<void> {
  const plan = planId ? getPlanById(planId) : null
  if (!plan?.awardsFoundingMember) return
  try {
    const claim = await claimFoundingMemberSlot(userId)
    result.foundingMemberClaimed = claim.claimed
  } catch {
    // non-fatal
  }
}

/**
 * Shared logic for customer.subscription.created / .updated —
 * re-derives tier from the current status and persists the full state.
 */
async function applySubscriptionEvent(
  subscription: Stripe.Subscription,
  stripe: Stripe,
): Promise<HandlerResult> {
  const user = await resolveUser({
    customer: subscription.customer,
    metadataUserId: subscription.metadata?.user_id ?? null,
    stripe,
  })
  if (!user) {
    return { handled: false, skipReason: 'no matching user' }
  }

  const status = subscription.status
  const tier: 'free' | 'premium' =
    status === 'active' || status === 'trialing' ? 'premium' : 'free'

  const changes = {
    subscription_tier: tier,
    subscription_status: status,
    subscription_renews_at: subscriptionRenewsAt(subscription),
    stripe_customer_id: user.stripeCustomerId,
    stripe_subscription_id: subscription.id,
  }
  const updated = await applySubscriptionState(user.userId, changes)

  const result: HandlerResult = {
    handled: true,
    userId: user.userId,
    changes,
  }
  if (!updated) {
    result.error = 'failed to update users subscription state'
  }

  if (tier === 'premium') {
    await maybeClaimFoundingMember(
      user.userId,
      subscription.metadata?.plan_id as string | undefined,
      result,
    )
  }

  return result
}

/** customer.subscription.created — first-time activation. */
export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  stripe: Stripe,
): Promise<HandlerResult> {
  return applySubscriptionEvent(subscription, stripe)
}

/** customer.subscription.updated — plan change, status change, etc. */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  stripe: Stripe,
): Promise<HandlerResult> {
  return applySubscriptionEvent(subscription, stripe)
}

/**
 * customer.subscription.deleted — subscription ended (cancelled, card
 * declined for too long, etc.). Tier back to 'free'; keep the Stripe
 * ids for history; founding_member_at is untouched.
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  stripe: Stripe,
): Promise<HandlerResult> {
  const user = await resolveUser({
    customer: subscription.customer,
    metadataUserId: subscription.metadata?.user_id ?? null,
    stripe,
  })
  if (!user) {
    return { handled: false, skipReason: 'no matching user' }
  }

  const changes = {
    subscription_tier: 'free' as const,
    subscription_status: subscription.status ?? 'canceled',
    subscription_renews_at: null,
  }
  const updated = await applySubscriptionState(user.userId, changes)
  return {
    handled: true,
    userId: user.userId,
    changes,
    error: updated ? undefined : 'failed to update users subscription state',
  }
}

/**
 * invoice.payment_failed — start of dunning. Don't change tier yet
 * (Stripe retries up to 4 times over 21 days; only then does
 * subscription.deleted fire). Record the status for the management UI.
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  stripe: Stripe,
): Promise<HandlerResult> {
  const user = await resolveUser({
    customer: invoice.customer,
    metadataUserId: null,
    stripe,
  })
  if (!user) {
    return { handled: false, skipReason: 'no matching user' }
  }

  console.warn(
    `[stripe-webhook] invoice.payment_failed for user ${user.userId} (Stripe will retry; not changing tier yet)`,
  )
  const updated = await applySubscriptionState(user.userId, {
    subscription_status: 'past_due',
  })

  return {
    handled: true,
    userId: user.userId,
    changes: { subscription_status: 'past_due' },
    error: updated ? undefined : 'failed to update users subscription state',
  }
}

/**
 * invoice.paid — renewal succeeded. Re-affirm premium tier (in case a
 * previous status update was missed). Idempotent.
 */
export async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  stripe: Stripe,
): Promise<HandlerResult> {
  const user = await resolveUser({
    customer: invoice.customer,
    metadataUserId: null,
    stripe,
  })
  if (!user) {
    return { handled: false, skipReason: 'no matching user' }
  }

  // Only mark premium when there's a subscription line item.
  const hasSub = (invoice.lines?.data ?? []).some((line) => {
    return Boolean((line as { subscription?: string | null }).subscription)
  })
  if (!hasSub) {
    return {
      handled: false,
      skipReason: 'invoice has no subscription lines',
    }
  }

  const changes = {
    subscription_tier: 'premium' as const,
    subscription_status: 'active',
    stripe_customer_id: customerIdOf(invoice.customer),
  }
  const updated = await applySubscriptionState(user.userId, changes)
  return {
    handled: true,
    userId: user.userId,
    changes,
    error: updated ? undefined : 'failed to update users subscription state',
  }
}

/**
 * checkout.session.completed — the canonical grant moment for ONE-TIME
 * term plans (premium_2year / premium_3year, mode='payment'), and the
 * moment the customer↔user link is first persisted for every session.
 * Recurring subscriptions are granted by the subscription events above;
 * for those this handler only stores the customer id.
 */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
): Promise<HandlerResult> {
  if (session.payment_status !== 'paid' && session.status !== 'complete') {
    return {
      handled: false,
      skipReason: `session not paid/complete: ${session.status}/${session.payment_status}`,
    }
  }

  const user = await resolveUser({
    customer: session.customer,
    metadataUserId:
      session.metadata?.user_id ?? session.client_reference_id ?? null,
    stripe,
  })
  if (!user) {
    return { handled: false, skipReason: 'no matching user' }
  }

  const planId = session.metadata?.plan_id as string | undefined
  const plan = planId ? getPlanById(planId) : null

  // Always persist the customer link.
  const changes: Record<string, unknown> = {
    stripe_customer_id: user.stripeCustomerId,
  }

  // One-time term plans: grant premium until paid-at + termMonths.
  if (session.mode === 'payment' && plan?.billingType === 'one_time') {
    const paidAtMs = (session.created ?? Math.floor(Date.now() / 1000)) * 1000
    const expires = new Date(paidAtMs)
    expires.setMonth(expires.getMonth() + plan.termMonths)
    changes.premium_expires_at = expires.toISOString()
    changes.subscription_status = 'term_active'
  }

  const updated = await applySubscriptionState(
    user.userId,
    changes as Parameters<typeof applySubscriptionState>[1],
  )

  const result: HandlerResult = {
    handled: true,
    userId: user.userId,
    changes,
  }
  if (!updated) {
    result.error = 'failed to update users subscription state'
  }
  return result
}
