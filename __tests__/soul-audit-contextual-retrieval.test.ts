import { describe, expect, it } from 'vitest'
import { retrieveForDay } from '@/lib/soul-audit/reference-retriever'

describe('Soul Audit contextual retrieval', () => {
  it('returns grounded chunks for a sparse emotional input', () => {
    const result = retrieveForDay({
      themes: ['sadness'],
      scriptureAnchors: ['Psalm 34:18'],
      topic: 'I am sad and I need hope',
      limit: 20,
      chiasticPosition: 'A',
      pardesLevel: 'peshat',
    })

    expect(result.chunks.length).toBeGreaterThanOrEqual(15)
    expect(
      result.chunks.every(
        (chunk) =>
          typeof chunk.contextualSummary === 'string' &&
          chunk.contextualSummary.length > 0,
      ),
    ).toBe(true)
  })

  it('returns materially different top chunks for distinct asks', () => {
    const prophets = retrieveForDay({
      themes: ['prophets'],
      scriptureAnchors: ['Jeremiah 1:5'],
      topic: 'Teach me about the prophets',
      limit: 20,
      chiasticPosition: 'A',
      pardesLevel: 'peshat',
    })

    const anxiety = retrieveForDay({
      themes: ['anxiety'],
      scriptureAnchors: ['Philippians 4:6-7'],
      topic: 'I feel anxious about my future',
      limit: 20,
      chiasticPosition: 'A',
      pardesLevel: 'peshat',
    })

    expect(prophets.chunks.length).toBeGreaterThanOrEqual(15)
    expect(anxiety.chunks.length).toBeGreaterThanOrEqual(15)

    const prophetsTop = prophets.chunks.slice(0, 10).map((chunk) => chunk.id)
    const anxietyTop = anxiety.chunks.slice(0, 10).map((chunk) => chunk.id)
    const overlap = prophetsTop.filter((id) => anxietyTop.includes(id)).length

    // Distinct asks should not collapse to a near-identical retrieval set.
    expect(overlap).toBeLessThan(8)
  })
})
