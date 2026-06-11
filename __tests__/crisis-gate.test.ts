/**
 * Crisis safety gate -- unit tests
 *
 * Asserts:
 * 1. All trigger phrases are detected (no false negatives on crisis language)
 * 2. Common false-positive phrases do NOT trigger (no over-blocking)
 * 3. Theological / devotional idioms are not blocked
 * 4. Categories are assigned correctly
 */

import { describe, expect, it } from 'vitest'
import { detectCrisis, CRISIS_RESOURCES } from '@/lib/soul-audit/crisis-gate'

// ---------------------------------------------------------------------------
// Trigger phrases -- must ALL return triggered: true
// ---------------------------------------------------------------------------

describe('detectCrisis -- suicidal ideation (must trigger)', () => {
  const phrases = [
    'I have been thinking about suicide',
    "I'm suicidal and I don't know what to do",
    'I want to kill myself',
    "I'm going to kill myself tonight",
    'I want to end my life',
    'I want to end it all',
    'I want to die',
    'I wish I was dead',
    'I wish I were dead',
    'better off dead',
    'I have no reason to live',
    "I don't want to live anymore",
    "I don't want to be here anymore",
    'I do not want to be here anymore',
    "I've thought about ending my life",
    "I've been thinking about taking my own life",
    'I was planning to kill myself',
    "I'm ready to die",
    'I want to be dead',
    "I've been contemplating suicide",
    'contemplating ending my life',
    "life isn't worth living",
    'not worth living',
    "I'm too tired to keep going",
    "I can't go on",
    "I can't do this anymore",
  ]

  for (const phrase of phrases) {
    it(`triggers on: "${phrase}"`, () => {
      const result = detectCrisis(phrase)
      expect(result.triggered).toBe(true)
      expect(result.category).toBe('suicidal_ideation')
    })
  }
})

describe('detectCrisis -- self-harm (must trigger)', () => {
  const phrases = [
    "I've been cutting myself",
    'I cut myself last night',
    'I hurt myself',
    'I have been hurting myself',
    "I've been doing self harm",
    "I've been self-harming",
    "I'm burning myself",
    "I've been starving myself",
  ]

  for (const phrase of phrases) {
    it(`triggers on: "${phrase}"`, () => {
      const result = detectCrisis(phrase)
      expect(result.triggered).toBe(true)
      expect(result.category).toBe('self_harm')
    })
  }
})

describe('detectCrisis -- abuse and danger (must trigger)', () => {
  const phrases = [
    'I am being abused',
    "I'm being abused by my partner",
    'he hits me when he gets angry',
    'she beats me regularly',
    "they hit me and I don't know what to do",
    'this is domestic violence',
    "I'm afraid of my husband",
    'afraid to go home tonight',
    'I was sexually abused',
    'I am being hit',
    'he hurts me',
    'my boyfriend is hitting me',
  ]

  for (const phrase of phrases) {
    it(`triggers on: "${phrase}"`, () => {
      const result = detectCrisis(phrase)
      expect(result.triggered).toBe(true)
      expect(result.category).toBe('abuse_danger')
    })
  }
})

describe('detectCrisis -- immediate danger (must trigger)', () => {
  const phrases = [
    'someone is trying to kill me',
    'I am in danger right now',
    'I need help right now',
    "I can't leave the house safely",
    'I am trapped at home',
    'trapped with him and scared',
  ]

  for (const phrase of phrases) {
    it(`triggers on: "${phrase}"`, () => {
      const result = detectCrisis(phrase)
      expect(result.triggered).toBe(true)
    })
  }
})

// ---------------------------------------------------------------------------
// False positives -- must NOT trigger
// ---------------------------------------------------------------------------

describe('detectCrisis -- common false positives (must NOT trigger)', () => {
  const phrases = [
    // Hyperbolic enthusiasm
    'I killed it at work today',
    'I was killing it at the gym',
    "I'm dying to see the new devotional",
    'dying to know more about the Psalms',
    "I'm dying of laughter",
    'dead tired after the retreat',
    'dead serious about my faith',
    'I could die of embarrassment',
    "we're killing two birds with one stone",
    'I had to kill time before church',
    'over my dead body will I give up',
    'he killed the vibe at the study group',

    // Theological / figurative death
    'I want to die to self and follow Christ',
    'dying to sin each day through Christ',
    'Paul says we are crucified with Christ',
    'I feel called to martyrdom in spirit',
    "I've been wrestling with the call to die to the flesh",
    'dying to my old self through baptism',

    // Non-crisis abuse contexts
    'I want to talk about the abuse of power in the church',
    'we need to address substance abuse in our community',
    'fighting against abuse of scripture in cults',
    'this is an abuse of authority',
    'abuse of trust in ministry leadership',

    // Not-worth idioms with non-life objects
    "it's not worth the effort",
    'not worth the time',
    'not worth the money I paid',
    'not worth the wait',
    'not worth it for that price',

    // Normal devotional reflections
    "Lately I've been feeling distant from God",
    "I'm struggling with doubt and questions about faith",
    'I feel overwhelmed by stress at work and home',
    'I have been dealing with grief after losing my grandmother',
    'I want to grow deeper in scripture',
    'feeling spiritually dry and disconnected',
    'I am angry at God about something that happened',
    "I'm wrestling with forgiveness",

    // Empty / short text
    '',
    '   ',
  ]

  for (const phrase of phrases) {
    const label = phrase.slice(0, 60) + (phrase.length > 60 ? '...' : '')
    it(`does NOT trigger on: "${label}"`, () => {
      const result = detectCrisis(phrase)
      expect(result.triggered).toBe(false)
    })
  }
})

// ---------------------------------------------------------------------------
// Case insensitivity
// ---------------------------------------------------------------------------

describe('detectCrisis -- case insensitivity', () => {
  it('detects uppercase SUICIDE', () => {
    expect(detectCrisis('I HAVE THOUGHT ABOUT SUICIDE').triggered).toBe(true)
  })

  it('detects mixed case "Want To Die"', () => {
    expect(detectCrisis('I Want To Die').triggered).toBe(true)
  })

  it('does not false-positive on "KILLED IT"', () => {
    expect(detectCrisis('KILLED IT TODAY').triggered).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// CRISIS_RESOURCES sanity check
// ---------------------------------------------------------------------------

describe('CRISIS_RESOURCES', () => {
  it('exports 988, Crisis Text Line, and findahelpline', () => {
    const names = CRISIS_RESOURCES.map((r) => r.name)
    expect(names).toContain('988 Suicide & Crisis Lifeline')
    expect(names).toContain('Crisis Text Line')
    expect(names).toContain('International resources')
  })

  it('has correct href format for 988', () => {
    const lifeline = CRISIS_RESOURCES.find((r) => r.name.includes('988'))
    expect(lifeline?.href).toBe('tel:988')
  })

  it('has correct sms href for Crisis Text Line', () => {
    const textLine = CRISIS_RESOURCES.find((r) =>
      r.name.includes('Crisis Text'),
    )
    expect(textLine?.href).toMatch(/^sms:741741/)
  })

  it('has https href for international fallback', () => {
    const intl = CRISIS_RESOURCES.find((r) => r.name.includes('International'))
    expect(intl?.href).toMatch(/^https:\/\/findahelpline/)
  })
})
