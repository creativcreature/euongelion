/**
 * reranker.ts — Cohere Rerank-3.5 integration for the Soul Audit
 * RAG pipeline.
 *
 * Anthropic's contextual retrieval pipeline (Sept 2024) ends in a
 * cross-encoder rerank stage that cuts failure rate by ~67% per
 * Anthropic's own measurements. This module adds that stage between
 * BM25/RRF fusion and final composer input.
 *
 * Usage:
 *   const ranked = await rerankChunks({ query, chunks, topN: 8 })
 *
 * Behavior:
 *   - Returns the top N chunks by Cohere relevance score (default
 *     N = chunks.length, i.e. just reorder).
 *   - When the feature flag is off, returns chunks unchanged
 *     (no-op pass-through). Composer can call this unconditionally.
 *   - When Cohere returns an error, returns chunks unchanged + logs
 *     the error. Never throws — degrades to BM25-only quality.
 *
 * Feature-gated by env `SOUL_AUDIT_RERANKER_ENABLED=on` so we can
 * A/B and revert in one env-var flip if quality regresses.
 *
 * Cost: $2 per 1,000 search requests (1 search = 1 query + up to
 * 100 docs). At our typical 25 chunks/query and 1k audits/month,
 * spend is ~$2/mo. Documented in
 * `docs/copy-specs/morning-decisions-2026-05-06.html` Cohere card.
 *
 * No dep added — uses plain `fetch()` against the Cohere REST API.
 * Avoids bundle bloat from the official `cohere-ai` SDK.
 */

import type { ReferenceChunk } from './reference-retriever'

export const COHERE_RERANK_URL = 'https://api.cohere.com/v2/rerank'
export const DEFAULT_RERANK_MODEL = 'rerank-v3.5'

export interface RerankParams {
  query: string
  chunks: ReferenceChunk[]
  /** Number of top chunks to return. Defaults to chunks.length. */
  topN?: number
  /** Override the model — defaults to rerank-v3.5. */
  model?: string
  /** AbortSignal forwarded to fetch. */
  signal?: AbortSignal
}

export interface RerankResult {
  chunks: ReferenceChunk[]
  /** True when the reranker actually ran. False = pass-through. */
  applied: boolean
  /** Reason when applied=false: 'disabled' | 'no-key' | 'error' | 'empty'. */
  reason?: 'disabled' | 'no-key' | 'error' | 'empty'
}

/** True when env flag and API key are both configured. */
export function rerankerEnabled(): boolean {
  if (process.env.SOUL_AUDIT_RERANKER_ENABLED !== 'on') return false
  const key = process.env.COHERE_API_KEY
  return typeof key === 'string' && key.trim().length > 0
}

/**
 * Rerank a list of reference chunks using Cohere Rerank-3.5.
 *
 * Returns the chunks reordered by relevance + truncated to `topN`.
 * On any failure (feature disabled, no API key, network error,
 * Cohere 4xx/5xx), returns the input chunks unchanged so the
 * composer pipeline always has something to work with.
 */
export async function rerankChunks(
  params: RerankParams,
): Promise<RerankResult> {
  if (params.chunks.length === 0) {
    return { chunks: params.chunks, applied: false, reason: 'empty' }
  }

  if (process.env.SOUL_AUDIT_RERANKER_ENABLED !== 'on') {
    return { chunks: params.chunks, applied: false, reason: 'disabled' }
  }

  const apiKey = process.env.COHERE_API_KEY?.trim()
  if (!apiKey) {
    return { chunks: params.chunks, applied: false, reason: 'no-key' }
  }

  const model = params.model || DEFAULT_RERANK_MODEL
  const topN = params.topN ?? params.chunks.length

  // Cohere docs: documents can be a list of strings. We send the
  // contextualized content for best matching (it carries the same
  // contextual signals that BM25 ranks against).
  const documents = params.chunks.map((c) => c.contextualizedContent)

  let response: Response
  try {
    response = await fetch(COHERE_RERANK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        query: params.query,
        documents,
        top_n: Math.min(topN, params.chunks.length),
      }),
      signal: params.signal,
    })
  } catch (error) {
    console.error(
      '[reranker] fetch failed:',
      error instanceof Error ? error.message : error,
    )
    return { chunks: params.chunks, applied: false, reason: 'error' }
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    console.error(
      `[reranker] Cohere returned ${response.status}: ${body.slice(0, 240)}`,
    )
    return { chunks: params.chunks, applied: false, reason: 'error' }
  }

  let payload: {
    results?: Array<{ index?: number; relevance_score?: number }>
  }
  try {
    payload = (await response.json()) as typeof payload
  } catch {
    return { chunks: params.chunks, applied: false, reason: 'error' }
  }

  const results = payload.results ?? []
  if (results.length === 0) {
    return { chunks: params.chunks, applied: false, reason: 'error' }
  }

  // Cohere returns results sorted by relevance_score descending.
  // Map back to our chunk array via the `index` field.
  const reordered: ReferenceChunk[] = []
  for (const r of results) {
    if (
      typeof r.index === 'number' &&
      r.index >= 0 &&
      r.index < params.chunks.length
    ) {
      reordered.push(params.chunks[r.index]!)
    }
    if (reordered.length >= topN) break
  }

  // Defensive: if Cohere returned a malformed response that gave
  // us zero usable chunks, fall back to original ordering.
  if (reordered.length === 0) {
    return { chunks: params.chunks, applied: false, reason: 'error' }
  }

  return { chunks: reordered, applied: true }
}
