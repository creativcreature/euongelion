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
const ALLOWED_EXTENSIONS = new Set(['.md', '.markdown', '.txt'])
const MAX_FILE_BYTES = 4 * 1024 * 1024
const MAX_FILES = 300
const MAX_CHUNKS = 5_000

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

  const allChunks: IndexedChunk[] = []

  for (const file of files) {
    if (allChunks.length >= MAX_CHUNKS) break

    let text = ''
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }

    const sourceType = detectSourceType(file)
    const fileChunks = chunkText(text, file, sourceType, CHUNKING_OPTIONS)

    for (const chunk of fileChunks) {
      if (allChunks.length >= MAX_CHUNKS) break
      allChunks.push(chunk)
    }
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
