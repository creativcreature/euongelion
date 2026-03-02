#!/usr/bin/env tsx
/**
 * expand-reference-index.ts
 *
 * Grows public/reference-index.json with additional licensed/public-domain
 * reference materials, chunked with metadata for Soul Audit retrieval.
 *
 * Usage:
 *   npx tsx scripts/expand-reference-index.ts
 *   npx tsx scripts/expand-reference-index.ts --source content/reference-additions
 *   npx tsx scripts/expand-reference-index.ts --source content/reference,content/reference-additions --target 10000
 */

import fs from 'fs'
import path from 'path'
import {
  type BaseChunk,
  chunkText,
  collectFiles,
  detectSourceType,
  extractKeywords,
  isMetadataChunk,
} from '../src/lib/soul-audit/reference-utils'

const DEFAULT_SOURCES = ['content/reference']
const DEFAULT_OUTPUT = 'public/reference-index.json'
const DEFAULT_TARGET = 10_000

const SKIP_SEGMENTS = new Set(['.git', 'node_modules', 'stepbible-data'])
const ALLOWED_EXTENSIONS = new Set(['.md', '.markdown', '.txt', '.json'])
const MAX_FILE_BYTES = 6 * 1024 * 1024
const MAX_FILES = 20_000

const CHUNKING_OPTIONS = {
  minWords: 40,
  maxWords: 800,
  targetWords: 350,
}

type Args = {
  sources: string[]
  output: string
  target: number
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    sources: [...DEFAULT_SOURCES],
    output: DEFAULT_OUTPUT,
    target: DEFAULT_TARGET,
  }

  for (let i = 0; i < argv.length; i++) {
    const value = argv[i]
    if (value === '--source' && argv[i + 1]) {
      args.sources = argv[i + 1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      i++
      continue
    }
    if (value === '--output' && argv[i + 1]) {
      args.output = argv[i + 1]
      i++
      continue
    }
    if (value === '--target' && argv[i + 1]) {
      const parsed = Number.parseInt(argv[i + 1], 10)
      if (Number.isFinite(parsed) && parsed > 0) {
        args.target = parsed
      }
      i++
    }
  }

  return args
}

function loadExisting(outputPath: string): BaseChunk[] {
  if (!fs.existsSync(outputPath)) return []
  try {
    const raw = fs.readFileSync(outputPath, 'utf8')
    const parsed = JSON.parse(raw) as BaseChunk[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function collectReferenceFiles(sources: string[]): string[] {
  const files: string[] = []
  for (const source of sources) {
    const abs = path.join(process.cwd(), source)
    if (!fs.existsSync(abs)) {
      console.warn(`[expand-reference-index] source missing: ${source}`)
      continue
    }
    collectFiles(abs, files, {
      skipSegments: SKIP_SEGMENTS,
      allowedExtensions: ALLOWED_EXTENSIONS,
      maxFileBytes: MAX_FILE_BYTES,
      maxFiles: MAX_FILES,
    })
  }
  return files
}

function toChunkText(file: string): string {
  const raw = fs.readFileSync(file, 'utf8')
  if (!file.endsWith('.json')) return raw

  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'string') return parsed
    return JSON.stringify(parsed, null, 2)
  } catch {
    return raw
  }
}

function buildChunks(files: string[]): BaseChunk[] {
  const built: BaseChunk[] = []

  for (const file of files) {
    let text = ''
    try {
      text = toChunkText(file)
    } catch {
      continue
    }

    const sourceType = detectSourceType(file)
    const chunks = chunkText(text, file, sourceType, CHUNKING_OPTIONS)

    for (const chunk of chunks) {
      if (isMetadataChunk(chunk.content)) continue
      if (!chunk.keywords || chunk.keywords.length === 0) {
        chunk.keywords = extractKeywords(chunk.content)
      }
      const slimChunk: BaseChunk = { ...chunk }
      delete slimChunk.contextualizedContent
      built.push(slimChunk)
    }
  }

  return built
}

function dedupeChunks(chunks: BaseChunk[]): BaseChunk[] {
  const byId = new Map<string, BaseChunk>()
  const byContent = new Set<string>()

  for (const chunk of chunks) {
    if (!chunk?.id || !chunk.content) continue
    const contentKey = chunk.content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1200)
    if (byContent.has(contentKey)) continue
    if (byId.has(chunk.id)) continue

    byId.set(chunk.id, chunk)
    byContent.add(contentKey)
  }

  return Array.from(byId.values())
}

function summarize(chunks: BaseChunk[]) {
  const byType = new Map<string, number>()
  let words = 0

  for (const chunk of chunks) {
    words += chunk.wordCount || chunk.content.split(/\s+/).filter(Boolean).length
    byType.set(chunk.sourceType, (byType.get(chunk.sourceType) || 0) + 1)
  }

  return {
    totalChunks: chunks.length,
    totalWords: words,
    byType,
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const outputPath = path.join(process.cwd(), args.output)

  console.log(`[expand-reference-index] sources: ${args.sources.join(', ')}`)
  console.log(`[expand-reference-index] output: ${args.output}`)
  console.log(`[expand-reference-index] target chunks: ${args.target}`)

  const existing = loadExisting(outputPath)
  console.log(`[expand-reference-index] existing chunks: ${existing.length}`)

  const files = collectReferenceFiles(args.sources)
  console.log(`[expand-reference-index] files discovered: ${files.length}`)

  const newChunks = buildChunks(files)
  console.log(`[expand-reference-index] new raw chunks: ${newChunks.length}`)

  const merged = dedupeChunks([...existing, ...newChunks])
  const capped = merged.slice(0, args.target)

  const outDir = path.dirname(outputPath)
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  fs.writeFileSync(outputPath, JSON.stringify(capped), 'utf8')

  const stats = summarize(capped)
  const sizeMb = (Buffer.byteLength(JSON.stringify(capped), 'utf8') / 1024 / 1024).toFixed(2)

  console.log(`[expand-reference-index] final chunks: ${stats.totalChunks}`)
  console.log(`[expand-reference-index] estimated words: ${stats.totalWords.toLocaleString()}`)
  console.log(`[expand-reference-index] file size: ${sizeMb} MB`)
  console.log('[expand-reference-index] source-type distribution:')
  for (const [type, count] of stats.byType.entries()) {
    console.log(`  - ${type}: ${count}`)
  }
}

main()
