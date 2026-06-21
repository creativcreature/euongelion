import { describe, expect, it } from 'vitest'
import { injectWordNoteMarkers } from '@/lib/soul-audit/grounded-weave'
import { hasWordNote } from '@/lib/wordnote'
import type { WordStudy } from '@/lib/soul-audit/lexicon'

// Regression: the grounded weave must EMIT inline {{wn:id|surface}} WordNote
// markers for key original-language terms — but ONLY referencing real bank ids,
// and only where the surface word actually appears. This is the anti-fabrication
// guarantee: markers are injected deterministically (never by the model) and
// every id must resolve to a verbatim lexicon-grounded bank entry.

// shalom is a real bank entry (H7965, English term "peace").
const shalomStudy: WordStudy = {
  word: 'שָׁלוֹם',
  xlit: 'shâlôwm',
  strong: 'H7965',
  gloss: 'completeness; peace; safety; health; prosperity; quiet',
  source: "Brown-Driver-Briggs (Strong's H7965)",
}

// charis is a real bank entry (G5485, English term "grace").
const charisStudy: WordStudy = {
  word: 'χάρις',
  xlit: 'cháris',
  strong: 'G5485',
  gloss: 'grace; graciousness; kindness; favour',
  source: "Abbott-Smith Manual Greek Lexicon (Strong's G5485)",
}

// A Strong's number that is NOT in the WordNote bank.
const unbankedStudy: WordStudy = {
  word: 'דָּכָא',
  xlit: 'dakka',
  strong: 'H1854',
  gloss: 'to crush; be crushed; be contrite',
  source: "Brown-Driver-Briggs (Strong's H1854)",
}

describe('injectWordNoteMarkers (grounded weave emission)', () => {
  it('emits a marker for a bank-backed study whose English term appears in prose', () => {
    const body = 'He gives peace to the weary and rest to the anxious heart.'
    const { body: out, emittedIds } = injectWordNoteMarkers(body, [shalomStudy])
    expect(out).toContain('{{wn:shalom|peace}}')
    expect(emittedIds).toEqual(['shalom'])
  })

  it('emits NO marker when the verse has no bank entry (plain text stands)', () => {
    const body = 'The contrite are not crushed beyond what God will restore.'
    const { body: out, emittedIds } = injectWordNoteMarkers(body, [
      unbankedStudy,
    ])
    expect(out).toBe(body)
    expect(out).not.toContain('{{wn:')
    expect(emittedIds).toEqual([])
  })

  it('emits NO marker when the surface term does not appear in the prose', () => {
    // shalom is bank-backed, but the word "peace" never appears here.
    const body = 'The reading turns the heart toward rest and quiet trust.'
    const { body: out, emittedIds } = injectWordNoteMarkers(body, [shalomStudy])
    expect(out).toBe(body)
    expect(emittedIds).toEqual([])
  })

  it('never alters the verbatim Scripture blockquote', () => {
    const body = [
      '> Great peace have those who love your law. (Psalm 119:165)',
      '',
      'That word, peace, is no mere absence of conflict.',
    ].join('\n')
    const { body: out } = injectWordNoteMarkers(body, [shalomStudy])
    // The blockquote line is untouched...
    expect(out).toContain(
      '> Great peace have those who love your law. (Psalm 119:165)',
    )
    // ...and the marker lands only in the exposition line.
    expect(out).toContain('That word, {{wn:shalom|peace}}, is no mere')
  })

  it('marks each bank-backed term at most once and only once per id', () => {
    const body = 'Peace, and again peace — the peace that guards the heart.'
    const { body: out, emittedIds } = injectWordNoteMarkers(body, [shalomStudy])
    const count = (out.match(/\{\{wn:shalom\|/g) || []).length
    expect(count).toBe(1)
    expect(emittedIds).toEqual(['shalom'])
  })

  it('every emitted id resolves to a real bank entry (zero fabrication)', () => {
    const body =
      'By grace you are held, and the peace of God keeps watch over you.'
    const { emittedIds } = injectWordNoteMarkers(body, [
      shalomStudy,
      charisStudy,
      unbankedStudy,
    ])
    expect(emittedIds.length).toBeGreaterThan(0)
    for (const id of emittedIds) {
      expect(hasWordNote(id)).toBe(true)
    }
    // The unbanked study contributes no id.
    expect(emittedIds).not.toContain('H1854')
  })

  it('is a no-op for empty body or empty studies', () => {
    expect(injectWordNoteMarkers('', [shalomStudy])).toEqual({
      body: '',
      emittedIds: [],
    })
    expect(injectWordNoteMarkers('Some prose.', [])).toEqual({
      body: 'Some prose.',
      emittedIds: [],
    })
  })

  it('falls back to a homograph-safe bank term in the prose when verse studies miss the bank', () => {
    const body = 'Even here, grace meets you before you could ever earn it.'
    const { body: out, emittedIds } = injectWordNoteMarkers(body, [
      unbankedStudy,
    ])
    expect(emittedIds).toContain('charis')
    expect(out).toContain('{{wn:charis|grace}}')
  })

  it('does NOT fall back on generic homographs like "word" or "light"', () => {
    const body = 'In a single word, light fell across the open page.'
    const { emittedIds } = injectWordNoteMarkers(body, [unbankedStudy])
    expect(emittedIds).toEqual([])
  })
})
