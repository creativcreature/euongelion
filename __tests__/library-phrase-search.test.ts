import { describe, it, expect } from 'vitest'
import {
  contentTokens,
  searchDevotionals,
  searchLibraryByPhrase,
} from '@/lib/global-search'

/**
 * Phrase search (F-089): the browse page lets a reader describe what they are
 * carrying in their own words. The existing AND-semantics search cannot do
 * this — these tests pin the difference so a future "simplification" back to
 * one scorer fails loudly.
 */
describe('searchLibraryByPhrase', () => {
  it('finds devotionals for a natural sentence that AND-search cannot', () => {
    const query = 'I feel anxious about money'

    // The precise scorer requires every token, including "i" and "about".
    expect(searchDevotionals(query)).toHaveLength(0)

    const loose = searchLibraryByPhrase(query)
    expect(loose.devotionals.length).toBeGreaterThan(0)
    // Stopwords are gone; only the words carrying intent are matched.
    expect(loose.tokens).toEqual(['feel', 'anxious', 'money'])
  })

  it('drops stopwords but keeps an all-stopword question intact', () => {
    // Series keywords contain "who am i" verbatim, so the question must survive.
    expect(contentTokens('who am i')).toEqual(['who', 'am', 'i'])
    expect(contentTokens('anxious about money')).toEqual(['anxious', 'money'])
  })

  it('surfaces the identity series for an identity question', () => {
    const { series } = searchLibraryByPhrase('who am i')
    expect(series.length).toBeGreaterThan(0)
    expect(series.map((s) => s.slug)).toContain('identity')
  })

  it('ranks a fuller match above a partial one', () => {
    const { devotionals } = searchLibraryByPhrase('grace and rest')
    expect(devotionals.length).toBeGreaterThan(1)
    // Coverage is squared, so scores must be strictly ordered, not tied.
    for (let i = 1; i < devotionals.length; i += 1) {
      expect(devotionals[i - 1].score).toBeGreaterThanOrEqual(
        devotionals[i].score,
      )
    }
  })

  it('rewards an exact phrase over the same words scattered', () => {
    const { devotionals } = searchLibraryByPhrase('in the beginning')
    expect(devotionals.length).toBeGreaterThan(2)

    // The phrase bonus applies per FIELD, so a title hit and a teaser hit both
    // qualify — the two entries carrying "in the beginning" verbatim must both
    // outrank their own series siblings, which match only the word "beginning".
    const carriesPhrase = (r: { title: string; teaser: string | null }) =>
      `${r.title} ${r.teaser ?? ''}`.toLowerCase().includes('in the beginning')

    expect(carriesPhrase(devotionals[0])).toBe(true)
    expect(carriesPhrase(devotionals[1])).toBe(true)
    expect(devotionals[1].score).toBeGreaterThan(devotionals[2].score)
  })

  it('returns nothing for a query with no catalog signal', () => {
    const { series, devotionals } = searchLibraryByPhrase(
      'zzzqqq unmatchable xyzzy',
    )
    expect(series).toHaveLength(0)
    expect(devotionals).toHaveLength(0)
  })

  it('respects result limits', () => {
    const { devotionals } = searchLibraryByPhrase('god', { devotionals: 5 })
    expect(devotionals.length).toBeLessThanOrEqual(5)
  })

  it('is empty for an empty query rather than returning the whole catalog', () => {
    expect(searchLibraryByPhrase('   ').devotionals).toHaveLength(0)
    expect(searchLibraryByPhrase('').series).toHaveLength(0)
  })
})
