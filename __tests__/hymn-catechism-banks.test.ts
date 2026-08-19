/**
 * The Hymnal + Catechism Corner banks (SA-094 / F-140).
 *
 * The hymn floor is 30 and every year must be <= 1928 (US public domain);
 * the extraction script enforces provenance, this test enforces shape and
 * the no-repeat window. The catechism floor is 30 (a monthly cycle).
 */
import { describe, expect, it } from 'vitest'
import { HYMNS, pickHymnForDay } from '@/data/hymn-bank'
import { CATECHISM, pickCatechismForDay } from '@/data/catechism-bank'
import { parseReference } from '@/lib/bible/parseReference'

const D = (offset: number) =>
  new Date(Date.UTC(2026, 7, 19) + offset * 86_400_000)

describe('the hymnal bank', () => {
  it('meets the floor with unique public-domain hymns', () => {
    expect(HYMNS.length).toBeGreaterThanOrEqual(30)
    expect(new Set(HYMNS.map((h) => h.title)).size).toBe(HYMNS.length)
    for (const h of HYMNS) {
      expect(h.year).toBeLessThanOrEqual(1928)
      expect(h.author.length).toBeGreaterThan(2)
      expect(h.verses.length).toBeGreaterThanOrEqual(1)
      for (const v of h.verses) {
        expect(v.length).toBeGreaterThanOrEqual(2)
        for (const line of v) expect(line.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('picks deterministically with no repeat inside 30 days', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 30; i++) {
      const a = pickHymnForDay(D(i))
      const b = pickHymnForDay(D(i))
      expect(a).toEqual(b)
      seen.add(a.title)
    }
    expect(seen.size).toBe(30)
  })
})

describe('the catechism bank', () => {
  it('meets the floor with real Heidelberg numbers and parseable proofs', () => {
    expect(CATECHISM.length).toBeGreaterThanOrEqual(30)
    const nums = CATECHISM.map((c) => c.number)
    expect(new Set(nums).size).toBe(nums.length)
    for (const c of CATECHISM) {
      expect(c.number).toBeGreaterThanOrEqual(1)
      expect(c.number).toBeLessThanOrEqual(129)
      // Q5 ("No. I have a natural tendency…") and the repentance trio are
      // genuinely terse in the received text — the floor guards against
      // truncation, not against the catechism's own brevity.
      expect(c.answer.length).toBeGreaterThan(40)
      expect(c.source).toContain('Heidelberg')
      for (const ref of c.scriptures) {
        expect(parseReference(ref), ref).not.toBeNull()
      }
    }
  })

  it('picks deterministically with no repeat inside 30 days', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 30; i++) {
      const a = pickCatechismForDay(D(i))
      expect(a).toEqual(pickCatechismForDay(D(i)))
      seen.add(a.number)
    }
    expect(seen.size).toBe(30)
  })
})
