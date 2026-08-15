/**
 * F-095 — attribution resolves at build/generation time, never by inference.
 */
import { describe, expect, it } from 'vitest'
import {
  resolveRedLetter,
  versesInReference,
  withRedLetter,
} from '@/lib/red-letter-resolve'

const LUKE_10 = `But when a Samaritan on a journey came upon him, he looked at him and had compassion. He went to him and bandaged his wounds, pouring on oil and wine. Then he put him on his own animal, brought him to an inn, and took care of him. … "Which of these three do you think was a neighbor to the man who fell into the hands of robbers?" "The one who showed him mercy," replied the expert in the law. Then Jesus told him, "Go and do likewise."`

describe('versesInReference', () => {
  it('expands a range', () => {
    expect(versesInReference('Luke 10:33-37')).toEqual([
      'Luke.10.33', 'Luke.10.34', 'Luke.10.35', 'Luke.10.36', 'Luke.10.37',
    ])
  })
  it('handles a single verse and ignores books with no attribution', () => {
    expect(versesInReference('John 3:16')).toEqual(['John.3.16'])
    expect(versesInReference('Psalm 27:4')).toEqual([])
    expect(versesInReference(undefined)).toEqual([])
  })
})

describe('resolveRedLetter', () => {
  it('marks Christ and excludes the other speaker in the same verse', () => {
    const spans = resolveRedLetter('Luke 10:33-37', LUKE_10)
    expect(spans.length).toBeGreaterThan(0)
    expect(spans.join(' ')).toContain('Go and do likewise.')
    expect(spans.join(' ')).toContain('Which of these three')
    // The expert in the law keeps his own words.
    expect(spans.some((s) => s.includes('The one who showed him mercy'))).toBe(false)
  })

  it('reddens a parable in full — the narration inside it is His speech', () => {
    const spans = resolveRedLetter('Luke 10:33-37', LUKE_10)
    expect(spans.some((s) => s.includes('bandaged his wounds'))).toBe(true)
  })

  it('returns nothing for a passage it cannot attribute', () => {
    // Right book, but wording from a translation we have no map for.
    expect(
      resolveRedLetter('Luke 10:37', 'And he said, Go thou therefore and act likewise.'),
    ).toEqual([])
    // Book with no attribution at all.
    expect(resolveRedLetter('Psalm 27:4', 'One thing have I desired of the Lord')).toEqual([])
    expect(resolveRedLetter('Luke 10:37', '')).toEqual([])
  })

  it('drops a span wholly contained in a longer one', () => {
    const spans = resolveRedLetter('Luke 10:33-37', LUKE_10)
    for (let i = 0; i < spans.length; i += 1) {
      for (let j = 0; j < spans.length; j += 1) {
        if (i !== j) expect(spans[i].includes(spans[j])).toBe(false)
      }
    }
  })
})

describe('withRedLetter', () => {
  it('attaches spans as a module is built', () => {
    const mod = withRedLetter<{
      reference: string
      passage: string
      redLetter?: string[]
    }>({ reference: 'Luke 10:33-37', passage: LUKE_10 })
    expect(mod.redLetter?.length).toBeGreaterThan(0)
  })

  it('never overwrites an author’s explicit attribution', () => {
    const mine = ['Go and do likewise.']
    const mod = withRedLetter({
      reference: 'Luke 10:33-37',
      passage: LUKE_10,
      redLetter: mine,
    })
    expect(mod.redLetter).toBe(mine)
  })

  it('leaves an unattributable module untouched', () => {
    const mod: { reference: string; passage: string; redLetter?: string[] } = {
      reference: 'Psalm 27:4',
      passage: 'One thing have I desired',
    }
    expect(withRedLetter(mod)).toEqual(mod)
  })

  it('reddens a whole-verse saying in ANY translation', () => {
    // Matthew 16:24 is a whole-verse span, so the wording does not matter.
    const niv =
      'Whoever wants to be my disciple must deny themselves and take up their cross and follow me.'
    const bsb =
      'If anyone wants to come after Me, he must deny himself and take up his cross and follow Me.'
    expect(resolveRedLetter('Matthew 16:24', niv)).toEqual([niv])
    expect(resolveRedLetter('Matthew 16:24', bsb)).toEqual([bsb])
  })
})
