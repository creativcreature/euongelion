/**
 * paywall-state.ts — pure client-side logic for the custom-generation
 * paywall (Phase 1c, SA-026/SA-027).
 *
 * The select endpoint answers an un-entitled generation request with:
 *   401 { code: 'SIGN_IN_REQUIRED' }                       (anonymous)
 *   402 { code: 'GENERATION_ENTITLEMENT_REQUIRED',
 *         reason: 'no_entitlement' | 'allowance_exhausted',
 *         freeGenerationUsed: boolean }                    (signed in)
 *
 * `jsonError` flattens `details` into the payload root, so `reason` and
 * `freeGenerationUsed` arrive at the top level. We also accept a nested
 * `details` object so the client keeps working if the server ever stops
 * flattening. Everything here is pure and unit-tested — the components
 * stay thin.
 */

import type { BillingPlan } from '@/types/billing'

export type GenerationPaywallState =
  | 'sign_in_required'
  | 'no_entitlement'
  | 'allowance_exhausted'

export type GenerationGateResult =
  | {
      gated: true
      state: GenerationPaywallState
      freeGenerationUsed: boolean
    }
  | { gated: false }

function readGateDetails(payload: unknown): {
  code: string | null
  reason: string | null
  freeGenerationUsed: boolean
} {
  if (!payload || typeof payload !== 'object') {
    return { code: null, reason: null, freeGenerationUsed: false }
  }
  const root = payload as Record<string, unknown>
  const nested =
    root.details && typeof root.details === 'object'
      ? (root.details as Record<string, unknown>)
      : null

  const code = typeof root.code === 'string' ? root.code : null
  const reason =
    typeof root.reason === 'string'
      ? root.reason
      : nested && typeof nested.reason === 'string'
        ? nested.reason
        : null
  const freeGenerationUsed =
    typeof root.freeGenerationUsed === 'boolean'
      ? root.freeGenerationUsed
      : nested && typeof nested.freeGenerationUsed === 'boolean'
        ? nested.freeGenerationUsed
        : false

  return { code, reason, freeGenerationUsed }
}

/**
 * Map a failed /api/soul-audit/select response onto a paywall state.
 * Anything that is not the documented gate contract returns
 * `{ gated: false }` so the existing error handling still runs.
 */
export function resolveGenerationGate(
  status: number,
  payload: unknown,
): GenerationGateResult {
  const { code, reason, freeGenerationUsed } = readGateDetails(payload)

  if (status === 401 && code === 'SIGN_IN_REQUIRED') {
    return { gated: true, state: 'sign_in_required', freeGenerationUsed: false }
  }

  if (status === 402 && code === 'GENERATION_ENTITLEMENT_REQUIRED') {
    return {
      gated: true,
      state:
        reason === 'allowance_exhausted'
          ? 'allowance_exhausted'
          : 'no_entitlement',
      freeGenerationUsed,
    }
  }

  return { gated: false }
}

// ---------------------------------------------------------------------------
// Plan narration — true dates and true amounts, computed not promised.
// ---------------------------------------------------------------------------

/** First renewal (or term end for one-time plans) from a start date. */
export function planRenewalDate(
  plan: Pick<BillingPlan, 'termMonths'>,
  from: Date = new Date(),
): Date {
  const next = new Date(from.getTime())
  next.setMonth(next.getMonth() + plan.termMonths)
  return next
}

/** "March 11, 2027" — or null when the input is not a real date. */
export function formatLongDate(value: string | Date | null): string | null {
  if (!value) return null
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

/** "$77 / YEAR" — the true billed amount, restated beside the CTA. */
export function formatBilledAmountLabel(
  plan: Pick<BillingPlan, 'priceLabel'>,
): string {
  return plan.priceLabel.replace(/\s+/g, ' ').trim().toUpperCase()
}

export interface LifecycleTimelineEntry {
  label: string
  detail: string
}

/**
 * The honest lifecycle rail (§1 pattern doc): no trial theater — narrate
 * what actually happens. Recurring plans renew; multi-year prepays end
 * and never auto-renew. Every variant closes with the keep-forever fact.
 */
export function buildLifecycleTimeline(
  plan: Pick<BillingPlan, 'billingType' | 'termMonths' | 'priceLabel'>,
  now: Date = new Date(),
): LifecycleTimelineEntry[] {
  const boundary = formatLongDate(planRenewalDate(plan, now))

  if (plan.billingType === 'one_time') {
    return [
      { label: 'Today', detail: 'Your edition is composed.' },
      {
        label: boundary ?? 'Term end',
        detail: `Access ends — one-time payment of ${plan.priceLabel.trim()}, nothing renews automatically.`,
      },
      {
        label: 'Always',
        detail: 'Everything you’ve generated stays yours.',
      },
    ]
  }

  return [
    { label: 'Today', detail: 'Your edition is composed.' },
    { label: 'Before renewal', detail: 'We email you — no surprises.' },
    {
      label: boundary ?? 'Renewal',
      detail: `Renews at ${plan.priceLabel.trim()}. Cancel anytime; everything you’ve generated stays yours.`,
    },
  ]
}

/**
 * Covenant footer — verbatim from the approved pattern doc (§1.4).
 * One export so every surface quotes the same sentence.
 */
export const GENERATION_COVENANT =
  'The Bible is free. The library is free. The Soul Audit is free. You only pay when you want an edition composed for your specific words.'
