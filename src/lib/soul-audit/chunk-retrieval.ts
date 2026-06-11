// Shared BM25 retrieval over the reference library (commentary corpus).
// Extracted so both the legacy generate-day route and the grounded-weave
// orchestrator retrieve identically. No network, no deps.
import type { BaseChunk } from './reference-utils'

export function bm25Score(
  query: string,
  doc: string,
  k1 = 1.5,
  b = 0.75,
  avgDl = 500,
): number {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
  const docTerms = doc.toLowerCase().split(/\s+/)
  const dl = docTerms.length
  const tf = new Map<string, number>()
  for (const t of docTerms) tf.set(t, (tf.get(t) || 0) + 1)
  let score = 0
  for (const qt of queryTerms) {
    const f = tf.get(qt) || 0
    if (f === 0) continue
    score += (f * (k1 + 1)) / (f + k1 * (1 - b + (b * dl) / avgDl))
  }
  return score
}

export function applyDiversityPenalty(
  scores: Map<string, number>,
  usedChunkIds: string[],
): Map<string, number> {
  const penalized = new Map(scores)
  for (const [id, score] of penalized) {
    if (usedChunkIds.includes(id)) penalized.set(id, score * 0.3)
  }
  return penalized
}

export function selectTopChunks(
  chunks: BaseChunk[],
  query: string,
  usedChunkIds: string[],
  topK: number,
  minScore: number,
  minRequired: number,
): { selected: BaseChunk[]; selectedIds: string[] } {
  const rawScores = new Map<string, number>()
  for (const chunk of chunks) {
    const text = [
      chunk.title,
      chunk.content,
      chunk.contextualSummary ?? '',
      chunk.keywords.join(' '),
      chunk.scriptureRefs.join(' '),
    ].join(' ')
    rawScores.set(chunk.id, bm25Score(query, text))
  }

  const penalizedScores = applyDiversityPenalty(rawScores, usedChunkIds)

  const sorted = [...penalizedScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > minScore)
    .slice(0, topK)

  if (sorted.length < minRequired) {
    const relaxed = [...penalizedScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, minRequired)
    const relaxedIds = relaxed.map(([id]) => id)
    const relaxedChunks = relaxedIds
      .map((id) => chunks.find((c) => c.id === id))
      .filter((c): c is BaseChunk => c !== undefined)
    return { selected: relaxedChunks, selectedIds: relaxedIds }
  }

  const selectedIds = sorted.map(([id]) => id)
  const selected = selectedIds
    .map((id) => chunks.find((c) => c.id === id))
    .filter((c): c is BaseChunk => c !== undefined)
  return { selected, selectedIds }
}

/** Pull a readable author/work attribution from a chunk's source path. */
export function attributionFromChunk(chunk: BaseChunk): string {
  // sources look like "content/reference/commentaries/thomas-a-kempis/imitation-of-christ.txt"
  const parts = chunk.source.split('/').filter(Boolean)
  const file = parts[parts.length - 1]?.replace(/\.[a-z]+$/i, '') ?? ''
  const author = parts[parts.length - 2] ?? ''
  const titleize = (s: string) =>
    s
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/\bA\b/g, 'à') // thomas-a-kempis -> Thomas à Kempis
      .trim()
  const authorName = titleize(author)
  // Prefer the WORK (file name) — chunk.title is often a noisy chapter header
  // ("BY WILLIAM DEAN HOWELLS", "SCANDAL"), not the work.
  const workName = titleize(file)
  return workName ? `${authorName}, ${workName}` : authorName
}
