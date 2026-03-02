/**
 * Shared pure utilities for reference library indexing and retrieval.
 *
 * Both reference-retriever.ts (runtime retrieval) and
 * scripts/build-reference-index.ts (build-time indexing) use identical
 * scripture detection, keyword extraction, source classification, file
 * collection, and text chunking logic. This module deduplicates those
 * foundations while letting each consumer own its own constants (chunk
 * sizes, file limits, skip lists) via parameterized interfaces.
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

/** Chunk shape produced by text chunking — no derived fields like `normalized`. */
export interface BaseChunk {
  id: string
  source: string
  sourceType: ReferenceSourceType
  title: string
  content: string
  keywords: string[]
  scriptureRefs: string[]
  priority: number
  wordCount: number
}

// ─── Constants ──────────────────────────────────────────────────────

export const STOP_WORDS = new Set([
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

/** Matches common English Bible book abbreviations with chapter/verse. */
export const SCRIPTURE_REF_PATTERN =
  /\b(?:(?:1|2|3|I|II|III)\s+)?(?:Gen(?:esis)?|Exod(?:us)?|Lev(?:iticus)?|Num(?:bers)?|Deut(?:eronomy)?|Josh(?:ua)?|Judg(?:es)?|Ruth|(?:1|2)\s*Sam(?:uel)?|(?:1|2)\s*Kgs?|(?:1|2)\s*Chr(?:on)?|Ezra|Neh(?:emiah)?|Esth(?:er)?|Job|Ps(?:alm)?s?|Prov(?:erbs)?|Eccl(?:es)?|Song|Isa(?:iah)?|Jer(?:emiah)?|Lam(?:entations)?|Ezek(?:iel)?|Dan(?:iel)?|Hos(?:ea)?|Joel|Amos|Obad(?:iah)?|Jon(?:ah)?|Mic(?:ah)?|Nah(?:um)?|Hab(?:akkuk)?|Zeph(?:aniah)?|Hag(?:gai)?|Zech(?:ariah)?|Mal(?:achi)?|Matt(?:hew)?|Mark|Luke|John|Acts|Rom(?:ans)?|(?:1|2)\s*Cor(?:inthians)?|Gal(?:atians)?|Eph(?:esians)?|Phil(?:ippians)?|Col(?:ossians)?|(?:1|2)\s*Thess(?:alonians)?|(?:1|2)\s*Tim(?:othy)?|Tit(?:us)?|Phlm|Philemon|Heb(?:rews)?|Jas|James|(?:1|2)\s*Pet(?:er)?|(?:1|2|3)\s*Jn|Jude|Rev(?:elation)?)\s+\d+(?:[:.]\d+)?(?:\s*[-–]\s*\d+)?/gi

// ─── Pure utility functions ─────────────────────────────────────────

export function extractScriptureRefs(text: string): string[] {
  const matches = text.match(SCRIPTURE_REF_PATTERN) || []
  return [...new Set(matches.map((m) => m.trim()))]
}

export function extractKeywords(text: string): string[] {
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

export function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length
}

/**
 * Detect whether a chunk is metadata/scaffolding rather than theological content.
 * Filters out document headers, table-of-contents entries, expansion protocols,
 * version control tables, and placeholder text that should never appear in
 * devotional output.
 */
export function isMetadataChunk(content: string): boolean {
  // Short chunks with metadata markers are almost always scaffolding
  const lower = content.toLowerCase()
  const wc = wordCount(content)

  // Document control / version tables
  if (/\|\s*version\s*\|\s*date\s*\|/i.test(content)) return true
  if (/document control/i.test(content) && wc < 150) return true
  if (/expansion protocol/i.test(content)) return true

  // Placeholder / scaffold text
  if (/to be expanded as content is created/i.test(content)) return true
  if (/how to use this document/i.test(content)) return true
  if (/quality over quantity.*only verified/i.test(content)) return true
  if (/source-verified/i.test(content) && /citation format/i.test(content))
    return true

  // File headers that are just metadata
  if (/^#\s+euongelion/im.test(content) && wc < 100) return true

  // Project Gutenberg / CCEL boilerplate headers
  if (/project gutenberg e?book/i.test(content) && wc < 150) return true
  if (
    /^\s*_{3,}/m.test(content) &&
    /title:/i.test(content) &&
    /creator/i.test(content) &&
    wc < 150
  )
    return true

  // Bullet-point-only index sections (no prose, just references)
  if (wc < 100) {
    const lines = content.split('\n').filter((l) => l.trim().length > 0)
    const bulletLines = lines.filter((l) => /^\s*[-*]\s/.test(l))
    if (bulletLines.length > lines.length * 0.6) return true
  }

  // Verification notes section
  if (
    /quotes requiring attribution/i.test(lower) &&
    /attribution.*disputed/i.test(lower)
  )
    return true

  // PART 4: VERIFICATION NOTES and similar metadata sections
  if (/## PART \d+:\s*VE/i.test(content)) return true

  return false
}

/**
 * Detect reference source type from file path.
 * Uses both platform-native path.sep and forward slashes for cross-platform safety.
 */
export function detectSourceType(filePath: string): ReferenceSourceType {
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

export function sourcePriority(sourceType: ReferenceSourceType): number {
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

export function isHeadingLine(line: string): boolean {
  return /^#{1,4}\s/.test(line) || /^[A-Z][A-Z\s]{4,}$/.test(line.trim())
}

// ─── File collection ────────────────────────────────────────────────

export interface CollectFilesOptions {
  skipSegments: Set<string>
  allowedExtensions: Set<string>
  maxFiles: number
  maxFileBytes: number
}

export function shouldSkipPath(
  target: string,
  skipSegments: Set<string>,
): boolean {
  const segments = target.split(path.sep)
  return segments.some((s) => skipSegments.has(s))
}

export function collectFiles(
  dir: string,
  acc: string[],
  options: CollectFilesOptions,
): void {
  if (!fs.existsSync(dir)) return
  if (shouldSkipPath(dir, options.skipSegments)) return
  if (acc.length >= options.maxFiles) return

  let entries: fs.Dirent[] = []
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (acc.length >= options.maxFiles) break
    const full = path.join(dir, entry.name)
    if (shouldSkipPath(full, options.skipSegments)) continue

    if (entry.isDirectory()) {
      collectFiles(full, acc, options)
      continue
    }

    const ext = path.extname(entry.name).toLowerCase()
    if (!options.allowedExtensions.has(ext)) continue

    try {
      const stat = fs.statSync(full)
      if (stat.size > options.maxFileBytes) continue
    } catch {
      continue
    }

    acc.push(full)
  }
}

// ─── Text chunking ──────────────────────────────────────────────────

export interface ChunkingOptions {
  minWords: number
  maxWords: number
  targetWords: number
}

/**
 * Split text into semantic chunks at heading and paragraph boundaries.
 *
 * Returns BaseChunk[] without derived fields (e.g. `normalized`).
 * Consumers add their own extensions as needed.
 */
export function chunkText(
  text: string,
  source: string,
  sourceType: ReferenceSourceType,
  options: ChunkingOptions,
): BaseChunk[] {
  const chunks: BaseChunk[] = []
  const lines = text.split('\n')
  const priority = sourcePriority(sourceType)
  const relSource = path.relative(process.cwd(), source)

  let currentLines: string[] = []
  let currentTitle = path.basename(source, path.extname(source))
  let currentWords = 0

  const flushChunk = () => {
    if (currentWords < options.minWords) return

    const content = currentLines.join('\n').trim()
    if (!content) return

    chunks.push({
      id: `ref:${relSource}:${chunks.length}`,
      source: relSource,
      sourceType,
      title: currentTitle.slice(0, 120),
      content: content.slice(0, options.maxWords * 8),
      keywords: extractKeywords(content),
      scriptureRefs: extractScriptureRefs(content),
      priority,
      wordCount: currentWords,
    })
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (isHeadingLine(trimmed) && currentWords >= options.minWords) {
      flushChunk()
      currentLines = []
      currentWords = 0
      currentTitle = trimmed.replace(/^#+\s*/, '').slice(0, 120)
    }

    currentLines.push(line)
    currentWords += wordCount(trimmed)

    if (currentWords >= options.targetWords && trimmed === '') {
      flushChunk()
      currentLines = []
      currentWords = 0
    }

    if (currentWords >= options.maxWords) {
      flushChunk()
      currentLines = []
      currentWords = 0
    }
  }

  flushChunk()
  return chunks
}
