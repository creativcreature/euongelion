import { describe, expect, it } from 'vitest'
import {
  buildLifecycleTimeline,
  formatBilledAmountLabel,
  formatLongDate,
  GENERATION_COVENANT,
  planRenewalDate,
  resolveGenerationGate,
} from '@/lib/billing/paywall-state'
import { BILLING_PLANS } from '@/lib/billing/catalog'

const annual = BILLING_PLANS.find((plan) => plan.id === 'premium_annual')!
const monthly = BILLING_PLANS.find((plan) => plan.id === 'premium_monthly')!
const twoYear = BILLING_PLANS.find((plan) => plan.id === 'premium_2year')!

describe('resolveGenerationGate', () => {
  it('maps 401 SIGN_IN_REQUIRED to the sign-in state', () => {
    const result = resolveGenerationGate(401, {
      error: 'Sign in to compose a custom plan.',
      code: 'SIGN_IN_REQUIRED',
    })
    expect(result).toEqual({
      gated: true,
      state: 'sign_in_required',
      freeGenerationUsed: false,
    })
  })

  it('maps 402 no_entitlement with the flat wire shape (jsonError spreads details)', () => {
    const result = resolveGenerationGate(402, {
      error: 'A subscription unlocks unlimited editions.',
      code: 'GENERATION_ENTITLEMENT_REQUIRED',
      reason: 'no_entitlement',
      freeGenerationUsed: true,
    })
    expect(result).toEqual({
      gated: true,
      state: 'no_entitlement',
      freeGenerationUsed: true,
    })
  })

  it('also accepts a nested details object (documented contract shape)', () => {
    const result = resolveGenerationGate(402, {
      code: 'GENERATION_ENTITLEMENT_REQUIRED',
      details: { reason: 'allowance_exhausted', freeGenerationUsed: true },
    })
    expect(result).toEqual({
      gated: true,
      state: 'allowance_exhausted',
      freeGenerationUsed: true,
    })
  })

  it('maps 402 allowance_exhausted to the factual state', () => {
    const result = resolveGenerationGate(402, {
      code: 'GENERATION_ENTITLEMENT_REQUIRED',
      reason: 'allowance_exhausted',
      freeGenerationUsed: true,
    })
    expect(result.gated).toBe(true)
    if (result.gated) {
      expect(result.state).toBe('allowance_exhausted')
    }
  })

  it('defaults a 402 with a missing reason to no_entitlement', () => {
    const result = resolveGenerationGate(402, {
      code: 'GENERATION_ENTITLEMENT_REQUIRED',
    })
    expect(result).toEqual({
      gated: true,
      state: 'no_entitlement',
      freeGenerationUsed: false,
    })
  })

  it('does NOT gate a 401 with a different code (e.g. auth failures)', () => {
    expect(resolveGenerationGate(401, { code: 'AUTH_REQUIRED' })).toEqual({
      gated: false,
    })
  })

  it('does NOT gate other statuses or malformed payloads', () => {
    expect(resolveGenerationGate(404, { error: 'run not found' })).toEqual({
      gated: false,
    })
    expect(resolveGenerationGate(500, null)).toEqual({ gated: false })
    expect(resolveGenerationGate(402, undefined)).toEqual({ gated: false })
    expect(resolveGenerationGate(200, { ok: true })).toEqual({ gated: false })
  })
})

describe('planRenewalDate', () => {
  it('adds the plan term in months', () => {
    const from = new Date('2026-07-11T12:00:00Z')
    expect(planRenewalDate(annual, from).toISOString().slice(0, 10)).toBe(
      '2027-07-11',
    )
    expect(planRenewalDate(monthly, from).toISOString().slice(0, 10)).toBe(
      '2026-08-11',
    )
    expect(planRenewalDate(twoYear, from).toISOString().slice(0, 10)).toBe(
      '2028-07-11',
    )
  })
})

describe('formatLongDate', () => {
  it('formats ISO strings as long dates', () => {
    expect(formatLongDate('2027-07-11T12:00:00Z')).toBe('July 11, 2027')
  })

  it('returns null for missing or invalid input — never a fabricated date', () => {
    expect(formatLongDate(null)).toBeNull()
    expect(formatLongDate('not-a-date')).toBeNull()
  })
})

describe('formatBilledAmountLabel', () => {
  it('restates the true billed amount, uppercased', () => {
    expect(formatBilledAmountLabel(annual)).toBe('$77 / YEAR')
    expect(formatBilledAmountLabel(monthly)).toBe('$7 / MONTH')
  })
})

describe('buildLifecycleTimeline', () => {
  const now = new Date('2026-07-11T12:00:00Z')

  it('narrates a recurring plan honestly: today, reminder, real renewal', () => {
    const entries = buildLifecycleTimeline(annual, now)
    expect(entries).toHaveLength(3)
    expect(entries[0].label).toBe('Today')
    expect(entries[1].label).toBe('Before renewal')
    expect(entries[2].label).toBe('July 11, 2027')
    expect(entries[2].detail).toContain('Renews at $77 / year')
    expect(entries[2].detail).toContain('Cancel anytime')
    expect(entries[2].detail).toContain('stays yours')
  })

  it('narrates a one-time plan as a term end — nothing auto-renews', () => {
    const entries = buildLifecycleTimeline(twoYear, now)
    expect(entries[1].label).toBe('July 11, 2028')
    expect(entries[1].detail).toContain('nothing renews automatically')
    expect(entries.some((entry) => entry.detail.includes('stays yours'))).toBe(
      true,
    )
  })

  it('never shows a countdown or strikethrough framing', () => {
    for (const plan of [annual, monthly, twoYear]) {
      for (const entry of buildLifecycleTimeline(plan, now)) {
        expect(entry.detail).not.toMatch(/expires in|only|hurry|was \$/i)
      }
    }
  })
})

describe('GENERATION_COVENANT', () => {
  it('is the approved covenant, verbatim', () => {
    expect(GENERATION_COVENANT).toBe(
      'The Bible is free. The library is free. The Soul Audit is free. You only pay when you want an edition composed for your specific words.',
    )
  })
})
