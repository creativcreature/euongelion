/**
 * reference-retriever.ts
 *
 * Contextual retrieval for Soul Audit composition.
 *
 * Implements an Anthropic-style contextual retrieval pattern:
 * 1) each chunk carries contextualized text (document + section metadata)
 * 2) hybrid retrieval (semantic keyword scoring + BM25 lexical retrieval)
 * 3) reciprocal-rank fusion + source diversity controls
 */

import fs from 'fs'
import path from 'path'
import {
  type BaseChunk,
  type CollectFilesOptions,
  type ReferenceSourceType,
  STOP_WORDS,
  buildContextualizedContent,
  buildContextualSummary,
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
  contextualizedNormalized: string
}

export interface RetrievalRequest {
  themes: string[]
  scriptureAnchors: string[]
  topic: string
  excludeChunkIds?: string[]
  limit?: number
  chiasticPosition?: 'A' | 'B' | 'C' | "B'" | "A'" | 'Sabbath' | 'Review'
  pardesLevel?: 'peshat' | 'remez' | 'derash' | 'sod' | 'integrated'
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

type RankedChunk = {
  chunk: ReferenceChunk
  semantic: number
  bm25: number
  fused: number
}

type Bm25PreparedDoc = {
  chunk: ReferenceChunk
  tf: Map<string, number>
  length: number
}

type Bm25Index = {
  signature: string
  docs: Bm25PreparedDoc[]
  idf: Map<string, number>
  avgLength: number
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
const MIN_RETRIEVAL_LIMIT = 15
const DEFAULT_RETRIEVAL_LIMIT = 20
const MAX_RETRIEVAL_LIMIT = 25

const BM25_K1 = 1.2
const BM25_B = 0.75
const RRF_K = 60

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

const CHIASTIC_HINTS: Record<
  NonNullable<RetrievalRequest['chiasticPosition']>,
  string[]
> = {
  A: ['opening', 'beginning', 'tension', 'question', 'context'],
  B: ['struggle', 'conflict', 'complexity', 'testing', 'wilderness'],
  C: ['pivot', 'center', 'revelation', 'cross', 'resurrection'],
  "B'": ['application', 'practice', 'response', 'obedience', 'embody'],
  "A'": ['resolution', 'assurance', 'hope', 'peace', 'completion'],
  Sabbath: ['rest', 'stillness', 'silence', 'sabbath', 'delight'],
  Review: ['summary', 'recap', 'remember', 'review', 'integrate'],
}

const PARDES_HINTS: Record<
  NonNullable<RetrievalRequest['pardesLevel']>,
  string[]
> = {
  peshat: ['literal', 'plain', 'context', 'grammar', 'historical'],
  remez: ['symbol', 'pattern', 'typology', 'hint', 'allusion'],
  derash: ['application', 'ethics', 'practice', 'obedience', 'formation'],
  sod: ['mystery', 'contemplation', 'prayer', 'wonder', 'presence'],
  integrated: ['synthesis', 'integrated', 'whole', 'thread', 'together'],
}

const PARDES_SOURCE_BONUS: Record<
  NonNullable<RetrievalRequest['pardesLevel']>,
  Partial<Record<ReferenceSourceType, number>>
> = {
  peshat: {
    bible: 2,
    commentary: 2,
  },
  remez: {
    theology: 2,
    commentary: 1,
  },
  derash: {
    commentary: 2,
    theology: 1,
  },
  sod: {
    theology: 2,
    lexicon: 1,
  },
  integrated: {
    bible: 1,
    commentary: 1,
    theology: 1,
    lexicon: 1,
    dictionary: 1,
  },
}

const QUERY_EXPANSIONS: Record<string, string[]> = {
  sad: ['grief', 'sorrow', 'lament', 'comfort'],
  sadness: ['grief', 'sorrow', 'lament', 'comfort'],
  lonely: ['loneliness', 'communion', 'comfort', 'presence'],
  anxious: ['anxiety', 'fear', 'peace', 'trust'],
  anxiety: ['fear', 'peace', 'trust', 'worry'],
  prophets: ['prophet', 'isaiah', 'jeremiah', 'ezekiel', 'amos', 'hosea'],
  prophet: ['prophets', 'isaiah', 'jeremiah', 'ezekiel', 'amos', 'hosea'],
}

// ─── Helpers ────────────────────────────────────────────────────────

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function tokenizeForBm25(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token))
}

function topicSeed(topic: string): number {
  let seed = 0
  for (let i = 0; i < topic.length; i++) {
    seed = (seed * 33 + topic.charCodeAt(i)) >>> 0
  }
  return seed
}

function expandQueryTokens(tokens: string[]): string[] {
  const expanded = new Set(tokens)
  for (const token of tokens) {
    const additions = QUERY_EXPANSIONS[token]
    if (!additions) continue
    for (const next of additions) {
      if (next.length >= 2 && !STOP_WORDS.has(next)) expanded.add(next)
    }
  }
  return Array.from(expanded)
}

function extractScriptureBooks(scriptureAnchors: string[]): string[] {
  return Array.from(
    new Set(
      scriptureAnchors
        .map((anchor) => {
          const normalized = anchor.replace(/\s+/g, ' ').trim()
          const match = normalized.match(/^((?:[1-3]\s+)?[A-Za-z]+)\s+\d+/)
          return match?.[1]?.toLowerCase() ?? ''
        })
        .filter((value) => value.length >= 3),
    ),
  )
}

function contextAwareText(chunk: BaseChunk): string {
  if (chunk.contextualizedContent && chunk.contextualizedContent.trim()) {
    return chunk.contextualizedContent
  }
  return buildContextualizedContent({
    source: chunk.source,
    sourceType: chunk.sourceType,
    title: chunk.title,
    content: chunk.content,
    scriptureRefs: chunk.scriptureRefs,
    keywords: chunk.keywords,
  })
}

/** Extend base chunks with normalized/contextual fields used for scoring. */
function addNormalized(base: BaseChunk[]): ReferenceChunk[] {
  return base.map((chunk) => {
    const contextualizedContent = contextAwareText(chunk)
    const contextualSummary =
      chunk.contextualSummary ||
      buildContextualSummary({
        source: chunk.source,
        sourceType: chunk.sourceType,
        title: chunk.title,
        scriptureRefs: chunk.scriptureRefs,
        keywords: chunk.keywords,
      })

    return {
      ...chunk,
      contextualSummary,
      contextualizedContent,
      normalized: chunk.content.toLowerCase(),
      contextualizedNormalized: contextualizedContent.toLowerCase(),
    }
  })
}

function clampRetrievalLimit(limit: number | undefined): number {
  const requested =
    typeof limit === 'number' && Number.isFinite(limit)
      ? Math.round(limit)
      : DEFAULT_RETRIEVAL_LIMIT
  return Math.max(MIN_RETRIEVAL_LIMIT, Math.min(MAX_RETRIEVAL_LIMIT, requested))
}

function isDisallowedDevotionalSource(source: string): boolean {
  const normalized = source.replace(/\\/g, '/').toLowerCase()
  return /content\/(approved|final|series-json)|devotional|wake-up|wakeup/.test(
    normalized,
  )
}

function corpusSignature(corpus: ReferenceChunk[]): string {
  if (corpus.length === 0) return 'empty'
  const first = corpus[0]?.id || 'none'
  const last = corpus[corpus.length - 1]?.id || 'none'
  return `${corpus.length}:${first}:${last}`
}

// ─── Corpus building ────────────────────────────────────────────────

let cachedCorpus: ReferenceChunk[] | null = null
let cachedBm25Index: Bm25Index | null = null

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
    if (isDisallowedDevotionalSource(file)) continue

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
  // Only needed when the live reference library isn't available OR
  // when the mounted library produced no usable chunks.
  if (!referenceLibraryAvailable || files.length === 0 || corpus.length === 0) {
    const indexPath = path.join(process.cwd(), 'public', 'reference-index.json')
    try {
      if (fs.existsSync(indexPath)) {
        const raw = fs.readFileSync(indexPath, 'utf8')
        const indexed = JSON.parse(raw) as BaseChunk[]
        if (Array.isArray(indexed)) {
          for (const rawChunk of indexed) {
            if (corpus.length >= MAX_CHUNKS) break
            if (!rawChunk || typeof rawChunk.content !== 'string' || !rawChunk.id) {
              continue
            }
            if (isDisallowedDevotionalSource(rawChunk.source)) continue
            if (
              !VALID_SOURCE_TYPES.has(rawChunk.sourceType as ReferenceSourceType)
            ) {
              continue
            }
            if (isMetadataChunk(rawChunk.content)) continue

            const chunk: BaseChunk = {
              ...rawChunk,
              priority: typeof rawChunk.priority === 'number' ? rawChunk.priority : 2,
              wordCount:
                typeof rawChunk.wordCount === 'number'
                  ? rawChunk.wordCount
                  : rawChunk.content.split(/\s+/).filter(Boolean).length,
              scriptureRefs: Array.isArray(rawChunk.scriptureRefs)
                ? rawChunk.scriptureRefs
                : [],
              keywords: Array.isArray(rawChunk.keywords)
                ? rawChunk.keywords
                : extractKeywords(rawChunk.content),
              contextualSummary:
                rawChunk.contextualSummary ||
                buildContextualSummary({
                  source: rawChunk.source,
                  sourceType: rawChunk.sourceType,
                  title: rawChunk.title,
                  scriptureRefs: rawChunk.scriptureRefs,
                  keywords: rawChunk.keywords,
                }),
              contextualizedContent:
                rawChunk.contextualizedContent || contextAwareText(rawChunk),
            }

            corpus.push(
              addNormalized([chunk])[0] as ReferenceChunk,
            )
          }
        }
      }
    } catch {
      // Index may not exist or may be corrupt — continue
    }
  }

  cachedCorpus = corpus
  return corpus
}

/** Clear cached corpus (for testing). */
export function clearCorpusCache(): void {
  cachedCorpus = null
  cachedBm25Index = null
}

// ─── Contextual BM25 ────────────────────────────────────────────────

function buildBm25Index(corpus: ReferenceChunk[]): Bm25Index {
  const signature = corpusSignature(corpus)
  if (cachedBm25Index && cachedBm25Index.signature === signature) {
    return cachedBm25Index
  }

  const docs: Bm25PreparedDoc[] = []
  const documentFrequency = new Map<string, number>()
  let totalLength = 0

  for (const chunk of corpus) {
    const terms = tokenizeForBm25(chunk.contextualizedNormalized)
    const tf = new Map<string, number>()
    for (const term of terms) {
      tf.set(term, (tf.get(term) ?? 0) + 1)
    }

    totalLength += terms.length
    docs.push({
      chunk,
      tf,
      length: Math.max(1, terms.length),
    })

    for (const term of new Set(terms)) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1)
    }
  }

  const avgLength = Math.max(1, totalLength / Math.max(1, docs.length))
  const idf = new Map<string, number>()
  const docCount = Math.max(1, docs.length)
  for (const [term, df] of documentFrequency.entries()) {
    // BM25+ style smoothed idf
    const value = Math.log(1 + (docCount - df + 0.5) / (df + 0.5))
    idf.set(term, value)
  }

  cachedBm25Index = {
    signature,
    docs,
    idf,
    avgLength,
  }
  return cachedBm25Index
}

function scoreBm25(doc: Bm25PreparedDoc, queryTokens: string[], index: Bm25Index): number {
  let score = 0
  for (const token of queryTokens) {
    const tf = doc.tf.get(token) ?? 0
    if (tf === 0) continue

    const idf = index.idf.get(token) ?? 0
    const numerator = tf * (BM25_K1 + 1)
    const denominator =
      tf + BM25_K1 * (1 - BM25_B + BM25_B * (doc.length / index.avgLength))
    score += idf * (numerator / Math.max(1e-6, denominator))
  }
  return score
}

// ─── Hybrid semantic scoring ────────────────────────────────────────

function scoreSemanticChunk(
  chunk: ReferenceChunk,
  queryKeywords: string[],
  scriptureKeywords: string[],
  themeKeywords: string[],
  chiasticKeywords: string[],
  pardesKeywords: string[],
  pardesLevel: RetrievalRequest['pardesLevel'],
): number {
  let score = 0
  let semanticHit = false

  for (const kw of queryKeywords) {
    if (chunk.contextualizedNormalized.includes(kw)) {
      score += 2
      semanticHit = true
    }
  }

  for (const kw of scriptureKeywords) {
    if (chunk.contextualizedNormalized.includes(kw)) {
      score += 3
      semanticHit = true
    }
  }

  for (const theme of themeKeywords) {
    if (chunk.contextualizedNormalized.includes(theme.toLowerCase())) {
      score += 4
      semanticHit = true
    }
  }

  for (const hint of chiasticKeywords) {
    if (chunk.contextualizedNormalized.includes(hint)) score += 2
  }

  for (const hint of pardesKeywords) {
    if (chunk.contextualizedNormalized.includes(hint)) score += 2
  }

  if (!semanticHit) return 0

  score += chunk.priority
  if (pardesLevel) {
    score += PARDES_SOURCE_BONUS[pardesLevel][chunk.sourceType] ?? 0
  }

  // Deterministic tiebreaker
  score += (chunk.id.charCodeAt(chunk.id.length - 1) % 83) / 1000
  return score
}

function fuseRankings(
  semanticRanked: Array<{ chunk: ReferenceChunk; score: number }>,
  bm25Ranked: Array<{ chunk: ReferenceChunk; score: number }>,
): RankedChunk[] {
  const byId = new Map<
    string,
    {
      chunk: ReferenceChunk
      semantic: number
      bm25: number
      semanticRank: number
      bm25Rank: number
    }
  >()

  semanticRanked.forEach((entry, index) => {
    byId.set(entry.chunk.id, {
      chunk: entry.chunk,
      semantic: entry.score,
      bm25: 0,
      semanticRank: index,
      bm25Rank: Number.MAX_SAFE_INTEGER,
    })
  })

  bm25Ranked.forEach((entry, index) => {
    const current = byId.get(entry.chunk.id)
    if (current) {
      current.bm25 = entry.score
      current.bm25Rank = index
    } else {
      byId.set(entry.chunk.id, {
        chunk: entry.chunk,
        semantic: 0,
        bm25: entry.score,
        semanticRank: Number.MAX_SAFE_INTEGER,
        bm25Rank: index,
      })
    }
  })

  const semanticMax = semanticRanked[0]?.score || 1
  const bm25Max = bm25Ranked[0]?.score || 1

  const fused: RankedChunk[] = []
  for (const value of byId.values()) {
    const semanticNorm = value.semantic > 0 ? value.semantic / semanticMax : 0
    const bm25Norm = value.bm25 > 0 ? value.bm25 / bm25Max : 0

    const semanticRrf =
      value.semanticRank === Number.MAX_SAFE_INTEGER
        ? 0
        : 1 / (RRF_K + value.semanticRank + 1)
    const bm25Rrf =
      value.bm25Rank === Number.MAX_SAFE_INTEGER
        ? 0
        : 1 / (RRF_K + value.bm25Rank + 1)
    const rrfNorm = Math.min(1, (semanticRrf + bm25Rrf) * RRF_K)

    const fusedScore = semanticNorm * 0.5 + bm25Norm * 0.35 + rrfNorm * 0.15

    if (fusedScore <= 0) continue
    fused.push({
      chunk: value.chunk,
      semantic: value.semantic,
      bm25: value.bm25,
      fused: fusedScore,
    })
  }

  return fused.sort((a, b) => b.fused - a.fused)
}

/**
 * Enforce source/content diversity.
 * - maxPerSource limits over-representation from a single file
 * - signature dedupe prevents near-identical excerpts across ranked output
 */
function enforceDiversity(
  ranked: RankedChunk[],
  limit: number,
  maxPerSource: number,
): RankedChunk[] {
  const result: RankedChunk[] = []
  const countBySource = new Map<string, number>()
  const seenSignatures = new Set<string>()

  for (const entry of ranked) {
    if (result.length >= limit) break

    const sourceKey = entry.chunk.source
    const sourceCount = countBySource.get(sourceKey) ?? 0
    if (sourceCount >= maxPerSource) continue

    const signature = collapseWhitespace(entry.chunk.normalized)
      .slice(0, 260)
      .toLowerCase()
    if (seenSignatures.has(signature)) continue

    countBySource.set(sourceKey, sourceCount + 1)
    seenSignatures.add(signature)
    result.push(entry)
  }

  return result
}

function buildQueryTokens(params: {
  topic: string
  themes: string[]
  scriptureAnchors: string[]
  chiasticKeywords: string[]
  pardesKeywords: string[]
}): string[] {
  const topicTokens = extractKeywords(params.topic)
  const scriptureTokens = params.scriptureAnchors.flatMap((ref) =>
    ref
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 2),
  )

  const baseTokens = Array.from(
    new Set(
      [
        ...topicTokens,
        ...params.themes,
        ...scriptureTokens,
        ...params.chiasticKeywords,
        ...params.pardesKeywords,
      ]
        .map((token) => token.toLowerCase().trim())
        .filter((token) => token.length >= 2 && !STOP_WORDS.has(token)),
    ),
  )
  return expandQueryTokens(baseTokens)
}

function buildFallbackRanked(params: {
  corpus: ReferenceChunk[]
  limit: number
  topic: string
  themeKeywords: string[]
  scriptureBooks: string[]
}): RankedChunk[] {
  const seed = topicSeed(params.topic)

  const ranked = params.corpus
    .map((chunk) => {
      let score = chunk.priority
      const chunkRefs = (chunk.scriptureRefs ?? []).join(' ').toLowerCase()
      const chunkKeywords = new Set(
        (chunk.keywords ?? []).map((keyword) => keyword.toLowerCase()),
      )

      if (params.scriptureBooks.length > 0) {
        const bookHits = params.scriptureBooks.filter(
          (book) =>
            chunkRefs.includes(book) || chunk.contextualizedNormalized.includes(book),
        ).length
        score += bookHits * 4
      }

      if (chunk.sourceType === 'bible' || chunk.sourceType === 'commentary') {
        score += 2
      }

      for (const theme of params.themeKeywords) {
        if (chunkKeywords.has(theme.toLowerCase())) score += 2
      }

      // Deterministic tie-breaker seeded by query topic.
      const jitter =
        ((seed ^ chunk.id.charCodeAt(chunk.id.length - 1)) % 97) / 1000
      score += jitter

      return {
        chunk,
        semantic: score,
        bm25: 0,
        fused: score,
      }
    })
    .sort((a, b) => b.fused - a.fused)

  const maxPerSource = Math.max(3, Math.ceil(params.limit / 5))
  return enforceDiversity(ranked, params.limit, maxPerSource)
}

// ─── Retrieval ──────────────────────────────────────────────────────

/**
 * Retrieve reference chunks for a devotional day.
 *
 * Contextual retrieval path:
 * 1) contextual semantic scoring
 * 2) BM25 lexical retrieval on contextualized chunk text
 * 3) rank fusion + diversity
 */
export function retrieveForDay(params: RetrievalRequest): RetrievalResult {
  const limit = clampRetrievalLimit(params.limit)
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
  const chiasticKeywords = params.chiasticPosition
    ? CHIASTIC_HINTS[params.chiasticPosition]
    : []
  const pardesKeywords = params.pardesLevel
    ? PARDES_HINTS[params.pardesLevel]
    : []

  const queryTokens = buildQueryTokens({
    topic: params.topic,
    themes: params.themes,
    scriptureAnchors: params.scriptureAnchors,
    chiasticKeywords,
    pardesKeywords,
  })

  const scriptureKeywords = params.scriptureAnchors.flatMap((ref) =>
    ref
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 2),
  )
  const themeKeywords = params.themes.filter((theme) => theme.length >= 3)

  const filteredCorpus = corpus.filter((chunk) => !excludeSet.has(chunk.id))
  const scriptureBooks = extractScriptureBooks(params.scriptureAnchors)

  const normalizedQueryTokens =
    queryTokens.length > 0
      ? queryTokens
      : expandQueryTokens(
          buildQueryTokens({
            topic: `${params.topic} ${(params.scriptureAnchors || []).join(' ')}`,
            themes: params.themes,
            scriptureAnchors: params.scriptureAnchors,
            chiasticKeywords,
            pardesKeywords,
          }),
        )

  const semanticRanked = filteredCorpus
    .map((chunk) => ({
      chunk,
      score: scoreSemanticChunk(
        chunk,
        normalizedQueryTokens,
        scriptureKeywords,
        themeKeywords,
        chiasticKeywords,
        pardesKeywords,
        params.pardesLevel,
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  const bm25Index = buildBm25Index(filteredCorpus)
  const bm25Ranked = bm25Index.docs
    .map((doc) => ({
      chunk: doc.chunk,
      score: scoreBm25(doc, normalizedQueryTokens, bm25Index),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  const fusedRanked = fuseRankings(semanticRanked, bm25Ranked)

  const maxPerSource = Math.max(3, Math.ceil(limit / 5))
  let selected = enforceDiversity(fusedRanked, limit, maxPerSource)
  if (selected.length === 0) {
    selected = buildFallbackRanked({
      corpus: filteredCorpus,
      limit,
      topic: params.topic,
      themeKeywords,
      scriptureBooks,
    })
  }

  const joinedContent = selected
    .map((entry) => entry.chunk.contextualizedNormalized)
    .join(' ')
  const themesHit = themeKeywords.filter((theme) =>
    joinedContent.includes(theme.toLowerCase()),
  )
  const themesMissed = themeKeywords.filter(
    (theme) => !joinedContent.includes(theme.toLowerCase()),
  )
  const scriptureHit = scriptureKeywords.some((token) =>
    joinedContent.includes(token),
  )

  return {
    chunks: selected.map((entry) => entry.chunk),
    totalScore: selected.reduce((sum, entry) => sum + entry.fused, 0),
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
