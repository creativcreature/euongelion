import { describe, expect, it } from 'vitest'
import {
  inferDisposition,
  inferFaithBackground,
  inferDepthPreference,
  parseAuditIntent,
} from '@/lib/brain/intent-parser'
import type {
  Disposition,
  FaithBackground,
  DepthPreference,
} from '@/lib/brain/intent-parser'

describe('intent-parser: disposition inference', () => {
  it('infers seeker for exploring/curious language', () => {
    expect(inferDisposition('I am searching for meaning')).toBe('seeker')
    expect(inferDisposition('curious about Christianity')).toBe('seeker')
    expect(inferDisposition("I'm new to faith")).toBe('seeker')
    expect(inferDisposition("I'm exploring spirituality")).toBe('seeker')
  })

  it('infers returning for prodigal/reconnect language', () => {
    expect(inferDisposition('I grew up in church but walked away')).toBe(
      'returning',
    )
    expect(inferDisposition('coming back to faith after years away')).toBe(
      'returning',
    )
    expect(inferDisposition('I want to reconnect with God')).toBe('returning')
    expect(inferDisposition('I used to go to church')).toBe('returning')
  })

  it('infers scholarly for academic/study language', () => {
    expect(
      inferDisposition('I want to study the Hebrew meaning of shalom'),
    ).toBe('scholarly')
    expect(inferDisposition('looking for a deep exegesis of Romans 9')).toBe(
      'scholarly',
    )
    expect(
      inferDisposition('interested in systematic theology and doctrine'),
    ).toBe('scholarly')
    expect(inferDisposition('Greek lexicon analysis of agape')).toBe(
      'scholarly',
    )
  })

  it('infers pastoral for pain/crisis language', () => {
    expect(inferDisposition('I am hurting and broken right now')).toBe(
      'pastoral',
    )
    expect(inferDisposition('going through a crisis of faith')).toBe(
      'pastoral',
    )
    expect(inferDisposition('I feel overwhelmed and lost')).toBe('pastoral')
    expect(
      inferDisposition('suffering and desperate for answers'),
    ).toBe('pastoral')
  })

  it('defaults to seeker for ambiguous input', () => {
    expect(inferDisposition('help')).toBe('seeker')
    expect(inferDisposition('money')).toBe('seeker')
    expect(inferDisposition('')).toBe('seeker')
  })

  it('picks highest match when multiple dispositions overlap', () => {
    // "struggling" (pastoral) + "study" (scholarly) — pastoral has 1 match, scholarly has 1 match
    // Both match equally; first with highest count wins
    const result = inferDisposition('struggling to study the Bible')
    expect(['pastoral', 'scholarly']).toContain(result)
  })
})

describe('intent-parser: faith background inference', () => {
  it('infers christian for church/Bible language', () => {
    expect(inferFaithBackground('I go to church every Sunday')).toBe(
      'christian',
    )
    expect(inferFaithBackground('reading my Bible and praying')).toBe(
      'christian',
    )
    expect(inferFaithBackground('my pastor said something')).toBe('christian')
    expect(inferFaithBackground('I worship Jesus Christ')).toBe('christian')
  })

  it('infers other-faith for non-Christian religious language', () => {
    expect(inferFaithBackground('I am a Muslim exploring')).toBe('other-faith')
    expect(inferFaithBackground('coming from a Buddhist background')).toBe(
      'other-faith',
    )
    expect(
      inferFaithBackground('I grew up Jewish and attend synagogue'),
    ).toBe('other-faith')
    expect(inferFaithBackground('interested in interfaith dialogue')).toBe(
      'other-faith',
    )
  })

  it('infers curious for agnostic/skeptic language', () => {
    expect(
      inferFaithBackground("I'm agnostic but open to exploring"),
    ).toBe('curious')
    expect(inferFaithBackground('atheist who is questioning')).toBe('curious')
    expect(
      inferFaithBackground("I'm spiritual but not religious"),
    ).toBe('curious')
    expect(inferFaithBackground('is God real?')).toBe('curious')
  })

  it('defaults to unspecified for neutral input', () => {
    expect(inferFaithBackground('I feel anxious about work')).toBe(
      'unspecified',
    )
    expect(inferFaithBackground('help')).toBe('unspecified')
    expect(inferFaithBackground('')).toBe('unspecified')
  })
})

describe('intent-parser: depth preference inference', () => {
  it('infers introductory for beginner/basic language', () => {
    expect(inferDepthPreference('help me understand the basics')).toBe(
      'introductory',
    )
    expect(inferDepthPreference("I'm a beginner")).toBe('introductory')
    expect(inferDepthPreference('simple overview of prayer')).toBe(
      'introductory',
    )
    expect(inferDepthPreference('what does it mean to be saved?')).toBe(
      'introductory',
    )
  })

  it('infers intermediate for growth/deepen language', () => {
    expect(inferDepthPreference('I want to deepen my faith')).toBe(
      'intermediate',
    )
    expect(inferDepthPreference('ready for the next step in discipleship')).toBe(
      'intermediate',
    )
    expect(inferDepthPreference('help me grow and mature')).toBe(
      'intermediate',
    )
    expect(
      inferDepthPreference('looking for further spiritual formation'),
    ).toBe('intermediate')
  })

  it('infers deep-study for academic language', () => {
    expect(
      inferDepthPreference('I want to study Hebrew and Greek texts'),
    ).toBe('deep-study')
    expect(
      inferDepthPreference('looking for scholarly commentary on Isaiah'),
    ).toBe('deep-study')
    expect(
      inferDepthPreference('academic deep dive into systematic theology'),
    ).toBe('deep-study')
    expect(inferDepthPreference('hermeneutic analysis of the parables')).toBe(
      'deep-study',
    )
  })

  it('defaults to introductory for ambiguous input', () => {
    expect(inferDepthPreference('help')).toBe('introductory')
    expect(inferDepthPreference('')).toBe('introductory')
  })
})

describe('intent-parser: parseAuditIntent integration', () => {
  it('returns all taxonomy fields for rich input', () => {
    const result = parseAuditIntent(
      'I want to study the Hebrew meaning of shalom and grow deeper in my faith at church',
    )
    expect(result.disposition).toBe('scholarly')
    expect(result.faithBackground).toBe('christian')
    expect(result.depthPreference).toBe('deep-study')
    expect(result.themes.length).toBeGreaterThan(0)
    expect(result.tone).toBeDefined()
    expect(result.reflectionFocus.length).toBeGreaterThan(0)
  })

  it('returns sensible defaults for minimal input', () => {
    const result = parseAuditIntent('help')
    expect(result.disposition).toBe('seeker')
    expect(result.faithBackground).toBe('unspecified')
    expect(result.depthPreference).toBe('introductory')
    expect(result.reflectionFocus).toBe('help')
  })

  it('includes disposition and depth in intentTags', () => {
    const result = parseAuditIntent('I am hurting and need deep study of Psalms')
    expect(result.intentTags).toContain(result.disposition)
    expect(result.intentTags).toContain(result.depthPreference)
  })

  it('caps intentTags at 8', () => {
    const result = parseAuditIntent(
      'anxiety grief purpose sin trust relationships study exegesis hermeneutic',
    )
    expect(result.intentTags.length).toBeLessThanOrEqual(8)
  })

  it('infers pastoral disposition for pain language', () => {
    const result = parseAuditIntent(
      'I am broken and desperate, struggling with overwhelming pain',
    )
    expect(result.disposition).toBe('pastoral')
  })

  it('infers curious faith background for agnostic language', () => {
    const result = parseAuditIntent(
      "I'm an agnostic who is questioning whether God is real",
    )
    expect(result.faithBackground).toBe('curious')
  })

  it('handles scripture anchor inference', () => {
    const result = parseAuditIntent('I feel anxiety and fear about the future')
    expect(result.scriptureAnchors).toContain('Philippians 4:6-7')
  })

  it('handles grief tone and anchors', () => {
    const result = parseAuditIntent('I am grieving the loss of my mother')
    expect(result.tone).toBe('lament')
    expect(result.scriptureAnchors).toContain('Psalm 34:18')
  })
})

describe('intent-parser: type safety', () => {
  it('disposition is a valid Disposition value', () => {
    const valid: Disposition[] = ['seeker', 'returning', 'scholarly', 'pastoral']
    const result = inferDisposition('test input')
    expect(valid).toContain(result)
  })

  it('faithBackground is a valid FaithBackground value', () => {
    const valid: FaithBackground[] = [
      'christian',
      'other-faith',
      'curious',
      'unspecified',
    ]
    const result = inferFaithBackground('test input')
    expect(valid).toContain(result)
  })

  it('depthPreference is a valid DepthPreference value', () => {
    const valid: DepthPreference[] = [
      'introductory',
      'intermediate',
      'deep-study',
    ]
    const result = inferDepthPreference('test input')
    expect(valid).toContain(result)
  })
})
