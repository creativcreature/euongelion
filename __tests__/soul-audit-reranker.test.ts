import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReferenceChunk } from '@/lib/soul-audit/reference-retriever'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  process.env = { ...ORIGINAL_ENV }
})

function makeChunk(id: string, text: string): ReferenceChunk {
  return {
    id,
    source: `s/${id}`,
    sourceType: 'commentary',
    title: `title-${id}`,
    content: text,
    contextualizedContent: text,
    contextualSummary: text.slice(0, 50),
    keywords: [],
    scriptureRefs: [],
    priority: 1,
    wordCount: text.split(/\s+/).length,
    normalized: text.toLowerCase(),
    contextualizedNormalized: text.toLowerCase(),
  }
}

const CHUNKS: ReferenceChunk[] = [
  makeChunk('a', 'first chunk about identity and image of God'),
  makeChunk('b', 'second chunk about peace and rest'),
  makeChunk('c', 'third chunk about prayer and stillness'),
]

function mockCohereOnce(json: Record<string, unknown>, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok,
      status: ok ? 200 : 500,
      headers: new Headers(),
      text: async () => '',
      json: async () => json,
    })) as unknown as typeof fetch,
  )
}

describe('rerankerEnabled', () => {
  it('returns false when env flag is not set', async () => {
    delete process.env.SOUL_AUDIT_RERANKER_ENABLED
    process.env.COHERE_API_KEY = 'k'
    const { rerankerEnabled } = await import('@/lib/soul-audit/reranker')
    expect(rerankerEnabled()).toBe(false)
  })

  it('returns false when API key is missing', async () => {
    process.env.SOUL_AUDIT_RERANKER_ENABLED = 'on'
    delete process.env.COHERE_API_KEY
    const { rerankerEnabled } = await import('@/lib/soul-audit/reranker')
    expect(rerankerEnabled()).toBe(false)
  })

  it('returns true only with both env on AND API key set', async () => {
    process.env.SOUL_AUDIT_RERANKER_ENABLED = 'on'
    process.env.COHERE_API_KEY = 'k'
    const { rerankerEnabled } = await import('@/lib/soul-audit/reranker')
    expect(rerankerEnabled()).toBe(true)
  })
})

describe('rerankChunks', () => {
  it('returns chunks unchanged when feature flag is off', async () => {
    delete process.env.SOUL_AUDIT_RERANKER_ENABLED
    const { rerankChunks } = await import('@/lib/soul-audit/reranker')
    const result = await rerankChunks({ query: 'q', chunks: CHUNKS, topN: 2 })
    expect(result.applied).toBe(false)
    expect(result.reason).toBe('disabled')
    expect(result.chunks).toEqual(CHUNKS)
  })

  it('returns chunks unchanged when API key is missing', async () => {
    process.env.SOUL_AUDIT_RERANKER_ENABLED = 'on'
    delete process.env.COHERE_API_KEY
    const { rerankChunks } = await import('@/lib/soul-audit/reranker')
    const result = await rerankChunks({ query: 'q', chunks: CHUNKS })
    expect(result.applied).toBe(false)
    expect(result.reason).toBe('no-key')
  })

  it('returns empty result when chunks list is empty', async () => {
    process.env.SOUL_AUDIT_RERANKER_ENABLED = 'on'
    process.env.COHERE_API_KEY = 'k'
    const { rerankChunks } = await import('@/lib/soul-audit/reranker')
    const result = await rerankChunks({ query: 'q', chunks: [] })
    expect(result.applied).toBe(false)
    expect(result.reason).toBe('empty')
    expect(result.chunks).toEqual([])
  })

  it('reorders chunks by Cohere relevance score', async () => {
    process.env.SOUL_AUDIT_RERANKER_ENABLED = 'on'
    process.env.COHERE_API_KEY = 'k'
    // Cohere returns indices sorted by relevance descending. Pretend
    // chunk 'c' is most relevant, then 'a', then 'b'.
    mockCohereOnce({
      results: [
        { index: 2, relevance_score: 0.9 },
        { index: 0, relevance_score: 0.7 },
        { index: 1, relevance_score: 0.3 },
      ],
    })
    const { rerankChunks } = await import('@/lib/soul-audit/reranker')
    const result = await rerankChunks({ query: 'q', chunks: CHUNKS })
    expect(result.applied).toBe(true)
    expect(result.chunks.map((c) => c.id)).toEqual(['c', 'a', 'b'])
  })

  it('truncates to topN when topN < chunks.length', async () => {
    process.env.SOUL_AUDIT_RERANKER_ENABLED = 'on'
    process.env.COHERE_API_KEY = 'k'
    mockCohereOnce({
      results: [
        { index: 1, relevance_score: 0.9 },
        { index: 2, relevance_score: 0.5 },
        { index: 0, relevance_score: 0.1 },
      ],
    })
    const { rerankChunks } = await import('@/lib/soul-audit/reranker')
    const result = await rerankChunks({ query: 'q', chunks: CHUNKS, topN: 2 })
    expect(result.applied).toBe(true)
    expect(result.chunks).toHaveLength(2)
    expect(result.chunks.map((c) => c.id)).toEqual(['b', 'c'])
  })

  it('returns chunks unchanged on Cohere 5xx (degrades gracefully)', async () => {
    process.env.SOUL_AUDIT_RERANKER_ENABLED = 'on'
    process.env.COHERE_API_KEY = 'k'
    mockCohereOnce({}, false)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerankChunks } = await import('@/lib/soul-audit/reranker')
    const result = await rerankChunks({ query: 'q', chunks: CHUNKS })
    expect(result.applied).toBe(false)
    expect(result.reason).toBe('error')
    expect(result.chunks).toEqual(CHUNKS)
    errorSpy.mockRestore()
  })

  it('returns chunks unchanged on network failure', async () => {
    process.env.SOUL_AUDIT_RERANKER_ENABLED = 'on'
    process.env.COHERE_API_KEY = 'k'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNRESET')
      }) as unknown as typeof fetch,
    )
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerankChunks } = await import('@/lib/soul-audit/reranker')
    const result = await rerankChunks({ query: 'q', chunks: CHUNKS })
    expect(result.applied).toBe(false)
    expect(result.reason).toBe('error')
    expect(result.chunks).toEqual(CHUNKS)
    errorSpy.mockRestore()
  })

  it('returns chunks unchanged when Cohere returns no results', async () => {
    process.env.SOUL_AUDIT_RERANKER_ENABLED = 'on'
    process.env.COHERE_API_KEY = 'k'
    mockCohereOnce({ results: [] })
    const { rerankChunks } = await import('@/lib/soul-audit/reranker')
    const result = await rerankChunks({ query: 'q', chunks: CHUNKS })
    expect(result.applied).toBe(false)
    expect(result.reason).toBe('error')
  })
})
