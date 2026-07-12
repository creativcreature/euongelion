/**
 * Phase 1d — held-moment generation interstitial (pattern doc §6/§7).
 *
 * Contracts under test:
 *  1. STAGE-MAPPING HONESTY (Dev Rule #1 applied to motion): a checklist
 *     row completes ONLY when the real job stage it narrates has
 *     completed on the server. No poll response → nothing checked; no
 *     timer or client-side guess ever advances a row.
 *  2. ARRIVAL ECHO CONSENT CUE (§7.6): the reader's words are quoted
 *     back ONLY when they were typed this same session; resumed /
 *     fresh-tab arrivals get an abstract-but-specific echo naming the
 *     theme + Scripture anchor — never a generic "based on your input".
 */
import { describe, expect, it } from 'vitest'
import {
  GENERATION_STAGES,
  activeStageIndex,
  clampQuote,
  completedStageCount,
  resolveArrivalEcho,
  type GenerationStatusSnapshot,
} from '@/components/soul-audit/generation-stages'

function snapshot(
  overrides: Partial<GenerationStatusSnapshot> = {},
): GenerationStatusSnapshot {
  return {
    status: 'generating',
    progress: null,
    currentDay: 0,
    totalDays: 7,
    route: null,
    ...overrides,
  }
}

describe('generation stage mapping — honesty', () => {
  it('has exactly the four approved narration stages, in order', () => {
    expect(GENERATION_STAGES.map((s) => s.label)).toEqual([
      'Reading what you wrote',
      'Composing your arc',
      'Selecting passages',
      'Setting the type',
    ])
  })

  it('checks NOTHING before the first successful poll', () => {
    expect(completedStageCount(null)).toBe(0)
  })

  it('checks only "Reading what you wrote" once the job exists (E1)', () => {
    // First poll: job acknowledged, executor not yet composing.
    expect(
      completedStageCount(
        snapshot({ status: 'pending', progress: null, currentDay: 0 }),
      ),
    ).toBe(1)
    // The status route's default kick copy is NOT a composition signal.
    expect(
      completedStageCount(snapshot({ progress: 'Preparing day 1…' })),
    ).toBe(1)
  })

  it('checks "Composing your arc" only on a real runner signal (E2)', () => {
    expect(
      completedStageCount(snapshot({ progress: 'Composing day 1 of 7...' })),
    ).toBe(2)
  })

  it('checks "Selecting passages" only when Day 1 is SAVED (E3)', () => {
    expect(
      completedStageCount(
        snapshot({ progress: 'Day 1 of 7 complete.', currentDay: 1 }),
      ),
    ).toBe(3)
    // Days advancing further never over-checks stage 4 — the route decides.
    expect(
      completedStageCount(
        snapshot({ progress: 'Composing day 5 of 7...', currentDay: 4 }),
      ),
    ).toBe(3)
  })

  it('checks "Setting the type" only when the route opens (E4)', () => {
    expect(
      completedStageCount(snapshot({ currentDay: 1, route: '/daily-bread' })),
    ).toBe(4)
    expect(
      completedStageCount(
        snapshot({
          status: 'complete',
          progress: 'All 7 days generated.',
          currentDay: 7,
        }),
      ),
    ).toBe(4)
  })

  it('a mid-flight resume checks every stage that provably completed', () => {
    // Landing on a job already at day 3: E1–E3 all really happened.
    expect(
      completedStageCount(
        snapshot({ progress: 'Composing day 3 of 7...', currentDay: 2 }),
      ),
    ).toBe(3)
  })

  it('error/stalled states never check additional rows', () => {
    expect(
      completedStageCount(
        snapshot({ status: 'stalled', progress: 'Composing day 1 of 7...' }),
      ),
    ).toBe(2)
    expect(completedStageCount(snapshot({ status: 'error' }))).toBe(1)
  })

  it('the active stage is always the first unchecked row', () => {
    expect(activeStageIndex(0)).toBe(0)
    expect(activeStageIndex(2)).toBe(2)
    // Fully complete: index clamps to the last row (arrival takes over).
    expect(activeStageIndex(4)).toBe(3)
  })
})

describe('arrival echo — quote with consent cue (§7.6)', () => {
  it('quotes the reader’s words ONLY when typed this session', () => {
    const echo = resolveArrivalEcho({
      typedThisSession: 'I feel far from God and I cannot rest.',
      theme: 'Rest for the Weary',
      scriptureAnchor: 'Matthew 11:28',
    })
    expect(echo.kind).toBe('quote')
    expect(echo.quote).toBe('I feel far from God and I cannot rest.')
    expect(echo.statement).toBe('Your seven days were composed for this.')
  })

  it('resumed/fresh-tab arrivals get theme + anchor, never the typed words', () => {
    const echo = resolveArrivalEcho({
      typedThisSession: null,
      theme: 'Rest for the Weary',
      scriptureAnchor: 'Matthew 11:28',
    })
    expect(echo.kind).toBe('abstract')
    expect(echo.quote).toBeNull()
    expect(echo.statement).toBe(
      'Composed for what you named — Rest for the Weary, anchored in Matthew 11:28.',
    )
  })

  it('degrades specifically: theme-only, anchor-only, neither', () => {
    expect(
      resolveArrivalEcho({
        typedThisSession: null,
        theme: 'Rest for the Weary',
        scriptureAnchor: null,
      }).statement,
    ).toBe('Composed for what you named — Rest for the Weary.')

    expect(
      resolveArrivalEcho({
        typedThisSession: null,
        theme: null,
        scriptureAnchor: 'Matthew 11:28',
      }).statement,
    ).toBe('Composed for you, anchored in Matthew 11:28.')

    const bare = resolveArrivalEcho({
      typedThisSession: null,
      theme: null,
      scriptureAnchor: null,
    })
    expect(bare.kind).toBe('abstract')
    expect(bare.statement.length).toBeGreaterThan(0)
  })

  it('NEVER emits the banned generic "based on your input"', () => {
    const variants = [
      { typedThisSession: 'anxiety', theme: 't', scriptureAnchor: 'a' },
      { typedThisSession: null, theme: 't', scriptureAnchor: 'a' },
      { typedThisSession: null, theme: 't', scriptureAnchor: null },
      { typedThisSession: null, theme: null, scriptureAnchor: 'a' },
      { typedThisSession: null, theme: null, scriptureAnchor: null },
    ]
    for (const input of variants) {
      const echo = resolveArrivalEcho(input)
      expect(echo.statement.toLowerCase()).not.toContain('based on your input')
    }
  })

  it('whitespace-only typed words do not count as consent to quote', () => {
    const echo = resolveArrivalEcho({
      typedThisSession: '   ',
      theme: 'Rest',
      scriptureAnchor: 'Psalm 23',
    })
    expect(echo.kind).toBe('abstract')
  })

  it('clamps long quotes on a word boundary with an ellipsis', () => {
    const long = `${'I keep circling the same fear and '.repeat(8)}end.`
    const clamped = clampQuote(long)
    expect(clamped.length).toBeLessThanOrEqual(141)
    expect(clamped.endsWith('…')).toBe(true)
    // No mid-word cut before the ellipsis.
    const beforeEllipsis = clamped.slice(0, -1).trimEnd()
    expect(long.startsWith(beforeEllipsis)).toBe(true)

    // Short quotes pass through verbatim.
    expect(clampQuote('I cannot rest.')).toBe('I cannot rest.')
  })
})
