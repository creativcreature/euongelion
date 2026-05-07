/**
 * webhook-handlers.ts — Stripe webhook event handlers.
 *
 * Each function takes the relevant `Stripe.*` object and applies the
 * appropriate state changes to our database. Handlers are
 * idempotent: re-running the same event is safe (Stripe sometimes
 * retries on transient failures).
 *
 * Auth-mapping: each handler resolves the Stripe customer to a
 * `public.users` row by email match. This is brittle (email change
 * in Supabase + email change in Stripe could de-sync) but it's the
 * simplest mapping that works without modifying checkout to pass
 * `metadata.user_id`. A separate workstream can add metadata-based
 * mapping later.
 *
 * Founding Member: when an annual subscription transitions to
 * active, we attempt to claim a Founding Member slot. The claim is
 * idempotent with the existing GET-poll claim path
 * (claimFoundingMemberSlot returns 'already_held' on second call).
 *
 * Subscription tier mapping:
 *   - subscription.status='active'|'trialing' → tier='premium'
 *   - subscription.status='canceled'|'unpaid'|'incomplete_expired' → tier='free'
 *   - founding_member_at is NEVER cleared by handlers (per founder
 *     direction: badge persists even on cancellation)
 */

import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { claimFoundingMemberSlot } from './founding-member'
import { getPlanById } from './catalog'

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

/**
 * Resolve a Stripe customer to a `public.users` row by email. Returns
 * `{ userId, email }` or `null` when no match.
 */
async function findUserByCustomerEmail(
  email: string | null,
): Promise<{ userId: string; email: string } | null> {
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
      .select('id, email')
      .eq('email', normalized)
      .maybeSingle()
    if (!data) return null
    const row = data as { id?: string; email?: string }
    if (!row.id) return null
    return { userId: row.id, email: row.email ?? normalized }
  } catch {
    return null
  }
}

/**
 * Set `users.subscription_tier`. Returns true on success.
 */
async function setSubscriptionTier(
  userId: string,
  tier: 'free' | 'premium',
): Promise<boolean> {
  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch {
    return false
  }
  try {
    const { error } = await supabase
      .from('users')
      .update({ subscription_tier: tier })
      .eq('id', userId)
    return !error
  } catch {
    return false
  }
}

/** Extract email from a Stripe Customer or string id. */
function customerEmail(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (!customer || typeof customer === 'string') return null
  if ('deleted' in customer && customer.deleted) return null
  const c = customer as Stripe.Customer
  return c.email ?? null
}

/**
 * Resolve the buyer email for a subscription. Tries customer email
 * first; falls back to subscription.metadata.user_email when present
 * (set by future checkout improvements).
 */
async function resolveSubscriptionBuyerEmail(
  subscription: Stripe.Subscription,
  stripe: Stripe,
): Promise<string | null> {
  const directEmail = customerEmail(subscription.customer)
  if (directEmail) return directEmail
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id
  if (!customerId) return null
  try {
    const c = await stripe.customers.retrieve(customerId)
    if (c && !('deleted' in c && c.deleted)) {
      return (c as Stripe.Customer).email ?? null
    }
  } catch {
    // ignore
  }
  return null
}

/**
 * customer.subscription.created — first-time activation.
 */
export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  stripe: Stripe,
): Promise<HandlerResult> {
  const status = subscription.status
  if (status !== 'active' && status !== 'trialing') {
    return { handled: false, skipReason: `non-active status: ${status}` }
  }

  const email = await resolveSubscriptionBuyerEmail(subscription, stripe)
  const user = await findUserByCustomerEmail(email)
  if (!user) {
    return { handled: false, skipReason: 'no matching user' }
  }

  const updated = await setSubscriptionTier(user.userId, 'premium')
  const result: HandlerResult = {
    handled: true,
    userId: user.userId,
    changes: { subscription_tier: 'premium' },
  }
  if (!updated) {
    result.error = 'failed to update users.subscription_tier'
  }

  // Founding Member claim — only for premium_annual.
  const planId = subscription.metadata?.plan_id as string | undefined
  const plan = planId ? getPlanById(planId) : null
  if (plan?.awardsFoundingMember) {
    try {
      const claim = await claimFoundingMemberSlot(user.userId)
      result.foundingMemberClaimed = claim.claimed
    } catch {
      // non-fatal
    }
  }

  return result
}

/**
 * customer.subscription.updated — plan change, status change, etc.
 * Re-derives tier from the current status. For monthly→annual upgrades
 * on premium_annual, attempts a Founding Member claim.
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  stripe: Stripe,
): Promise<HandlerResult> {
  const email = await resolveSubscriptionBuyerEmail(subscription, stripe)
  const user = await findUserByCustomerEmail(email)
  if (!user) {
    return { handled: false, skipReason: 'no matching user' }
  }

  const status = subscription.status
  const tier: 'free' | 'premium' =
    status === 'active' || status === 'trialing' ? 'premium' : 'free'

  const updated = await setSubscriptionTier(user.userId, tier)
  const result: HandlerResult = {
    handled: true,
    userId: user.userId,
    changes: { subscription_tier: tier, status },
  }
  if (!updated) {
    result.error = 'failed to update users.subscription_tier'
  }

  // Re-attempt Founding Member claim if newly annual + active.
  if (tier === 'premium') {
    const planId = subscription.metadata?.plan_id as string | undefined
    const plan = planId ? getPlanById(planId) : null
    if (plan?.awardsFoundingMember) {
      try {
        const claim = await claimFoundingMemberSlot(user.userId)
        result.foundingMemberClaimed = claim.claimed
      } catch {
        // non-fatal
      }
    }
  }

  return result
}

/**
 * customer.subscription.deleted — subscription ended (cancelled,
 * card declined for too long, etc.). Set tier back to 'free'. Do
 * NOT clear founding_member_at (badge persists per founder direction).
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  stripe: Stripe,
): Promise<HandlerResult> {
  const email = await resolveSubscriptionBuyerEmail(subscription, stripe)
  const user = await findUserByCustomerEmail(email)
  if (!user) {
    return { handled: false, skipReason: 'no matching user' }
  }

  const updated = await setSubscriptionTier(user.userId, 'free')
  return {
    handled: true,
    userId: user.userId,
    changes: { subscription_tier: 'free' },
    error: updated ? undefined : 'failed to update users.subscription_tier',
  }
}

/**
 * invoice.payment_failed — start of dunning. Don't change tier yet
 * (Stripe will retry up to 4 times in 21 days; only then does
 * subscription.deleted fire). Just log.
 *
 * Future: send a notification to the user via the in-app banner or
 * email. For now, log + acknowledge.
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<HandlerResult> {
  const customerEmailValue =
    typeof invoice.customer === 'string'
      ? null
      : customerEmail(invoice.customer ?? null)
  const user = await findUserByCustomerEmail(customerEmailValue)
  if (!user) {
    return {
      handled: false,
      skipReason: 'no matching user (or customer is string id only)',
    }
  }

  console.warn(
    `[stripe-webhook] invoice.payment_failed for user ${user.userId} (Stripe will retry; not changing tier yet)`,
  )

  return {
    handled: true,
    userId: user.userId,
    changes: { dunning_started: true },
  }
}

/**
 * invoice.paid — renewal succeeded. Re-affirm premium tier (in case
 * a previous status update missed). Idempotent.
 */
export async function handleInvoicePaid(
  invoice: Stripe.Invoice,
): Promise<HandlerResult> {
  const customerEmailValue =
    typeof invoice.customer === 'string'
      ? null
      : customerEmail(invoice.customer ?? null)
  const user = await findUserByCustomerEmail(customerEmailValue)
  if (!user) {
    return { handled: false, skipReason: 'no matching user' }
  }

  // Only mark premium when there's a subscription line item
  const hasSub = (invoice.lines?.data ?? []).some((line) => {
    return Boolean((line as { subscription?: string | null }).subscription)
  })
  if (!hasSub) {
    return {
      handled: false,
      skipReason: 'invoice has no subscription lines',
    }
  }

  const updated = await setSubscriptionTier(user.userId, 'premium')
  return {
    handled: true,
    userId: user.userId,
    changes: { subscription_tier: 'premium' },
    error: updated ? undefined : 'failed to update users.subscription_tier',
  }
}
