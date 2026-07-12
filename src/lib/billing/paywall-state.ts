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

import type {
  BillingConfigResponse,
  BillingCreditPack,
  BillingPlan,
} from '@/types/billing'

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

// ---------------------------------------------------------------------------
// Credit packs (SA-027 path 3, Phase 2) — pack-card visibility.
// ---------------------------------------------------------------------------

/**
 * The credit packs the paywall may render — non-empty ONLY when web
 * payments are enabled AND the config advertises at least one sellable
 * pack. Zero packs = no card, no gap (never a broken/empty card).
 */
export function sellableCreditPacks(
  config: Pick<BillingConfigResponse, 'paymentsEnabled' | 'creditPacks'> | null,
): BillingCreditPack[] {
  if (!config) return []
  if (!config.paymentsEnabled?.webStripe) return []
  if (!Array.isArray(config.creditPacks)) return []
  return config.creditPacks.filter(
    (pack) =>
      Boolean(pack) &&
      typeof pack.id === 'string' &&
      pack.id.length > 0 &&
      Number.isFinite(pack.credits) &&
      pack.credits > 0 &&
      typeof pack.priceLabel === 'string' &&
      pack.priceLabel.length > 0,
  )
}

/** "1 edition" / "3 editions" — one place for the plural. */
export function formatEditionCount(count: number): string {
  return count === 1 ? '1 edition' : `${count} editions`
}

// ---------------------------------------------------------------------------
// Gift-code redemption (SA-027 path 6) — input shaping + outcome mapping.
// The redeem sheet stays thin; everything here is pure and unit-tested.
// ---------------------------------------------------------------------------

/**
 * Shape typed/pasted input for display: uppercase, keep only the
 * characters a code can contain (A–Z, 2–9 alphabet plus hyphens),
 * capped at the server's 32-char wire limit.
 */
export function normalizeGiftCodeInput(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 32)
}

/**
 * The wire form: hyphens/spacing stripped, uppercase alphanumerics
 * only. The server hashes exactly this normalization, so codes are
 * accepted with or without hyphens.
 */
export function giftCodeForWire(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Client-side pre-check mirroring the server's CODE_SHAPE — used to
 * catch obvious typos BEFORE spending one of the 5/hour redemption
 * attempts. Never a substitute for the server's answer.
 */
export function isGiftCodeShapePlausible(input: string): boolean {
  return /^[A-Z0-9]{12,32}$/.test(giftCodeForWire(input))
}

export type RedeemOutcome =
  | {
      kind: 'success'
      creditsAdded: number
      balance: number
      message: string
    }
  | { kind: 'auth_required'; error: string }
  | { kind: 'invalid_code'; error: string }
  | { kind: 'already_redeemed'; error: string }
  | { kind: 'rate_limited'; error: string }
  | { kind: 'error'; error: string }

const REDEEM_FALLBACK_ERROR =
  'Unable to redeem right now. Please try again in a moment.'

/**
 * Map a /api/billing/redeem response onto sheet UI states. The server's
 * own copy is honest and specific — prefer it verbatim; the fallback
 * strings only cover a malformed payload.
 */
export function resolveRedeemOutcome(
  status: number,
  payload: unknown,
): RedeemOutcome {
  const root =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : {}
  const code = typeof root.code === 'string' ? root.code : null
  const serverError = typeof root.error === 'string' ? root.error : null

  if (status === 200 && root.ok === true) {
    return {
      kind: 'success',
      creditsAdded:
        typeof root.creditsAdded === 'number' ? root.creditsAdded : 0,
      balance: typeof root.balance === 'number' ? root.balance : 0,
      message:
        typeof root.message === 'string'
          ? root.message
          : 'Someone covered your edition.',
    }
  }

  if (status === 401 || code === 'AUTH_REQUIRED') {
    return {
      kind: 'auth_required',
      error:
        serverError ||
        'Sign in to redeem a code — the editions attach to your account.',
    }
  }

  if (code === 'ALREADY_REDEEMED' || status === 409) {
    return {
      kind: 'already_redeemed',
      error: serverError || 'You’ve already redeemed this code.',
    }
  }

  if (code === 'RATE_LIMITED' || status === 429) {
    return {
      kind: 'rate_limited',
      error:
        serverError || 'Too many redemption attempts. Please try again later.',
    }
  }

  if (code === 'INVALID_CODE' || status === 400 || status === 404) {
    return {
      kind: 'invalid_code',
      error:
        serverError ||
        'That code isn’t valid or has been fully used. Check for typos and try again.',
    }
  }

  return { kind: 'error', error: serverError || REDEEM_FALLBACK_ERROR }
}
