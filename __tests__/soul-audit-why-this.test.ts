/**
 * D-22 (F-074) — "Why this recommendation" row, data honesty contract.
 *
 * loadSelectedAuditReason resolves the REAL stored reason a plan/series was
 * matched from this session's Soul Audit payloads. The contract under test:
 * it returns the selected option's reasoning ONLY when the stored selection
 * provably points at the given plan (planToken) or series (seriesSlug), and
 * returns null — never a fabricated reason — in every other case.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { loadSelectedAuditReason } from '@/components/soul-audit/helpers'

const REASONING =
  'A restlessness that will not settle — this path sits with stillness before God.'

function submitPayload() {
  return {
    version: 'v2',
    auditRunId: 'run-1',
    runToken: 'tok-1',
    remainingAudits: 2,
    requiresEssentialConsent: true,
    analyticsOptInDefault: false,
    consentAccepted: true,
    crisis: { required: false, acknowledged: false, resources: [], prompt: '' },
    options: [
      {
        id: 'opt-1',
        kind: 'ai_primary',
        rank: 1,
        slug: 'quieting-the-noise',
        title: 'Quieting the Noise',
        question: 'Where did the quiet go?',
        confidence: 0.9,
        reasoning: REASONING,
      },
      {
        id: 'opt-2',
        kind: 'ai_primary',
        rank: 2,
        slug: 'another-path',
        title: 'Another Path',
        question: 'Q',
        confidence: 0.5,
        reasoning: 'A different reasoning for a path that was not selected.',
      },
    ],
    policy: {
      noAccountRequired: true,
      maxAuditsPerCycle: 3,
      directionCount: 3,
    },
  }
}

function selectionPayload(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    auditRunId: 'run-1',
    selectionType: 'ai_primary',
    route: '/daily-bread',
    planToken: 'token-abc',
    seriesSlug: 'quieting-the-noise',
    ...overrides,
  }
}

function seed(
  submit: unknown = submitPayload(),
  selection: unknown = selectionPayload(),
) {
  if (submit) {
    window.sessionStorage.setItem(
      'soul-audit-submit-v2',
      JSON.stringify(submit),
    )
  }
  if (selection) {
    window.sessionStorage.setItem(
      'soul-audit-selection-v2',
      JSON.stringify(selection),
    )
  }
}

afterEach(() => {
  window.sessionStorage.clear()
})

describe('loadSelectedAuditReason (D-22 why-this data contract)', () => {
  it('returns the selected option’s reasoning when the planToken matches', () => {
    seed()
    expect(loadSelectedAuditReason({ planToken: 'token-abc' })).toBe(REASONING)
  })

  it('returns the selected option’s reasoning when the seriesSlug matches', () => {
    seed()
    expect(loadSelectedAuditReason({ seriesSlug: 'quieting-the-noise' })).toBe(
      REASONING,
    )
  })

  it('returns null when no audit payloads exist (a later session)', () => {
    expect(loadSelectedAuditReason({ planToken: 'token-abc' })).toBeNull()
  })

  it('returns null when only one of the two payloads exists', () => {
    seed(submitPayload(), null)
    expect(loadSelectedAuditReason({ planToken: 'token-abc' })).toBeNull()
    window.sessionStorage.clear()
    seed(null, selectionPayload())
    expect(loadSelectedAuditReason({ planToken: 'token-abc' })).toBeNull()
  })

  it('returns null when the stored selection points at a DIFFERENT plan/series', () => {
    seed()
    expect(loadSelectedAuditReason({ planToken: 'token-other' })).toBeNull()
    expect(loadSelectedAuditReason({ seriesSlug: 'another-path' })).toBeNull()
  })

  it('returns null when called with no identifiers at all', () => {
    seed()
    expect(loadSelectedAuditReason({})).toBeNull()
    expect(
      loadSelectedAuditReason({ planToken: null, seriesSlug: null }),
    ).toBeNull()
  })

  it('returns null when the selected option carries no usable reasoning', () => {
    const submit = submitPayload()
    submit.options[0].reasoning = '   '
    seed(submit)
    expect(loadSelectedAuditReason({ planToken: 'token-abc' })).toBeNull()
  })

  it('returns null when the selection payload was not ok', () => {
    seed(submitPayload(), selectionPayload({ ok: false }))
    expect(loadSelectedAuditReason({ planToken: 'token-abc' })).toBeNull()
  })
})
