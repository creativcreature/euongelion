/**
 * reference-retriever.ts
 *
 * Enhanced reference library retrieval for generative devotional composition.
 * Chunks reference files into 200-800 word passages and provides two-pass
 * retrieval: fast keyword scoring + optional LLM reranking.
 *
 * Designed for the 80/20 composition model:
 *   80% reference material (commentaries, lexicons, bibles, theology)
 *   20% LLM-generated bridging, personalization, transitions
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
  extractScriptureRefs,
  sourcePriority,
  wordCount,
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

// Devotional JSON indexing limits
const DEVOTIONAL_MAX_CHUNKS = 2_000
const DEVOTIONAL_MIN_TEXT_LENGTH = 60
const DEVOTIONAL_REFLECTION_MIN_WORDS = 20

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

// ─── Devotional JSON indexing ────────────────────────────────────────

interface DevotionalModule {
  type: string
  body?: string
  content?: string
  passage?: string
  reference?: string
  heading?: string
  keyInsight?: string
  meaning?: string
  rootMeaning?: string
  usageNote?: string
  word?: string
  transliteration?: string
  prompt?: string
  additionalQuestions?: string[]
  ancientTruth?: string
  modernApplication?: string
  connectionPoint?: string
}

interface DevotionalJson {
  day?: number
  title?: string
  anchorVerse?: string
  theme?: string
  scriptureReference?: string
  modules?: DevotionalModule[]
}

/**
 * Extract high-quality reference chunks from the deployed devotional JSONs.
 * These 176 files (3.4MB) are always available on Vercel in public/devotionals/.
 * Each file produces 2-6 chunks from teaching, insight, story, vocab, and scripture modules.
 */
function indexDevotionalJsons(): ReferenceChunk[] {
  const devotionalsDir = path.join(process.cwd(), 'public', 'devotionals')
  if (!fs.existsSync(devotionalsDir)) return []

  let entries: string[] = []
  try {
    entries = fs.readdirSync(devotionalsDir).filter((f) => f.endsWith('.json'))
  } catch {
    return []
  }

  const chunks: ReferenceChunk[] = []

  for (const filename of entries) {
    if (chunks.length >= DEVOTIONAL_MAX_CHUNKS) break

    const filePath = path.join(devotionalsDir, filename)
    // Guard against path traversal from filenames like "../../../etc/passwd"
    if (!filePath.startsWith(devotionalsDir + path.sep)) continue
    let raw: string
    try {
      raw = fs.readFileSync(filePath, 'utf8')
    } catch {
      continue
    }

    let data: DevotionalJson
    try {
      data = JSON.parse(raw) as DevotionalJson
    } catch {
      continue
    }

    if (!data.modules || !Array.isArray(data.modules)) continue

    const fileId = filename.replace('.json', '')
    const dayTitle = data.title || fileId
    const scriptureRef = data.scriptureReference || data.anchorVerse || ''
    const typeCounters: Record<string, number> = {}

    for (const mod of data.modules) {
      // Guard against non-object or typeless entries in modules array
      if (!mod || typeof mod !== 'object' || typeof mod.type !== 'string')
        continue

      // Extract text content from module.
      // Bridge modules use ancientTruth/modernApplication/connectionPoint
      // instead of body/content/passage — must check both field families.
      const text = mod.body || mod.content || mod.passage || ''
      const bridgeText = [
        mod.ancientTruth,
        mod.modernApplication,
        mod.connectionPoint,
      ]
        .filter(Boolean)
        .join('\n\n')
      const effectiveText = text || bridgeText
      if (!effectiveText || effectiveText.length < DEVOTIONAL_MIN_TEXT_LENGTH)
        continue

      // Build a rich chunk that includes module metadata
      const parts: string[] = []
      if (mod.heading) parts.push(mod.heading)
      parts.push(effectiveText)
      if (mod.keyInsight) parts.push(`Key insight: ${mod.keyInsight}`)
      if (mod.meaning) parts.push(`Meaning: ${mod.meaning}`)
      if (mod.rootMeaning) parts.push(mod.rootMeaning)
      if (mod.usageNote) parts.push(mod.usageNote)
      // Only add bridge fields if they weren't already the primary text
      if (text && mod.ancientTruth)
        parts.push(`Ancient truth: ${mod.ancientTruth}`)
      if (text && mod.modernApplication)
        parts.push(`Modern application: ${mod.modernApplication}`)

      const content = parts.join('\n\n')
      const wc = wordCount(content)
      if (wc < CHUNK_MIN_WORDS) continue

      const normalized = content.toLowerCase()
      const sourceType: ReferenceSourceType =
        mod.type === 'scripture'
          ? 'bible'
          : mod.type === 'vocab'
            ? 'lexicon'
            : mod.type === 'teaching' || mod.type === 'insight'
              ? 'commentary'
              : 'theology'

      // Unique ID: counter prevents collision when a file has multiple modules
      // of the same type (31/175 devotional files do).
      const typeIndex = typeCounters[mod.type] ?? 0
      typeCounters[mod.type] = typeIndex + 1

      chunks.push({
        id: `devotional:${fileId}:${mod.type}:${typeIndex}`,
        source: `public/devotionals/${filename}`,
        sourceType,
        title: `${dayTitle} — ${mod.heading || mod.type}`,
        content: content.slice(0, CHUNK_MAX_WORDS * 8),
        normalized,
        keywords: extractKeywords(content),
        scriptureRefs: extractScriptureRefs(
          `${scriptureRef} ${mod.reference || ''} ${content}`,
        ),
        priority: sourcePriority(sourceType),
        wordCount: wc,
      })
    }

    // Also index reflection prompts as lightweight chunks for topical matching
    const reflectionMods = data.modules.filter(
      (m) => m && typeof m === 'object' && m.type === 'reflection' && m.prompt,
    )
    for (let ri = 0; ri < reflectionMods.length; ri++) {
      const ref = reflectionMods[ri]
      const questions = [ref.prompt, ...(ref.additionalQuestions || [])].filter(
        Boolean,
      )
      const content = `${dayTitle}\n${data.theme || ''}\n${questions.join('\n')}`
      const wc = wordCount(content)
      if (wc < DEVOTIONAL_REFLECTION_MIN_WORDS) continue

      chunks.push({
        id: `devotional:${fileId}:reflection:${ri}`,
        source: `public/devotionals/${filename}`,
        sourceType: 'theology',
        title: `${dayTitle} — Reflection`,
        content,
        normalized: content.toLowerCase(),
        keywords: extractKeywords(content),
        scriptureRefs: extractScriptureRefs(`${scriptureRef} ${content}`),
        priority: 1, // Lightweight topical signal, not a primary source
        wordCount: wc,
      })
    }
  }

  return chunks
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
 * Retrieve reference chunks for a devotional day.
 *
 * Two-pass: keyword scoring (all chunks) → return top N.
 * LLM reranking is done externally if needed.
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

  const scored = corpus
    .filter((chunk) => !excludeSet.has(chunk.id))
    .map((chunk) => ({
      chunk,
      score: scoreChunk(chunk, queryKeywords, scriptureKeywords, themeKeywords),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, params.limit)

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
