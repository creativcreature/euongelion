import { describe, expect, it } from 'vitest'
import { retrieveReferenceHits } from '@/lib/soul-audit/reference-volumes'

describe('reference-volume grounding retrieval', () => {
  it('returns grounding hits for short user input plus scripture reference', () => {
    const hits = retrieveReferenceHits({
      userResponse: 'help me',
      scriptureReference: 'John 14:27',
      limit: 2,
    })

    expect(hits.length).toBeGreaterThan(0)
    expect(typeof hits[0]?.source).toBe('string')
    expect(typeof hits[0]?.excerpt).toBe('string')
  })

  it('returns a deterministic fallback hit even when lexical matches are weak', () => {
    const hits = retrieveReferenceHits({
      userResponse: 'zzz qqq vvv',
      scriptureReference: 'Habakkuk 2:4',
      limit: 1,
    })

    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]?.excerpt.length).toBeGreaterThan(0)
  })
})
