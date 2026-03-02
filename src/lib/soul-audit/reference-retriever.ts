/**
 * reference-retriever.ts
 *
 * Enhanced reference library retrieval for devotional composition.
 * Chunks reference files into 200-800 word passages and provides two-pass
 * retrieval: fast keyword scoring + source diversity enforcement.
 *
 * Designed for the 80/15/5 composition model:
 *   80% reference material (commentaries, lexicons, bibles, theology)
 *   15% LLM-generated connecting tissue, transitions
 *   5% pre-existing devotional module anchors
 */

import fs from 'fs'
import path from 'path'
import {
  type BaseChunk,
  type CollectFilesOptions,
  type ReferenceSourceType,
  chunkText,
  collectFiles,
  detectSourceType,
  extractKeywords,
  isMetadataChunk,
} from './reference-utils'

// Re-export the canonical source type for consumers
export type { ReferenceSourceType } from './reference-utils'

// ─── Types ──────────────────────────────────────────────────────────

export interface ReferenceChunk extends BaseChunk {
  normalized: string
}

export interface RetrievalRequest {
  themes: string[]
  scriptureAnchors: string[]
  topic: string
  excludeChunkIds?: string[]
  limit: number
}

export interface RetrievalResult {
  chunks: ReferenceChunk[]
  totalScore: number
  coverageReport: {
    themesHit: string[]
    themesMissed: string[]
    scriptureHit: boolean
  }
}

// ─── Constants ──────────────────────────────────────────────────────

const SKIP_SEGMENTS = new Set(['.git', 'stepbible-data', 'node_modules'])
const ALLOWED_EXTENSIONS = new Set(['.md', '.markdown', '.txt', '.json'])
const MAX_FILE_BYTES = 4 * 1024 * 1024
const MAX_FILES = 500
const MAX_CHUNKS = 50_000
const CHUNK_MIN_WORDS = 40
const CHUNK_MAX_WORDS = 800
const CHUNK_TARGET_WORDS = 400

const VALID_SOURCE_TYPES = new Set<ReferenceSourceType>([
  'commentary',
  'bible',
  'lexicon',
  'dictionary',
  'theology',
])

const COLLECT_OPTIONS: CollectFilesOptions = {
  skipSegments: SKIP_SEGMENTS,
  allowedExtensions: ALLOWED_EXTENSIONS,
  maxFiles: MAX_FILES,
  maxFileBytes: MAX_FILE_BYTES,
}

const CHUNKING_OPTIONS = {
  minWords: CHUNK_MIN_WORDS,
  maxWords: CHUNK_MAX_WORDS,
  targetWords: CHUNK_TARGET_WORDS,
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Extend base chunks with the normalized field used for scoring. */
function addNormalized(base: BaseChunk[]): ReferenceChunk[] {
  return base.map((chunk) => ({
    ...chunk,
    normalized: chunk.content.toLowerCase(),
  }))
}

// ─── Corpus building ────────────────────────────────────────────────

let cachedCorpus: ReferenceChunk[] | null = null

export function buildChunkedCorpus(root: string): ReferenceChunk[] {
  if (cachedCorpus) return cachedCorpus

  // Detect whether the reference library root actually exists and has files.
  // On Vercel, content/reference/ is gitignored so this will be false.
  let referenceLibraryAvailable = false
  if (fs.existsSync(root)) {
    try {
      referenceLibraryAvailable = fs.readdirSync(root).length > 0
    } catch {
      // Directory exists but isn't readable — treat as unavailable.
    }
  }

  const files: string[] = []
  if (referenceLibraryAvailable) {
    collectFiles(root, files, COLLECT_OPTIONS)
  }

  const corpus: ReferenceChunk[] = []

  for (const file of files) {
    if (corpus.length >= MAX_CHUNKS) break

    let text = ''
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }

    const sourceType = detectSourceType(file)

    // JSON files: try to extract text content
    if (file.endsWith('.json')) {
      try {
        const data = JSON.parse(text)
        text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      } catch {
        // Keep raw text
      }
    }

    const fileChunks = addNormalized(
      chunkText(text, file, sourceType, CHUNKING_OPTIONS),
    )
    for (const chunk of fileChunks) {
      if (corpus.length >= MAX_CHUNKS) break
      corpus.push(chunk)
    }
  }

  // Load pre-built reference index if available (generated at build time
  // from content/reference/ which is too large to deploy to Vercel directly).
  // Only needed when the live reference library isn't available.
  if (!referenceLibraryAvailable) {
    const indexPath = path.join(process.cwd(), 'public', 'reference-index.json')
    try {
      if (fs.existsSync(indexPath)) {
        const raw = fs.readFileSync(indexPath, 'utf8')
        const indexed = JSON.parse(raw) as ReferenceChunk[]
        if (Array.isArray(indexed)) {
          for (const chunk of indexed) {
            if (corpus.length >= MAX_CHUNKS) break
            // Validate required fields — scoring reads priority, wordCount, sourceType
            if (!chunk || typeof chunk.content !== 'string' || !chunk.id)
              continue
            if (
              !VALID_SOURCE_TYPES.has(chunk.sourceType as ReferenceSourceType)
            )
              continue
            // Skip metadata/scaffolding chunks (document headers, TOCs, etc.)
            if (isMetadataChunk(chunk.content)) continue
            // Reconstruct derived/optional fields if missing from the index
            if (typeof chunk.priority !== 'number') chunk.priority = 2
            if (typeof chunk.wordCount !== 'number')
              chunk.wordCount = chunk.content
                .split(/\s+/)
                .filter(Boolean).length
            if (!chunk.scriptureRefs) chunk.scriptureRefs = []
            if (!chunk.normalized)
              chunk.normalized = chunk.content.toLowerCase()
            if (!chunk.keywords) chunk.keywords = extractKeywords(chunk.content)
            corpus.push(chunk)
          }
        }
      }
    } catch {
      // Index may not exist or may be corrupt — continue
    }
  }

  // REMOVED: Devotional self-referencing fallback.
  // Previously, when the reference library was unavailable, this indexed
  // the app's own devotional JSONs as "reference material" — creating a
  // circular self-reference that violated the 80/20 composition contract.
  // The reference-index.json (built from verified theological sources)
  // is now the sole reference source on Vercel.

  cachedCorpus = corpus
  return corpus
}

/** Clear cached corpus (for testing). */
export function clearCorpusCache(): void {
  cachedCorpus = null
}

// ─── Retrieval ──────────────────────────────────────────────────────

function scoreChunk(
  chunk: ReferenceChunk,
  queryKeywords: string[],
  scriptureKeywords: string[],
  themeKeywords: string[],
): number {
  let score = 0

  // Keyword matches (topic + general)
  for (const kw of queryKeywords) {
    if (chunk.normalized.includes(kw)) score += 2
  }

  // Scripture matches (higher weight)
  for (const kw of scriptureKeywords) {
    if (chunk.normalized.includes(kw)) score += 3
  }

  // Theme matches (highest weight — AI-extracted themes)
  for (const theme of themeKeywords) {
    if (chunk.normalized.includes(theme.toLowerCase())) score += 4
  }

  // Source priority boost
  score += chunk.priority

  // Deterministic tiebreaker
  score += (chunk.id.charCodeAt(chunk.id.length - 1) % 83) / 1000

  return score
}

/**
 * Enforce source diversity: no more than maxPerSource chunks from
 * any single source file. Prevents over-representation of one commentary.
 */
function enforceDiversity(
  scored: Array<{ chunk: ReferenceChunk; score: number }>,
  limit: number,
  maxPerSource: number,
): Array<{ chunk: ReferenceChunk; score: number }> {
  const result: Array<{ chunk: ReferenceChunk; score: number }> = []
  const countBySource = new Map<string, number>()

  for (const entry of scored) {
    if (result.length >= limit) break
    const sourceKey = entry.chunk.source
    const count = countBySource.get(sourceKey) ?? 0
    if (count >= maxPerSource) continue
    countBySource.set(sourceKey, count + 1)
    result.push(entry)
  }

  return result
}

/**
 * Retrieve reference chunks for a devotional day.
 *
 * Two-pass: keyword scoring (all chunks) → diversity enforcement → return top N.
 * Default limit is 20 chunks (supports 80% reference composition target).
 * Source diversity ensures no single source dominates the results.
 */
export function retrieveForDay(params: RetrievalRequest): RetrievalResult {
  const root = path.join(process.cwd(), 'content', 'reference')
  const corpus = buildChunkedCorpus(root)

  if (corpus.length === 0) {
    return {
      chunks: [],
      totalScore: 0,
      coverageReport: {
        themesHit: [],
        themesMissed: [...params.themes],
        scriptureHit: false,
      },
    }
  }

  const excludeSet = new Set(params.excludeChunkIds || [])
  const queryKeywords = extractKeywords(params.topic)
  const scriptureKeywords = params.scriptureAnchors.flatMap((ref) =>
    ref
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2),
  )
  const themeKeywords = params.themes.filter((t) => t.length >= 3)

  const allScored = corpus
    .filter((chunk) => !excludeSet.has(chunk.id))
    .map((chunk) => ({
      chunk,
      score: scoreChunk(chunk, queryKeywords, scriptureKeywords, themeKeywords),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  // Enforce source diversity: max 4 chunks from any single source file.
  // This prevents one large commentary from monopolizing the results.
  const maxPerSource = Math.max(3, Math.ceil(params.limit / 5))
  const scored = enforceDiversity(allScored, params.limit, maxPerSource)

  // Coverage report
  const allChunkContent = scored.map((s) => s.chunk.normalized).join(' ')
  const themesHit = themeKeywords.filter((t) =>
    allChunkContent.includes(t.toLowerCase()),
  )
  const themesMissed = themeKeywords.filter(
    (t) => !allChunkContent.includes(t.toLowerCase()),
  )
  const scriptureHit = scriptureKeywords.some((kw) =>
    allChunkContent.includes(kw),
  )

  return {
    chunks: scored.map((s) => s.chunk),
    totalScore: scored.reduce((sum, s) => sum + s.score, 0),
    coverageReport: {
      themesHit,
      themesMissed,
      scriptureHit,
    },
  }
}

/**
 * Get corpus stats for diagnostics.
 */
export function getCorpusStats(): {
  totalChunks: number
  bySourceType: Record<ReferenceSourceType, number>
  totalWords: number
} {
  const root = path.join(process.cwd(), 'content', 'reference')
  const corpus = buildChunkedCorpus(root)

  const bySourceType: Record<ReferenceSourceType, number> = {
    commentary: 0,
    bible: 0,
    lexicon: 0,
    dictionary: 0,
    theology: 0,
  }

  let totalWords = 0
  for (const chunk of corpus) {
    bySourceType[chunk.sourceType]++
    totalWords += chunk.wordCount
  }

  return {
    totalChunks: corpus.length,
    bySourceType,
    totalWords,
  }
}
