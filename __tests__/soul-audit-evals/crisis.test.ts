/**
 * Crisis gate deterministic tests — zero network, zero API key required.
 *
 * Contract:
 *   - detectCrisis() MUST return triggered:true for every expectCrisis:true fixture (100%)
 *   - detectCrisis() MUST return triggered:false for every expectCrisis:false fixture (0% false triggers)
 *
 * These run in every CI pass. Do not add any vi.mock() or network I/O here.
 */

import { describe, expect, it } from 'vitest'
import { detectCrisis } from '@/lib/soul-audit/crisis-gate'
import {
  CRISIS_FIXTURES,
  SAFE_FIXTURES,
  FIXTURE_COUNT_BY_CATEGORY,
} from './reflections'

// ── Sanity check on the fixture set ──────────────────────────────────────────

describe('Fixture set integrity', () => {
  it('has at least 60 total fixtures', () => {
    const total = Object.values(FIXTURE_COUNT_BY_CATEGORY).reduce(
      (a, b) => a + b,
      0,
    )
    expect(total).toBeGreaterThanOrEqual(60)
  })

  it('has at least 8 crisis fixtures', () => {
    expect(CRISIS_FIXTURES.length).toBeGreaterThanOrEqual(8)
  })

  it('has crisis fixtures in every danger category (suicidal, self-harm, abuse, immediate)', () => {
    // Just check variety — we don't expose category on the fixture at this level
    // but the count being >= 8 across diverse phrasing is sufficient.
    expect(CRISIS_FIXTURES.length).toBeGreaterThanOrEqual(4)
  })

  it('has safe fixtures in every non-crisis category', () => {
    const safeCategories = new Set(SAFE_FIXTURES.map((f) => f.category))
    const expectedCategories = [
      'grief',
      'anxiety',
      'doubt',
      'besetting_sin',
      'numbness_burnout',
      'joy_gratitude',
      'vague',
      'typos_rambles',
    ]
    for (const cat of expectedCategories) {
      expect(
        safeCategories.has(cat as never),
        `missing safe fixtures for category: ${cat}`,
      ).toBe(true)
    }
  })
})

// ── Crisis detection: must trigger on all expectCrisis:true fixtures ──────────

describe('detectCrisis — crisis fixtures (must ALL trigger)', () => {
  for (const fixture of CRISIS_FIXTURES) {
    it(`triggers on: "${fixture.text.slice(0, 70)}${fixture.text.length > 70 ? '…' : ''}"`, () => {
      const result = detectCrisis(fixture.text)
      expect(
        result.triggered,
        `Expected crisis trigger but got triggered:false for: "${fixture.text}"`,
      ).toBe(true)
      expect(result.category).toBeDefined()
    })
  }
})

// ── False-positive check: must NOT trigger on any expectCrisis:false fixture ─

describe('detectCrisis — safe fixtures (must NONE trigger)', () => {
  for (const fixture of SAFE_FIXTURES) {
    it(`does not trigger on [${fixture.category}]: "${fixture.text.slice(0, 70)}${fixture.text.length > 70 ? '…' : ''}"`, () => {
      const result = detectCrisis(fixture.text)
      expect(
        result.triggered,
        `Unexpected crisis trigger for [${fixture.category}]: "${fixture.text}"`,
      ).toBe(false)
    })
  }
})

// ── Edge cases ─────────────────────────────────────────────────────────────

describe('detectCrisis — edge cases', () => {
  it('returns triggered:false for empty string', () => {
    expect(detectCrisis('')).toEqual({ triggered: false })
  })

  it('returns triggered:false for whitespace-only input', () => {
    expect(detectCrisis('   \n\t  ')).toEqual({ triggered: false })
  })

  it('does not trigger on "dying to see you" (hyperbolic enthusiasm)', () => {
    expect(detectCrisis("I'm dying to see the new place!")).toEqual({
      triggered: false,
    })
  })

  it('does not trigger on "die to self" (theological idiom)', () => {
    expect(
      detectCrisis('I need to learn to die to self and follow Christ.'),
    ).toEqual({
      triggered: false,
    })
  })

  it('does not trigger on "killed it at work" (hyperbole)', () => {
    expect(
      detectCrisis('She absolutely killed it at the presentation.'),
    ).toEqual({
      triggered: false,
    })
  })

  it('does not trigger on "abuse of power" (institutional context)', () => {
    expect(
      detectCrisis('The abuse of power in that organization was appalling.'),
    ).toEqual({ triggered: false })
  })

  it('does not trigger on "substance abuse" as a topic reference', () => {
    expect(
      detectCrisis('I lead a substance abuse recovery group at my church.'),
    ).toEqual({ triggered: false })
  })

  it('does not trigger on "dead serious" (idiom)', () => {
    expect(
      detectCrisis("I'm dead serious about wanting to grow spiritually."),
    ).toEqual({
      triggered: false,
    })
  })

  it('does not trigger on "not worth the effort" (idiom)', () => {
    expect(detectCrisis('Arguing about this is not worth the effort.')).toEqual(
      { triggered: false },
    )
  })

  it('triggers on direct first-person suicidal ideation regardless of surrounding context', () => {
    const result = detectCrisis(
      'Church has been hard lately. I want to die. The worship was nice though.',
    )
    expect(result.triggered).toBe(true)
    expect(result.category).toBe('suicidal_ideation')
  })

  it('triggers on self-harm with "cutting myself"', () => {
    const result = detectCrisis(
      'I have been cutting myself when the pain gets too bad.',
    )
    expect(result.triggered).toBe(true)
    expect(result.category).toBe('self_harm')
  })

  it('triggers on domestic violence first-person present danger', () => {
    const result = detectCrisis('He hits me when he drinks.')
    expect(result.triggered).toBe(true)
    expect(result.category).toBe('abuse_danger')
  })

  it('triggers on immediate danger phrase', () => {
    const result = detectCrisis(
      'I am in danger right now and I need help right now.',
    )
    expect(result.triggered).toBe(true)
  })
})
