#!/usr/bin/env tsx
/**
 * build-reference-index.ts
 *
 * Pre-indexes content/reference/ (commentaries, theology) into a compact JSON
 * file at public/reference-index.json. This file IS deployed to Vercel, giving
 * the generative devotional pipeline access to reference library material on
 * production where content/reference/ is gitignored and unavailable.
 *
 * Run: npx tsx scripts/build-reference-index.ts
 *
 * Output: public/reference-index.json (~500KB–2MB depending on library size)
 */

import fs from 'fs'
import path from 'path'
import {
  type BaseChunk,
  type ReferenceSourceType,
  chunkText,
  collectFiles,
  detectSourceType,
  isMetadataChunk,
} from '../src/lib/soul-audit/reference-utils'

// ─── Build-specific constants ────────────────────────────────────────
// Tighter limits than runtime retriever: the index must stay small enough
// to deploy as a static JSON file on Vercel.

const SKIP_SEGMENTS = new Set([
  '.git',
  'stepbible-data',
  'node_modules',
  'bibles',
  'lexicons',
])

/** Files that are documentation/metadata, not theological source material. */
const SKIP_FILENAMES = new Set(['README.md', 'readme.md', 'CHANGELOG.md'])
const ALLOWED_EXTENSIONS = new Set(['.md', '.markdown', '.txt'])
const MAX_FILE_BYTES = 4 * 1024 * 1024
const MAX_FILES = 300
const MAX_CHUNKS = 8_000

const COLLECT_OPTIONS = {
  skipSegments: SKIP_SEGMENTS,
  allowedExtensions: ALLOWED_EXTENSIONS,
  maxFiles: MAX_FILES,
  maxFileBytes: MAX_FILE_BYTES,
}

const CHUNKING_OPTIONS = {
  minWords: 40,
  maxWords: 600,
  targetWords: 300,
}

// ─── Types ──────────────────────────────────────────────────────────

/** Output shape — same as BaseChunk. Alias kept for serialization clarity. */
type IndexedChunk = BaseChunk

// ─── Main ───────────────────────────────────────────────────────────

function main() {
  const referenceRoot = path.join(process.cwd(), 'content', 'reference')
  const outputPath = path.join(process.cwd(), 'public', 'reference-index.json')

  if (!fs.existsSync(referenceRoot)) {
    console.error(`Reference library not found at ${referenceRoot}`)
    console.error(
      'Run ./scripts/sync-reference.sh to download from Supabase first.',
    )
    process.exit(1)
  }

  console.log(`Indexing reference library at: ${referenceRoot}`)
  console.log(`Skipping: ${[...SKIP_SEGMENTS].join(', ')}`)

  const files: string[] = []
  collectFiles(referenceRoot, files, COLLECT_OPTIONS)
  console.log(`Found ${files.length} files to index`)

  // First pass: collect all chunks grouped by author/source directory
  const chunksByAuthor = new Map<string, IndexedChunk[]>()

  for (const file of files) {
    // Skip documentation files
    const basename = path.basename(file)
    if (SKIP_FILENAMES.has(basename)) continue

    let text = ''
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }

    const sourceType = detectSourceType(file)
    const fileChunks = chunkText(text, file, sourceType, CHUNKING_OPTIONS)

    // Determine author key from path (e.g. "commentaries/augustine")
    const relPath = path.relative(referenceRoot, file)
    const parts = relPath.split(path.sep)
    const authorKey = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : relPath

    for (const chunk of fileChunks) {
      if (isMetadataChunk(chunk.content)) continue
      const existing = chunksByAuthor.get(authorKey) || []
      existing.push(chunk)
      chunksByAuthor.set(authorKey, existing)
    }
  }

  // Second pass: distribute chunks across authors to ensure diversity.
  // Cap each author at MAX_PER_AUTHOR to prevent any one source from
  // dominating the index.
  const MAX_PER_AUTHOR = Math.max(
    200,
    Math.floor(MAX_CHUNKS / chunksByAuthor.size),
  )

  const allChunks: IndexedChunk[] = []
  for (const [authorKey, chunks] of chunksByAuthor.entries()) {
    const capped = chunks.slice(0, MAX_PER_AUTHOR)
    console.log(
      `  ${authorKey}: ${capped.length} chunks (of ${chunks.length} total)`,
    )
    allChunks.push(...capped)
  }

  // Stats
  const byType: Record<string, number> = {}
  let totalWords = 0
  for (const chunk of allChunks) {
    byType[chunk.sourceType] = (byType[chunk.sourceType] || 0) + 1
    totalWords += chunk.wordCount
  }

  console.log(`\nIndexed ${allChunks.length} chunks:`)
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count} chunks`)
  }
  console.log(`  Total words: ${totalWords.toLocaleString()}`)

  // Write compact JSON (no pretty-printing to save space)
  const json = JSON.stringify(allChunks)
  fs.writeFileSync(outputPath, json, 'utf8')

  const sizeMB = (Buffer.byteLength(json, 'utf8') / 1024 / 1024).toFixed(2)
  console.log(`\nOutput: ${outputPath} (${sizeMB} MB)`)
  console.log(
    'This file is deployed to Vercel and used by the reference retriever.',
  )
}

main()
