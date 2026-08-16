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

describe('multi-verse mixed passages (the common Gospel shape)', () => {
  const JOHN_6 = `When they found him on the other side of the lake, they asked him, 'Rabbi, when did you get here?' Jesus answered, 'Very truly I tell you, you are looking for me, not because you saw the signs I performed but because you ate the loaves and had your fill. Do not work for food that spoils, but for food that endures to eternal life, which the Son of Man will give you. For on him God the Father has placed his seal of approval.' Then they asked him, 'What must we do to do the works God requires?' Jesus answered, 'The work of God is this: to believe in the one he has sent.'`

  it('marks only the quotations attributed to Jesus', () => {
    const spans = resolveRedLetter('John 6:25-29', JOHN_6)
    expect(spans).toHaveLength(2)
    expect(spans[0]).toContain('Very truly I tell you')
    expect(spans[1]).toContain('The work of God is this')
    // The crowd keeps its own questions.
    expect(spans.join(' ')).not.toContain('Rabbi, when did you get here')
    expect(spans.join(' ')).not.toContain('What must we do')
  })

  it('skips when the passage disagrees with the expected count', () => {
    // One of His two speeches removed: counts no longer agree, so nothing is
    // marked rather than half-marked.
    const truncated = JOHN_6.slice(0, JOHN_6.indexOf('Then they asked him'))
    const spans = resolveRedLetter('John 6:25-29', truncated)
    expect(spans.some((s) => s.includes('Rabbi, when did you get here'))).toBe(false)
  })
})

describe('comprehensive attribution (founder: "if it literally says jesus said")', () => {
  it('an explicit "Jesus said" is decisive on its own', () => {
    const p = `Jesus said to them, 'Very truly I tell you, it is not Moses who has given you the bread from heaven, but it is my Father who gives you the true bread from heaven.'`
    expect(resolveRedLetter('John 6:32-33', p)[0]).toContain('Very truly I tell you')
  })

  it('"Then Jesus declared," is decisive', () => {
    const p = `Then Jesus declared, 'I am the bread of life. Whoever comes to me will never go hungry.'`
    expect(resolveRedLetter('John 6:35', p)[0]).toContain('I am the bread of life')
  })

  it('resolves a bare "he said" when nobody else is named', () => {
    const p = `Then he said to Thomas, "Put your finger here; see my hands. Stop doubting and believe."`
    expect(resolveRedLetter('John 20:27', p)[0]).toContain('Put your finger here')
  })

  it('reddens an unquoted saying spanning a range', () => {
    const p = `I am the resurrection and the life. The one who believes in me will live, even though they die; and whoever lives by believing in me will never die.`
    expect(resolveRedLetter('John 11:25-26', p)).toEqual([p])
  })

  it('NEVER attributes to Jesus when he is the OBJECT of the clause', () => {
    // "said to Jesus" is somebody speaking TO him. An earlier draft matched
    // /Jesus…said/ loosely and would have reddened the crowd here.
    const p = `The crowd said to Jesus, 'What sign then will you give?' Jesus answered, 'I am the bread of life.'`
    const spans = resolveRedLetter('John 6:30-35', p)
    expect(spans.some((s) => s.includes('What sign then will you give'))).toBe(false)
    expect(spans.some((s) => s.includes('I am the bread of life'))).toBe(true)
  })

  it('keeps explicit attributions even when another quote is unattributable', () => {
    const p = `A voice came from somewhere. 'Who can say?' Jesus answered, 'I am the way and the truth and the life.'`
    const spans = resolveRedLetter('John 14:5-6', p)
    expect(spans.some((s) => s.includes('I am the way'))).toBe(true)
    expect(spans.some((s) => s.includes('Who can say'))).toBe(false)
  })
})
