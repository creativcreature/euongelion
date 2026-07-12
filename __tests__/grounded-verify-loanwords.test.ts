import { describe, expect, it } from 'vitest'
import { verify } from '@/lib/soul-audit/grounded-weave'

/**
 * Founder ruling 2026-07-12: generation must never fail because the
 * model used an ordinary English loanword with diacritics ("naïveté"
 * produced a real user-visible failure). The transliteration check
 * keeps flagging fabricated scholarly transliterations while clearing
 * dictionary English.
 */

const base = {
  scriptureText: 'Come to me, all you who are weary and burdened.',
  allowedAuthors: new Set<string>(),
  studies: [],
  groundingText:
    'Come to me, all you who are weary and burdened. Matthew Henry writes of rest.',
}

describe('verify — transliteration precision', () => {
  it('clears common English loanwords with diacritics', () => {
    const result = verify({
      ...base,
      body: 'Our naïveté about rest — the café pace of modern life, the façade we maintain, our résumé of busyness, a cliché of hurry, déjà vu of exhaustion — meets the Noël promise of Emmanuel.',
    })
    expect(result.issues).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('still flags a fabricated scholarly transliteration', () => {
    const result = verify({
      ...base,
      body: 'The Hebrew word shâlach-tôv means holy sending, and the Greek katápausis-lógos teaches rest.',
    })
    expect(result.ok).toBe(false)
    expect(
      result.issues.some((issue) =>
        issue.includes('possibly-ungrounded transliteration'),
      ),
    ).toBe(true)
  })

  it('clears a transliteration that IS in the provided word studies', () => {
    const result = verify({
      ...base,
      studies: [
        {
          word: 'שָׁבַר',
          xlit: 'shâbar',
          gloss: 'to break',
        } as never,
      ],
      body: 'The word shâbar speaks of breaking.',
    })
    expect(result.ok).toBe(true)
  })

  it('clears diacritic tokens present in the grounding text (source titles)', () => {
    const result = verify({
      ...base,
      allowedAuthors: new Set(['pascal']),
      groundingText: base.groundingText + ' From Pascal, Pensées, on rest.',
      body: 'As Pascal wrote in Pensées, the heart has its reasons.',
    })
    expect(result.ok).toBe(true)
  })

  it('still flags ungrounded historic-author citations', () => {
    const result = verify({
      ...base,
      body: 'As Spurgeon reminds us, rest is a gift.',
    })
    expect(result.ok).toBe(false)
    expect(
      result.issues.some((issue) => issue.includes('ungrounded author')),
    ).toBe(true)
  })
})
