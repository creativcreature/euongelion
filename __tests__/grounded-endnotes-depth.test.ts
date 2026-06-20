import { describe, expect, it } from 'vitest'
import {
  buildStructuredEndnotes,
  checkDepth,
} from '@/lib/soul-audit/grounded-weave'
import type { WordStudy } from '@/lib/soul-audit/lexicon'

// Regression coverage for the Devotional Engine depth pass:
//   - F-027: structured source endnotes — every endnote ties to a REAL grounded
//     source (verbatim Scripture + the historic-voice quotes ACTUALLY woven in +
//     real lexicon studies). A retrieved-but-unused voice is never falsely cited.
//   - F-028: length/depth + narrative-coherence gate — a thin or structurally
//     incomplete day surfaces issues (which the runner uses to FAIL verification
//     and re-roll), never silently shipping or padding.

const shabarStudy: WordStudy = {
  word: 'שָׁבַר',
  xlit: 'shabar',
  strong: 'H7665',
  gloss: 'to break, break in pieces',
  source: "Brown-Driver-Briggs (Strong's H7665)",
}

const dakaStudy: WordStudy = {
  word: 'דַּכָּא',
  xlit: 'dakka',
  strong: 'H1794',
  gloss: 'crushed, contrite',
  source: "Brown-Driver-Briggs (Strong's H1794)",
}

// ── F-027: structured endnotes ────────────────────────────────────────

describe('buildStructuredEndnotes (F-027 — grounded, classified, no fabrication)', () => {
  const sources = [
    {
      source: 'Thomas à Kempis, Imitation Of Christ',
      content:
        'It is vanity to mind this present life and not to look forward to those things which are to come.',
    },
    {
      source: 'Blaise Pascal, Pensees',
      content:
        'All of humanity’s problems stem from man’s inability to sit quietly in a room alone.',
    },
  ]

  it('always records the anchor Scripture as a [1] scripture endnote', () => {
    const endnotes = buildStructuredEndnotes({
      body: 'A reading with no historic voice woven in at all.',
      scriptureReference: 'Psalm 34:18',
      translation: 'BSB',
      sources,
      studies: [],
    })
    expect(endnotes[0]).toMatchObject({
      id: 1,
      kind: 'scripture',
      reference: 'Psalm 34:18',
    })
    expect(endnotes[0].source).toContain('Psalm 34:18')
    expect(endnotes[0].source).toContain('BSB')
  })

  it('only attributes a voice that is ACTUALLY woven into the body', () => {
    // Only Kempis is named in the prose; Pascal was retrieved but NOT used.
    const body = [
      'The heart breaks open. As Thomas à Kempis wrote, "It is vanity to',
      'mind this present life," and so we turn instead to God who is near.',
    ].join('\n')
    const endnotes = buildStructuredEndnotes({
      body,
      scriptureReference: 'Psalm 34:18',
      translation: 'BSB',
      sources,
      studies: [],
    })
    const voiceNotes = endnotes.filter((e) => e.kind === 'voice')
    expect(voiceNotes).toHaveLength(1)
    expect(voiceNotes[0].source).toBe('Thomas à Kempis, Imitation Of Christ')
    // The unused Pascal source is never cited — no invented/unused attribution.
    expect(endnotes.some((e) => e.source.includes('Pascal'))).toBe(false)
  })

  it('records every real lexicon study as a classified lexicon endnote', () => {
    const endnotes = buildStructuredEndnotes({
      body: 'A short body that names no voices.',
      scriptureReference: 'Psalm 34:18',
      translation: 'BSB',
      sources: [],
      studies: [shabarStudy, dakaStudy],
    })
    const lexNotes = endnotes.filter((e) => e.kind === 'lexicon')
    expect(lexNotes).toHaveLength(2)
    expect(lexNotes[0].source).toBe("Brown-Driver-Briggs (Strong's H7665)")
    expect(lexNotes[0].reference).toBe('H7665')
    expect(lexNotes[0].note).toContain('shabar')
    // The gloss text is verbatim from the lexicon entry.
    expect(lexNotes[0].note).toContain('to break, break in pieces')
  })

  it('de-dupes a voice that appears across multiple retrieved chunks', () => {
    const dupSources = [
      sources[0],
      {
        source: 'Thomas à Kempis, Imitation Of Christ',
        content: 'Another chunk from the same work and author.',
      },
    ]
    const body = 'As Thomas à Kempis taught, the soul learns humility.'
    const endnotes = buildStructuredEndnotes({
      body,
      scriptureReference: 'Psalm 34:18',
      translation: 'BSB',
      sources: dupSources,
      studies: [],
    })
    const kempis = endnotes.filter((e) => e.source.includes('Kempis'))
    expect(kempis).toHaveLength(1)
  })

  it('assigns sequential ids and never emits an endnote without a source', () => {
    const body = 'As Thomas à Kempis and Blaise Pascal both observed, we wait.'
    const endnotes = buildStructuredEndnotes({
      body,
      scriptureReference: 'Psalm 34:18',
      translation: 'BSB',
      sources,
      studies: [shabarStudy],
    })
    endnotes.forEach((e, i) => {
      expect(e.id).toBe(i + 1)
      expect(e.source.trim().length).toBeGreaterThan(0)
    })
  })
})

// ── F-028: length / depth / coherence gate ────────────────────────────

describe('checkDepth (F-028 — fail-closed on thin / incomplete content)', () => {
  // A realistic, complete reading body (multi-paragraph + Scripture blockquote).
  function fullReading(extraWords = 600): string {
    const filler = Array(extraWords).fill('grace').join(' ')
    return [
      '> The LORD is near to the brokenhearted. (Psalm 34:18)',
      '',
      'When the heart breaks, God draws close rather than distant.',
      filler,
      '',
      'And so we are held — not by our strength but by his nearness.',
    ].join('\n')
  }

  const anchor = 'The LORD is near to the brokenhearted and saves the crushed.'

  it('passes a complete, sufficiently long reading', () => {
    const issues = checkDepth({
      body: fullReading(),
      prayer: 'Lord, draw near to me in my brokenness and hold me close. Amen.',
      mode: 'reading',
      scriptureText: anchor,
    })
    expect(issues).toEqual([])
  })

  it('flags a thin reading below the word floor', () => {
    const issues = checkDepth({
      body: [
        '> The LORD is near to the brokenhearted. (Psalm 34:18)',
        '',
        'He is near. We rest. Two short paragraphs only.',
        '',
        'That is all there is to say here today, sadly.',
      ].join('\n'),
      prayer: 'Lord, be near. Amen.',
      mode: 'reading',
      scriptureText: anchor,
    })
    expect(issues.some((i) => i.includes('thin generation'))).toBe(true)
  })

  it('flags a reading missing the verbatim Scripture blockquote', () => {
    const issues = checkDepth({
      body: [
        'The LORD is near, but this version never quotes it as a blockquote.',
        Array(600).fill('grace').join(' '),
        '',
        'It just keeps going in plain prose without the anchor quote.',
      ].join('\n'),
      prayer: 'Lord, draw near to me in my brokenness and hold me close. Amen.',
      mode: 'reading',
      scriptureText: anchor,
    })
    expect(
      issues.some((i) => i.includes('Scripture is not quoted verbatim')),
    ).toBe(true)
  })

  it('flags a reading missing the closing prayer', () => {
    const issues = checkDepth({
      body: fullReading(),
      prayer: 'Amen.',
      mode: 'reading',
      scriptureText: anchor,
    })
    expect(issues.some((i) => i.includes('closing prayer'))).toBe(true)
  })

  it('flags an incoherent single-block reading', () => {
    const issues = checkDepth({
      body: '> The LORD is near to the brokenhearted. (Psalm 34:18)',
      prayer: 'Lord, draw near to me in my brokenness and hold me close. Amen.',
      mode: 'reading',
      scriptureText: anchor,
    })
    expect(issues.some((i) => i.includes('incoherent structure'))).toBe(true)
  })

  it('flags a thin deep dive lacking section headings', () => {
    const issues = checkDepth({
      body: [
        'A deep dive that is far too short and has no section headings at all.',
        '',
        'Only two small paragraphs of plain prose here.',
      ].join('\n'),
      prayer: '',
      mode: 'deepdive',
      scriptureText: anchor,
    })
    expect(issues.some((i) => i.includes('thin deep dive'))).toBe(true)
    expect(issues.some((i) => i.includes('section heading'))).toBe(true)
  })

  it('passes a long, well-structured deep dive', () => {
    const filler = Array(1900).fill('grace').join(' ')
    const issues = checkDepth({
      body: [
        '## Peshat — the plain sense',
        'The passage opens with the nearness of God to the broken.',
        filler,
        '',
        '## Remez — the hint',
        'Beneath the surface, a deeper pattern emerges.',
        '',
        '## Sod — the mystery',
        'And here the Christ-centered fulfillment is woven in.',
      ].join('\n'),
      // deep dive does not require a prayer
      prayer: '',
      mode: 'deepdive',
      scriptureText: anchor,
    })
    expect(issues).toEqual([])
  })
})
