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

// ─── Types ──────────────────────────────────────────────────────────

export type ReferenceSourceType =
  | 'commentary'
  | 'bible'
  | 'lexicon'
  | 'dictionary'
  | 'theology'

export interface ReferenceChunk {
  id: string
  source: string
  sourceType: ReferenceSourceType
  title: string
  content: string
  normalized: string
  keywords: string[]
  scriptureRefs: string[]
  priority: number
  wordCount: number
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

const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'against',
  'because',
  'before',
  'being',
  'between',
  'could',
  'doing',
  'every',
  'first',
  'from',
  'have',
  'just',
  'more',
  'should',
  'their',
  'there',
  'these',
  'they',
  'this',
  'through',
  'what',
  'when',
  'where',
  'with',
  'would',
  'your',
  'that',
  'than',
  'then',
  'them',
  'also',
  'been',
  'were',
  'will',
  'into',
  'only',
  'other',
  'some',
  'such',
  'each',
  'which',
  'does',
  'most',
  'very',
])

// ─── Scripture reference detection ──────────────────────────────────

const SCRIPTURE_REF_PATTERN =
  /\b(?:(?:1|2|3|I|II|III)\s+)?(?:Gen(?:esis)?|Exod(?:us)?|Lev(?:iticus)?|Num(?:bers)?|Deut(?:eronomy)?|Josh(?:ua)?|Judg(?:es)?|Ruth|(?:1|2)\s*Sam(?:uel)?|(?:1|2)\s*Kgs?|(?:1|2)\s*Chr(?:on)?|Ezra|Neh(?:emiah)?|Esth(?:er)?|Job|Ps(?:alm)?s?|Prov(?:erbs)?|Eccl(?:es)?|Song|Isa(?:iah)?|Jer(?:emiah)?|Lam(?:entations)?|Ezek(?:iel)?|Dan(?:iel)?|Hos(?:ea)?|Joel|Amos|Obad(?:iah)?|Jon(?:ah)?|Mic(?:ah)?|Nah(?:um)?|Hab(?:akkuk)?|Zeph(?:aniah)?|Hag(?:gai)?|Zech(?:ariah)?|Mal(?:achi)?|Matt(?:hew)?|Mark|Luke|John|Acts|Rom(?:ans)?|(?:1|2)\s*Cor(?:inthians)?|Gal(?:atians)?|Eph(?:esians)?|Phil(?:ippians)?|Col(?:ossians)?|(?:1|2)\s*Thess(?:alonians)?|(?:1|2)\s*Tim(?:othy)?|Tit(?:us)?|Phlm|Philemon|Heb(?:rews)?|Jas|James|(?:1|2)\s*Pet(?:er)?|(?:1|2|3)\s*Jn|Jude|Rev(?:elation)?)\s+\d+(?:[:.]\d+)?(?:\s*[-–]\s*\d+)?/gi

function extractScriptureRefs(text: string): string[] {
  const matches = text.match(SCRIPTURE_REF_PATTERN) || []
  return [...new Set(matches.map((m) => m.trim()))]
}

// ─── Source type detection ──────────────────────────────────────────

function detectSourceType(filePath: string): ReferenceSourceType {
  const lower = filePath.toLowerCase()
  if (
    lower.includes(`${path.sep}commentaries${path.sep}`) ||
    lower.includes('/commentaries/')
  )
    return 'commentary'
  if (
    lower.includes(`${path.sep}bibles${path.sep}`) ||
    lower.includes('/bibles/')
  )
    return 'bible'
  if (
    lower.includes(`${path.sep}lexicons${path.sep}`) ||
    lower.includes('/lexicons/')
  )
    return 'lexicon'
  if (
    lower.includes(`${path.sep}dictionaries${path.sep}`) ||
    lower.includes('/dictionaries/')
  )
    return 'dictionary'
  return 'theology'
}

function sourcePriority(sourceType: ReferenceSourceType): number {
  switch (sourceType) {
    case 'commentary':
      return 5
    case 'bible':
      return 4
    case 'lexicon':
      return 3
    case 'dictionary':
      return 3
    case 'theology':
      return 2
  }
}

// ─── Keyword extraction ─────────────────────────────────────────────

function extractKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 3 && !STOP_WORDS.has(w)),
    ),
  ).slice(0, 30)
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length
}

// ─── File collection ────────────────────────────────────────────────

function shouldSkipPath(target: string): boolean {
  const segments = target.split(path.sep)
  return segments.some((s) => SKIP_SEGMENTS.has(s))
}

function collectFiles(dir: string, acc: string[]): void {
  if (!fs.existsSync(dir)) return
  if (shouldSkipPath(dir)) return
  if (acc.length >= MAX_FILES) return

  let entries: fs.Dirent[] = []
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (acc.length >= MAX_FILES) break
    const full = path.join(dir, entry.name)
    if (shouldSkipPath(full)) continue

    if (entry.isDirectory()) {
      collectFiles(full, acc)
      continue
    }

    const ext = path.extname(entry.name).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) continue

    try {
      const stat = fs.statSync(full)
      if (stat.size > MAX_FILE_BYTES) continue
    } catch {
      continue
    }

    acc.push(full)
  }
}

// ─── Chunking ───────────────────────────────────────────────────────

function isHeadingLine(line: string): boolean {
  return /^#{1,4}\s/.test(line) || /^[A-Z][A-Z\s]{4,}$/.test(line.trim())
}

function chunkText(
  text: string,
  source: string,
  sourceType: ReferenceSourceType,
): ReferenceChunk[] {
  const chunks: ReferenceChunk[] = []
  const lines = text.split('\n')
  const priority = sourcePriority(sourceType)
  const relSource = path.relative(process.cwd(), source)

  let currentLines: string[] = []
  let currentTitle = path.basename(source, path.extname(source))
  let currentWords = 0

  const flushChunk = () => {
    if (currentWords < CHUNK_MIN_WORDS) return

    const content = currentLines.join('\n').trim()
    if (!content) return

    const normalized = content.toLowerCase()
    chunks.push({
      id: `ref:${relSource}:${chunks.length}`,
      source: relSource,
      sourceType,
      title: currentTitle.slice(0, 120),
      content: content.slice(0, CHUNK_MAX_WORDS * 8), // ~8 chars per word safety
      normalized,
      keywords: extractKeywords(content),
      scriptureRefs: extractScriptureRefs(content),
      priority,
      wordCount: currentWords,
    })
  }

  for (const line of lines) {
    const trimmed = line.trim()

    // Section boundary: heading line or significant blank after long content
    if (isHeadingLine(trimmed) && currentWords >= CHUNK_MIN_WORDS) {
      flushChunk()
      currentLines = []
      currentWords = 0
      currentTitle = trimmed.replace(/^#+\s*/, '').slice(0, 120)
    }

    currentLines.push(line)
    currentWords += wordCount(trimmed)

    // Target size reached — flush at next natural break
    if (currentWords >= CHUNK_TARGET_WORDS && trimmed === '') {
      flushChunk()
      currentLines = []
      currentWords = 0
    }

    // Hard limit
    if (currentWords >= CHUNK_MAX_WORDS) {
      flushChunk()
      currentLines = []
      currentWords = 0
    }
  }

  // Final chunk
  flushChunk()
  return chunks
}

// ─── Corpus building ────────────────────────────────────────────────

let cachedCorpus: ReferenceChunk[] | null = null

export function buildChunkedCorpus(root: string): ReferenceChunk[] {
  if (cachedCorpus) return cachedCorpus

  const files: string[] = []
  collectFiles(root, files)

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

    const fileChunks = chunkText(text, file, sourceType)
    for (const chunk of fileChunks) {
      if (corpus.length >= MAX_CHUNKS) break
      corpus.push(chunk)
    }
  }

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
