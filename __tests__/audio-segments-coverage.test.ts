import { describe, expect, it } from 'vitest'
import { buildModuleSegments, expandReference } from '@/lib/audio/segments'
import type { Module } from '@/types'

/**
 * Audio Edition reading contract.
 *
 * Measured 2026-08-11 across 521 devotionals: the previous `moduleText()` read
 * a fixed field list and spoke a median 70.7% of each devotional's distinct
 * prose. ~252,000 words corpus-wide were never read aloud — every `profile`
 * module, `insight.historicalContext`, `vocab.usageNote`,
 * `bridge.newTestamentEcho`, `comprehension.question`.
 *
 * These tests pin the corrected contract: read everything once, never twice,
 * never speak a glyph, and never speak a definition without its headword.
 */

const spoken = (segments: { text: string }[]) =>
  segments.map((s) => s.text).join('  ')

describe('buildModuleSegments — completeness', () => {
  it('reads profile modules, which were previously silent', () => {
    const modules = [
      {
        type: 'profile',
        heading: 'The Voice Behind Today',
        name: 'Hosea son of Beeri',
        era: 'eighth century BC',
        bio: 'A prophet whose own marriage became the sign he was sent to deliver.',
        keyQuote: 'Sow for yourselves righteousness.',
        lessonForUs: 'He turns every charge into either farming or marriage.',
      } as unknown as Module,
    ]
    const text = spoken(buildModuleSegments('T', modules))
    expect(text).toContain('Hosea son of Beeri')
    expect(text).toContain('eighth century BC')
    expect(text).toContain('marriage became the sign')
    expect(text).toContain('Sow for yourselves righteousness')
    expect(text).toContain('turns every charge')
  })

  it('reads insight historicalContext and fascinatingFact', () => {
    const modules = [
      {
        type: 'insight',
        content: 'The hinge of the letter.',
        historicalContext: 'Written from prison in the early sixties.',
        fascinatingFact: 'Only two words carry the turn.',
      } as unknown as Module,
    ]
    const text = spoken(buildModuleSegments('T', modules))
    expect(text).toContain('Written from prison')
    expect(text).toContain('Only two words')
  })

  it('reads the comprehension question, not just the answer', () => {
    const modules = [
      {
        type: 'comprehension',
        question: 'What does Hosea mean by unplowed ground?',
        explanation: 'Fallow ground is capable land whose surface has crusted.',
      } as unknown as Module,
    ]
    const text = spoken(buildModuleSegments('T', modules))
    expect(text).toContain('What does Hosea mean')
    expect(text).toContain('Fallow ground is capable land')
  })

  it('reads bridge newTestamentEcho', () => {
    const modules = [
      {
        type: 'bridge',
        ancientTruth: 'Hosea speaks in the last decades.',
        modernApplication: 'The situation is not collapse.',
        connectionPoint: 'Most people live here.',
        newTestamentEcho: 'Paul carries the field logic into the churches.',
      } as unknown as Module,
    ]
    expect(spoken(buildModuleSegments('T', modules))).toContain(
      'Paul carries the field logic',
    )
  })
})

describe('buildModuleSegments — never speaks anything twice', () => {
  it('does not read mirrored content and body as two blocks', () => {
    const prose =
      'By the time we reach the cave at Horeb, Elijah has already seen God act.'
    const modules = [
      { type: 'teaching', content: prose, body: prose } as unknown as Module,
    ]
    const segments = buildModuleSegments('T', modules)
    const occurrences = segments.filter((s) =>
      s.text.includes('cave at Horeb'),
    ).length
    expect(occurrences).toBe(1)
  })

  it('drops a pull quote that repeats body prose', () => {
    const quote = 'A person can be entirely correct about the locks.'
    const modules = [
      { type: 'teaching', content: `${quote}` } as unknown as Module,
      { type: 'pullquote', quote } as unknown as Module,
    ]
    const segments = buildModuleSegments('T', modules)
    expect(
      segments.filter((s) => s.text.includes('correct about the locks')),
    ).toHaveLength(1)
  })
})

describe('buildModuleSegments — vocab and glyphs', () => {
  it('speaks the headword before the definition', () => {
    const modules = [
      {
        type: 'vocab',
        language: 'greek',
        word: 'ἀσφάλεια',
        transliteration: 'asphaleia',
        definition: 'safety, security, certainty',
        usageNote: 'Luke uses it of the certainty of the account.',
      } as unknown as Module,
    ]
    const segments = buildModuleSegments('T', modules)
    // segments[0] is the title; the headword must lead the module itself.
    expect(segments[1].text).toBe('The Greek word asphaleia')
    const text = spoken(segments)
    expect(text).toContain('safety, security, certainty')
    expect(text).toContain('certainty of the account')
  })

  it('never emits Hebrew or Greek glyphs', () => {
    const modules = [
      {
        type: 'vocab',
        language: 'hebrew',
        word: 'דֶּרֶךְ',
        transliteration: 'derek',
        definition: 'a way, road, path',
        usage:
          'Hosea 10:13 has it with a suffix — בְדַרכְּךָ (vedarkekha), "in your way".',
      } as unknown as Module,
    ]
    const text = spoken(buildModuleSegments('T', modules))
    expect(text).not.toMatch(/[֐-׿Ͱ-Ͽ]/)
    expect(text).toContain('vedarkekha')
  })
})

describe('buildModuleSegments — navigation is not read', () => {
  it('skips video, cta and resource modules', () => {
    const modules = [
      {
        type: 'video',
        videoTitle: 'Book of Hosea Summary',
        videoCaption: 'Seven minutes on the whole book.',
      } as unknown as Module,
      {
        type: 'cta',
        ctaLabel: 'DEEP DIVE',
        ctaSubtext: 'That can be the whole of today.',
      } as unknown as Module,
      {
        type: 'resource',
        forDeeperStudy: 'Read Hosea 10 whole, then Hosea 8:7.',
      } as unknown as Module,
      {
        type: 'teaching',
        content: 'The only thing that should be read.',
      } as unknown as Module,
    ]
    const segments = buildModuleSegments('T', modules)
    expect(segments).toHaveLength(2) // title + the teaching block
    expect(spoken(segments)).toContain('only thing that should be read')
  })
})

describe('Roman numerals in citations', () => {
  const read = (content: string) =>
    spoken(
      buildModuleSegments('T', [
        { type: 'teaching', content } as unknown as Module,
      ]),
    )

  it('expands a numeral after a cue word', () => {
    expect(
      read('The Problem of Pain (1940), chapter VIII, is where he says it.'),
    ).toContain('chapter eight')
    expect(
      read(
        'Calvin, Institutes, book II, chapter XVI, states the case plainly.',
      ),
    ).toContain('book two, chapter sixteen')
  })

  it('never touches the pronoun I or ordinary capitals', () => {
    const text =
      'I went to the city and I saw it there, a MIX of things I did not expect.'
    expect(read(text)).toContain(text)
  })
})

describe('expandReference', () => {
  it('expands book ordinals, chapters and verse ranges', () => {
    expect(expandReference('1 Thessalonians 5:2-3')).toBe(
      'First Thessalonians, chapter five, verses two to three',
    )
    expect(expandReference('Hosea 10:12-13')).toBe(
      'Hosea, chapter ten, verses twelve to thirteen',
    )
    expect(expandReference('John 3:16')).toBe(
      'John, chapter three, verse sixteen',
    )
    expect(expandReference('2 Timothy 2:13')).toBe(
      'Second Timothy, chapter two, verse thirteen',
    )
  })

  it('says "Psalm twenty-three", not "Psalm, chapter twenty-three"', () => {
    expect(expandReference('Psalm 23')).toBe('Psalm twenty-three')
  })

  it('carries the book name across a compound reference', () => {
    expect(expandReference('Job 1:1, 20-22; 2:10')).toBe(
      'Job, chapter one, verse one; verses twenty to twenty-two; chapter two, verse ten',
    )
  })

  it('is applied to the scripture reference field', () => {
    const modules = [
      {
        type: 'scripture',
        reference: '1 Thessalonians 5:2-3',
        passage:
          'For you are fully aware that the Day of the Lord will come like a thief.',
      } as unknown as Module,
    ]
    expect(spoken(buildModuleSegments('T', modules))).toContain(
      'First Thessalonians, chapter five, verses two to three',
    )
  })
})
