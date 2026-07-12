/**
 * Phase 2 presentation logic (SA-027 paths 3 & 6, pattern doc §1 items
 * 2–3): gift-code redeem sheet state mapping + credit-pack card
 * visibility. Pure functions only — the components stay thin
 * (billing-paywall-state.test.ts pattern).
 */

import { describe, expect, it } from 'vitest'
import {
  formatEditionCount,
  giftCodeForWire,
  isGiftCodeShapePlausible,
  normalizeGiftCodeInput,
  resolveRedeemOutcome,
  sellableCreditPacks,
} from '@/lib/billing/paywall-state'
import type { BillingConfigResponse } from '@/types/billing'

// ---------------------------------------------------------------------------
// Gift-code input shaping — codes accepted with or without hyphens.
// ---------------------------------------------------------------------------

describe('normalizeGiftCodeInput', () => {
  it('uppercases and keeps only code characters', () => {
    expect(normalizeGiftCodeInput('abcd-efgh 23 45')).toBe('ABCD-EFGH2345')
    expect(normalizeGiftCodeInput('  ab!cd@ef#gh  ')).toBe('ABCDEFGH')
  })

  it('caps at the server wire limit (32 chars)', () => {
    expect(normalizeGiftCodeInput('A'.repeat(50))).toHaveLength(32)
  })
})

describe('giftCodeForWire', () => {
  it('strips hyphens and spacing — the server hashes exactly this form', () => {
    expect(giftCodeForWire('ABCD-EFGH-JKMN-PQRS')).toBe('ABCDEFGHJKMNPQRS')
    expect(giftCodeForWire('abcd efgh jkmn pqrs')).toBe('ABCDEFGHJKMNPQRS')
  })
})

describe('isGiftCodeShapePlausible', () => {
  it('accepts a canonical 16-char code, hyphenated or bare', () => {
    expect(isGiftCodeShapePlausible('ABCD-EFGH-JKMN-PQRS')).toBe(true)
    expect(isGiftCodeShapePlausible('abcdefghjkmnpqrs')).toBe(true)
  })

  it('rejects obvious typos without spending a rate-limited attempt', () => {
    expect(isGiftCodeShapePlausible('')).toBe(false)
    expect(isGiftCodeShapePlausible('ABCD')).toBe(false)
    expect(isGiftCodeShapePlausible('A'.repeat(33))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Redeem outcome mapping — every backend code lands on an honest UI state.
// ---------------------------------------------------------------------------

describe('resolveRedeemOutcome', () => {
  it('maps 200 ok to success with credits, balance, and the covered line', () => {
    expect(
      resolveRedeemOutcome(200, {
        ok: true,
        creditsAdded: 3,
        balance: 4,
        message: 'Someone covered your edition.',
      }),
    ).toEqual({
      kind: 'success',
      creditsAdded: 3,
      balance: 4,
      message: 'Someone covered your edition.',
    })
  })

  it('maps 401 AUTH_REQUIRED to the sign-in state, preferring server copy', () => {
    const outcome = resolveRedeemOutcome(401, {
      error: 'Sign in to redeem a code — the editions attach to your account.',
      code: 'AUTH_REQUIRED',
    })
    expect(outcome.kind).toBe('auth_required')
    if (outcome.kind === 'auth_required') {
      expect(outcome.error).toContain('Sign in to redeem')
    }
  })

  it('maps 400 and 404 INVALID_CODE to invalid_code with the honest copy', () => {
    for (const status of [400, 404]) {
      const outcome = resolveRedeemOutcome(status, {
        error:
          'That code isn’t valid or has been fully used. Check for typos and try again.',
        code: 'INVALID_CODE',
      })
      expect(outcome.kind).toBe('invalid_code')
      if (outcome.kind === 'invalid_code') {
        expect(outcome.error).toContain('Check for typos')
      }
    }
  })

  it('maps 409 ALREADY_REDEEMED', () => {
    const outcome = resolveRedeemOutcome(409, {
      error: 'You’ve already redeemed this code.',
      code: 'ALREADY_REDEEMED',
    })
    expect(outcome.kind).toBe('already_redeemed')
  })

  it('maps 429 RATE_LIMITED', () => {
    const outcome = resolveRedeemOutcome(429, {
      error: 'Too many redemption attempts. Please try again later.',
      code: 'RATE_LIMITED',
    })
    expect(outcome.kind).toBe('rate_limited')
  })

  it('maps 500 / unknown shapes to a generic error that still ends in an action', () => {
    expect(resolveRedeemOutcome(500, { code: 'REDEEM_FAILED' }).kind).toBe(
      'error',
    )
    const malformed = resolveRedeemOutcome(500, null)
    expect(malformed.kind).toBe('error')
    if (malformed.kind === 'error') {
      expect(malformed.error.length).toBeGreaterThan(0)
    }
  })

  it('never treats a non-ok 200 body as success', () => {
    expect(resolveRedeemOutcome(200, { ok: false }).kind).toBe('error')
    expect(resolveRedeemOutcome(200, null).kind).toBe('error')
  })
})

// ---------------------------------------------------------------------------
// Credit-pack card visibility — zero packs = no card, never an empty frame.
// ---------------------------------------------------------------------------

function makeConfig(
  overrides: Partial<
    Pick<BillingConfigResponse, 'paymentsEnabled' | 'creditPacks'>
  >,
) {
  return {
    paymentsEnabled: { iosIap: false, webStripe: true },
    creditPacks: [
      {
        id: 'credits_5',
        credits: 5,
        priceLabel: '$2.99',
        perEditionLabel: '≈ $0.60 per edition',
      },
    ],
    ...overrides,
  }
}

describe('sellableCreditPacks', () => {
  it('returns the advertised packs when web payments are on', () => {
    const packs = sellableCreditPacks(makeConfig({}))
    expect(packs).toHaveLength(1)
    expect(packs[0].id).toBe('credits_5')
  })

  it('returns [] before config loads', () => {
    expect(sellableCreditPacks(null)).toEqual([])
  })

  it('returns [] when web payments are disabled, even with packs listed', () => {
    expect(
      sellableCreditPacks(
        makeConfig({ paymentsEnabled: { iosIap: false, webStripe: false } }),
      ),
    ).toEqual([])
  })

  it('returns [] when the config lists no packs (unconfigured Stripe envs)', () => {
    expect(sellableCreditPacks(makeConfig({ creditPacks: [] }))).toEqual([])
    expect(sellableCreditPacks(makeConfig({ creditPacks: undefined }))).toEqual(
      [],
    )
  })

  it('drops malformed pack entries rather than rendering a broken card', () => {
    const packs = sellableCreditPacks(
      makeConfig({
        creditPacks: [
          { id: '', credits: 5, priceLabel: '$2.99', perEditionLabel: 'x' },
          {
            id: 'credits_0',
            credits: 0,
            priceLabel: '$0',
            perEditionLabel: 'x',
          },
          {
            id: 'credits_3',
            credits: 3,
            priceLabel: '$1.99',
            perEditionLabel: '≈ $0.66 per edition',
          },
        ],
      }),
    )
    expect(packs.map((pack) => pack.id)).toEqual(['credits_3'])
  })
})

describe('formatEditionCount', () => {
  it('handles the singular', () => {
    expect(formatEditionCount(1)).toBe('1 edition')
  })

  it('handles plurals', () => {
    expect(formatEditionCount(0)).toBe('0 editions')
    expect(formatEditionCount(5)).toBe('5 editions')
  })
})
