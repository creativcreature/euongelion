/**
 * reconciliation.ts — nightly Stripe↔DB entitlement reconciliation
 * (brief §12.1, SA-028, F-075).
 *
 * Webhooks are the canonical entitlement writer, but webhooks can be
 * missed (endpoint down past Stripe's retry window, secret rotation,
 * manual dashboard changes). This job walks every user who claims —
 * or whose Stripe record claims — a subscription relationship and
 * re-derives the truth from Stripe:
 *
 *   - DB says premium via a stored subscription id → retrieve the
 *     subscription; if Stripe disagrees (canceled/expired/missing),
 *     CORRECT the row and record it.
 *   - DB says premium with NO Stripe evidence (no subscription id, no
 *     unexpired term, not lifetime) → ALERT ONLY. Never auto-downgrade
 *     without positive Stripe evidence — it could be a founder comp.
 *   - One-time term users (premium_expires_at) and legacy 'lifetime'
 *     rows have no Stripe subscription to check; terms self-expire via
 *     the effective-tier read, lifetime is flagged for founder review.
 *   - Stripe/network errors: recorded, row untouched (fail safe).
 *
 * Alerts are structured `[billing-reconcile] ALERT` log lines (§12.6
 * log-based alerting until an alerting channel exists) plus the
 * returned report. Trigger: POST /api/admin/billing-reconcile
 * (internal-secret gated), scheduled via GitHub Action / cron.
 */

import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export interface ReconciliationCorrection {
  userId: string
  field: string
  from: unknown
  to: unknown
  reason: string
}

export interface ReconciliationAlert {
  userId: string
  message: string
}

export interface ReconciliationReport {
  ranAt: string
  checked: number
  corrected: ReconciliationCorrection[]
  alerts: ReconciliationAlert[]
  errors: { userId: string; error: string }[]
}

interface BillingUserRow {
  id: string
  subscription_tier: 'free' | 'premium' | 'lifetime'
  subscription_status: string | null
  subscription_renews_at: string | null
  premium_expires_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

function renewsAtOf(subscription: Stripe.Subscription): string | null {
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

async function fetchBillingUsers(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<BillingUserRow[]> {
  const rows: BillingUserRow[] = []
  const PAGE = 500
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('users')
      .select(
        'id, subscription_tier, subscription_status, subscription_renews_at, premium_expires_at, stripe_customer_id, stripe_subscription_id',
      )
      .or('subscription_tier.neq.free,stripe_subscription_id.not.is.null')
      .range(offset, offset + PAGE - 1)
    if (error) {
      throw new Error(`users query failed: ${error.message}`)
    }
    const page = (data ?? []) as unknown as BillingUserRow[]
    rows.push(...page)
    if (page.length < PAGE) break
  }
  return rows
}

export async function reconcileBillingState(deps?: {
  stripe?: Stripe
  now?: Date
}): Promise<ReconciliationReport> {
  const now = deps?.now ?? new Date()
  const report: ReconciliationReport = {
    ranAt: now.toISOString(),
    checked: 0,
    corrected: [],
    alerts: [],
    errors: [],
  }

  let stripe = deps?.stripe
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set — cannot reconcile.')
    }
    const { default: StripeCtor } = await import('stripe')
    stripe = new StripeCtor(key)
  }

  const supabase = createAdminClient()
  const users = await fetchBillingUsers(supabase)

  for (const user of users) {
    report.checked += 1

    // Legacy lifetime rows: no Stripe object exists; founder review only.
    if (user.subscription_tier === 'lifetime') {
      report.alerts.push({
        userId: user.id,
        message:
          'lifetime tier row (deprecated tier, no Stripe evidence) — founder review',
      })
      continue
    }

    // One-time term plans: premium comes from premium_expires_at via the
    // effective-tier read; nothing on Stripe to reconcile against.
    const termActive =
      typeof user.premium_expires_at === 'string' &&
      Date.parse(user.premium_expires_at) > now.getTime()

    if (!user.stripe_subscription_id) {
      if (user.subscription_tier === 'premium' && !termActive) {
        report.alerts.push({
          userId: user.id,
          message:
            'premium tier with no stripe_subscription_id and no unexpired term — possible drift or manual comp; NOT auto-corrected',
        })
      }
      continue
    }

    // Re-derive truth from Stripe.
    let subscription: Stripe.Subscription | null = null
    try {
      subscription = await stripe.subscriptions.retrieve(
        user.stripe_subscription_id,
      )
    } catch (error) {
      const stripeError = error as { code?: string; message?: string }
      if (stripeError.code === 'resource_missing') {
        subscription = null // deleted long ago — expected tier is free
      } else {
        report.errors.push({
          userId: user.id,
          error: stripeError.message ?? 'stripe retrieve failed',
        })
        continue // network/API failure: touch nothing
      }
    }

    const stripeStatus = subscription?.status ?? 'missing'
    const expectedTier: 'free' | 'premium' =
      stripeStatus === 'active' || stripeStatus === 'trialing'
        ? 'premium'
        : 'free'
    const expectedRenewsAt = subscription ? renewsAtOf(subscription) : null

    const update: Record<string, unknown> = {}
    // Queued until the UPDATE proves it matched the row — a correction
    // is only a correction once the write is known to have landed.
    const pendingCorrections: ReconciliationCorrection[] = []
    if (user.subscription_tier !== expectedTier && !termActive) {
      update.subscription_tier = expectedTier
      pendingCorrections.push({
        userId: user.id,
        field: 'subscription_tier',
        from: user.subscription_tier,
        to: expectedTier,
        reason: `stripe subscription ${user.stripe_subscription_id} status=${stripeStatus}`,
      })
    }
    if ((user.subscription_status ?? null) !== (subscription?.status ?? null)) {
      update.subscription_status = subscription?.status ?? null
    }
    if ((user.subscription_renews_at ?? null) !== expectedRenewsAt) {
      update.subscription_renews_at = expectedRenewsAt
    }

    if (Object.keys(update).length > 0) {
      // `.select('id')` makes the writer prove it wrote: PostgREST
      // returns no error for an UPDATE that matches zero rows.
      const { data, error } = await supabase
        .from('users')
        .update(update)
        .eq('id', user.id)
        .select('id')
      if (error) {
        report.errors.push({
          userId: user.id,
          error: `correction write failed: ${error.message}`,
        })
      } else if (!Array.isArray(data) || data.length === 0) {
        report.errors.push({
          userId: user.id,
          error: `correction write matched 0 rows — nothing was written (fields: ${Object.keys(
            update,
          ).join(', ')})`,
        })
      } else {
        report.corrected.push(...pendingCorrections)
      }
    }
  }

  for (const alert of report.alerts) {
    console.error(
      `[billing-reconcile] ALERT user=${alert.userId}: ${alert.message}`,
    )
  }
  for (const correction of report.corrected) {
    console.warn(
      `[billing-reconcile] corrected user=${correction.userId} ${correction.field}: ${String(
        correction.from,
      )} → ${String(correction.to)} (${correction.reason})`,
    )
  }
  if (report.errors.length) {
    console.error(
      `[billing-reconcile] ${report.errors.length} error(s) — affected rows untouched`,
    )
  }

  return report
}
