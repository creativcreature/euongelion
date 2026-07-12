/**
 * subscription-state.ts — the ONE reader for a user's billing state (SA-028).
 *
 * public.users is the single source of truth for subscription state:
 * Stripe webhooks write it; every entitlement decision reads it through
 * this module. Nothing may read `subscription_tier` from Supabase Auth
 * user_metadata/app_metadata — that was the pre-SA-028 split that left
 * paid subscriptions permanently inactive (webhook wrote the table,
 * reads checked metadata, the two never met).
 *
 * Premium is active when EITHER:
 *   - subscription_tier is 'premium'/'lifetime' (recurring subscription,
 *     webhook-maintained), OR
 *   - premium_expires_at is in the future (one-time 2yr/3yr term plans).
 *
 * All lookups fail CLOSED (free, no grant) — we never award entitlement
 * on a failed read.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { SubscriptionTier } from '@/types/database'
import { normalizeSubscriptionTier } from './entitlements'

export interface UserBillingState {
  userId: string
  /** Raw tier column (webhook-written). */
  subscriptionTier: SubscriptionTier
  /** Tier after considering one-time term expiry — use this for gating. */
  effectiveTier: SubscriptionTier
  premiumActive: boolean
  subscriptionStatus: string | null
  subscriptionRenewsAt: string | null
  premiumExpiresAt: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  foundingMemberAt: string | null
  /** SA-026 one-time free generation: null = unused. */
  freeGenerationUsedAt: string | null
  /** SA-027 spendable credits (packs + gift codes). */
  generationCredits: number
}

interface UsersBillingRow {
  id: string
  subscription_tier: unknown
  subscription_status: string | null
  subscription_renews_at: string | null
  premium_expires_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  founding_member_at: string | null
  free_generation_used_at: string | null
  generation_credits: number | null
}

const BILLING_COLUMNS =
  'id, subscription_tier, subscription_status, subscription_renews_at, premium_expires_at, stripe_customer_id, stripe_subscription_id, founding_member_at, free_generation_used_at, generation_credits'

function toState(row: UsersBillingRow): UserBillingState {
  const subscriptionTier = normalizeSubscriptionTier(row.subscription_tier)
  const termActive =
    typeof row.premium_expires_at === 'string' &&
    Date.parse(row.premium_expires_at) > Date.now()
  const effectiveTier: SubscriptionTier =
    subscriptionTier === 'free' && termActive ? 'premium' : subscriptionTier

  return {
    userId: row.id,
    subscriptionTier,
    effectiveTier,
    premiumActive: effectiveTier === 'premium' || effectiveTier === 'lifetime',
    subscriptionStatus: row.subscription_status ?? null,
    subscriptionRenewsAt: row.subscription_renews_at ?? null,
    premiumExpiresAt: row.premium_expires_at ?? null,
    stripeCustomerId: row.stripe_customer_id ?? null,
    stripeSubscriptionId: row.stripe_subscription_id ?? null,
    foundingMemberAt: row.founding_member_at ?? null,
    freeGenerationUsedAt: row.free_generation_used_at ?? null,
    generationCredits: Number(row.generation_credits ?? 0),
  }
}

/**
 * Read a user's billing state from public.users. Returns null when the
 * user id is missing, the row doesn't exist, or the lookup fails —
 * callers must treat null as free/no-entitlement (fail closed).
 */
export async function readUserBillingState(
  userId: string | null | undefined,
): Promise<UserBillingState | null> {
  if (!userId) return null

  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select(BILLING_COLUMNS)
      .eq('id', userId)
      .maybeSingle()
    if (error || !data) return null
    return toState(data as unknown as UsersBillingRow)
  } catch {
    return null
  }
}

/**
 * Convenience: the effective tier for entitlement math, 'free' when the
 * user is anonymous or the lookup fails.
 */
export async function readEffectiveSubscriptionTier(
  userId: string | null | undefined,
): Promise<SubscriptionTier> {
  const state = await readUserBillingState(userId)
  return state?.effectiveTier ?? 'free'
}

/**
 * Find a user by their Stripe customer id. Used by webhook handlers as
 * the primary customer→user mapping (SA-028: mapping by stored id,
 * email match only as a first-link fallback).
 */
export async function findUserIdByStripeCustomerId(
  stripeCustomerId: string | null | undefined,
): Promise<string | null> {
  if (!stripeCustomerId) return null

  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch {
    return null
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('stripe_customer_id', stripeCustomerId)
      .maybeSingle()
    if (error || !data) return null
    return (data as { id?: string }).id ?? null
  } catch {
    return null
  }
}
