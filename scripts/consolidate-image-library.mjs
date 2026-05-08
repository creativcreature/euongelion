#!/usr/bin/env node
/**
 * consolidate-image-library.mjs
 *
 * Stage A of the 2026-05-07 image-swap migration plan.
 *
 * Walks both Gemini and Vertex generated-image batches, dedupes by FILENAME
 * (keeping one canonical per filename, preferring Gemini source when both
 * exist), tracks all SHA-1 variants in the catalog, categorizes by inferred
 * surface, extracts theme keywords, and emits:
 *
 *   public/images/library/<surface>/<filename>      (deduped staging tree, GITIGNORED)
 *   docs/image-library-catalog-2026-05-08.json      (machine-readable, TRACKED)
 *   docs/image-library-index-2026-05-08.md          (founder-readable, TRACKED)
 *
 * Why dedupe by filename: the 9 Vertex regional shards generate the same
 * theme prompts (ot-ezekiel-dry-bones, brand-halftone-waves, etc.) so the
 * "same logical image" exists 9× with bytewise different outputs (each region's
 * Imagen run produced a slightly different artistic interpretation). Treating
 * all 9 as separate entries explodes the catalog into ~4,500 noisy rows.
 *
 * Treating them as variants of one canonical filename gives the founder a
 * clean 1,404-row index with "+N variants" hints — the underlying SHA-1
 * variants are still in the catalog JSON for any tool that wants them later.
 *
 * Source dirs:
 *   public/images/generated-2026-05-04/        (Gemini, ~803 files, 1.3 GB)
 *   public/images/generated-2026-05-04-vertex/ (Vertex, ~3,755 files, 6.7 GB,
 *                                              _DISCARD_ excluded)
 *
 * Surface classification: see SURFACE_PATTERNS below.
 *
 * Run: node scripts/consolidate-image-library.mjs
 *
 * Idempotent — safe to re-run; rebuilds library/ from scratch each time.
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const SOURCES = [
  // Walk order matters: first source wins as canonical when filename collides.
  // Gemini quality is higher (curated set) so put it first.
  path.join(ROOT, 'public/images/generated-2026-05-04'),
  path.join(ROOT, 'public/images/generated-2026-05-04-vertex'),
]
const LIBRARY_DIR = path.join(ROOT, 'public/images/library')
const CATALOG_PATH = path.join(ROOT, 'docs/image-library-catalog-2026-05-08.json')
const INDEX_DOC_PATH = path.join(ROOT, 'docs/image-library-index-2026-05-08.md')

const SURFACE_PATTERNS = [
  // Subdirectory match takes precedence (highest priority)
  { surface: 'hero', test: (rel) => /\/(hero)\//i.test(rel) },
  { surface: 'chapter-header', test: (rel) => /\/(chapter-header)\//i.test(rel) },
  { surface: 'devotional', test: (rel) => /\/(devotional|art-remakes)\//i.test(rel) },
  { surface: 'decorative', test: (rel) => /\/(decorative)\//i.test(rel) },
  { surface: 'logo', test: (rel) => /\/(logo-system|seven-eyed-lamb|wordmark|lockup|marks-icons)\//i.test(rel) },
  { surface: 'poster', test: (rel) => /\/poster[-/]/i.test(rel) },
  // Filename prefix match (fallback)
  { surface: 'hero', test: (_rel, base) => /^(banner|mood|header|atmos|anon)[-_]/i.test(base) },
  { surface: 'chapter-header', test: (_rel, base) => /^(ot|nt|gospel\d?|beatitude|fruit|abraham|elijah|daniel|lamb-(flock|shepherd))[-_]/i.test(base) },
  { surface: 'devotional', test: (_rel, base) => /^(ed|paul|nt-.*-vertical|.*-vertical-flat)[-_]/i.test(base) },
  { surface: 'decorative', test: (_rel, base) => /^(sym|brand|element)[-_]/i.test(base) },
  { surface: 'logo', test: (_rel, base) => /^(lamb|wordmark|lockup)[-_]/i.test(base) },
]

const GENERIC_TOKENS = new Set([
  'banner', 'vertical', 'horizontal', 'flat', 'square', 'wide', 'ultra', 'ultrawide',
  'v1', 'v2', 'v3', 'v4', 'v5', 'final', 'preview', 'std',
  'png', 'jpg', 'jpeg', 'webp',
  'and', 'the', 'of', 'in', 'on', 'at', 'with', 'a', 'an',
])

function classifySurface(absPath) {
  const rel = absPath.replace(ROOT + '/', '')
  const base = path.basename(rel)
  for (const { surface, test } of SURFACE_PATTERNS) {
    if (test(rel, base)) return surface
  }
  return 'unsorted'
}

function extractKeywords(filename) {
  const stem = filename.replace(/\.[^.]+$/, '')
  return stem
    .split(/[-_/]+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t && !GENERIC_TOKENS.has(t) && !/^\d{1,3}$/.test(t))
}

function sha1OfFile(absPath) {
  const data = fs.readFileSync(absPath)
  return crypto.createHash('sha1').update(data).digest('hex')
}

function* walk(dir) {
  if (!fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.startsWith('_DISCARD')) continue
      if (entry.name === '.DS_Store') continue
      yield* walk(full)
    } else if (entry.isFile()) {
      if (entry.name.startsWith('.')) continue
      if (!/\.(png|jpg|jpeg|webp|svg)$/i.test(entry.name)) continue
      yield full
    }
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function copyFileLink(src, dst) {
  ensureDir(path.dirname(dst))
  if (fs.existsSync(dst)) fs.unlinkSync(dst)
  try {
    fs.linkSync(src, dst)
  } catch {
    fs.copyFileSync(src, dst)
  }
}

console.log('━━━ Stage A: Library consolidation ━━━')
console.log()

if (fs.existsSync(LIBRARY_DIR)) {
  console.log(`Clearing existing ${LIBRARY_DIR}...`)
  fs.rmSync(LIBRARY_DIR, { recursive: true, force: true })
}
ensureDir(LIBRARY_DIR)

// Two-stage dedupe:
//   Pass 1: walk all sources, group by FILENAME, collect every variant
//   Pass 2: choose canonical (first encountered = Gemini-preferred), copy to library/
const byFilename = new Map() // filename -> { canonical, variants[] }
let totalScanned = 0

for (const source of SOURCES) {
  if (!fs.existsSync(source)) {
    console.warn(`⚠ source not found: ${source}`)
    continue
  }
  const sourceLabel = path.basename(source)
  console.log(`Walking ${sourceLabel}...`)
  let countThisSource = 0
  for (const absPath of walk(source)) {
    totalScanned++
    countThisSource++
    const filename = path.basename(absPath)
    const stat = fs.statSync(absPath)
    const variant = {
      sourceRel: path.relative(ROOT, absPath),
      bytes: stat.size,
      sha1: sha1OfFile(absPath),
    }
    if (!byFilename.has(filename)) {
      byFilename.set(filename, { canonical: absPath, variants: [variant] })
    } else {
      byFilename.get(filename).variants.push(variant)
    }
  }
  console.log(`  scanned ${countThisSource} files`)
}

console.log()
console.log(`Total scanned:      ${totalScanned}`)
console.log(`Unique filenames:   ${byFilename.size}`)
console.log(`Variant explosion:  ${totalScanned - byFilename.size} extra regional/run variants tracked`)
console.log()

// Build catalog + copy canonicals
const catalog = []
const bySurface = {}
for (const [filename, { canonical, variants }] of byFilename) {
  const surface = classifySurface(canonical)
  bySurface[surface] = (bySurface[surface] || 0) + 1
  const stat = fs.statSync(canonical)
  const sourceLabel = path.basename(SOURCES.find((s) => canonical.startsWith(s)) || '')
  const dstPath = path.join(LIBRARY_DIR, surface, filename)
  copyFileLink(canonical, dstPath)
  catalog.push({
    filename,
    surface,
    canonicalSourceRel: path.relative(ROOT, canonical),
    canonicalSourceBatch: sourceLabel,
    canonicalBytes: stat.size,
    libraryRel: path.relative(ROOT, dstPath),
    keywords: extractKeywords(filename),
    variantCount: variants.length,
    variants, // [{ sourceRel, bytes, sha1 }, ...]
  })
}

console.log('Per-surface counts (unique filenames):')
for (const [surface, count] of Object.entries(bySurface).sort()) {
  console.log(`  ${surface.padEnd(16)} ${count}`)
}
console.log()

ensureDir(path.dirname(CATALOG_PATH))
fs.writeFileSync(CATALOG_PATH, JSON.stringify({
  generatedAt: new Date().toISOString(),
  sources: SOURCES.map((s) => path.relative(ROOT, s)),
  totalScanned,
  uniqueFilenames: byFilename.size,
  perSurface: bySurface,
  entries: catalog,
}, null, 2))
console.log(`✓ wrote ${path.relative(ROOT, CATALOG_PATH)}`)

// Founder-readable markdown index
const sortedSurfaces = Object.keys(bySurface).sort()
const lines = []
lines.push('# Image Library Index — Stage A consolidation (2026-05-07)')
lines.push('')
lines.push(`Generated: ${new Date().toISOString()}`)
lines.push('')
lines.push('## Summary')
lines.push('')
lines.push(`- **Total files scanned across both batches:** ${totalScanned}`)
lines.push(`- **Unique filenames (canonical entries):** ${byFilename.size}`)
lines.push(`- **Regional/run variants tracked:** ${totalScanned - byFilename.size} (see catalog \`variants[]\` field per entry)`)
lines.push('')
lines.push('### Per-surface counts')
lines.push('')
lines.push('| Surface | Count |')
lines.push('| --- | ---: |')
for (const surface of sortedSurfaces) {
  lines.push(`| ${surface} | ${bySurface[surface]} |`)
}
lines.push('')
lines.push('### Sources')
lines.push('')
lines.push('- `public/images/generated-2026-05-04/` (Gemini 3 Pro batch — preferred when filename collides)')
lines.push('- `public/images/generated-2026-05-04-vertex/` (Vertex Imagen 4 batch, `_DISCARD_*` excluded)')
lines.push('')
lines.push('Catalog data (machine-readable): `docs/image-library-catalog-2026-05-08.json`')
lines.push('Staging tree (gitignored): `public/images/library/<surface>/<filename>`')
lines.push('')
lines.push('---')
lines.push('')
lines.push('## How to use this index')
lines.push('')
lines.push('Each surface section below lists every canonical filename + theme keywords +')
lines.push('how many regional/run variants exist. To **mark a file as skip** (English overlay,')
lines.push('off-brand, etc.), add a leading `~~` to its row (markdown strikethrough). The')
lines.push('mapping scripts (Stage 2 + Stage 3) honor `~~` rows by excluding them from')
lines.push('candidate selection.')
lines.push('')
lines.push('To **prefer a non-canonical variant**, look up the file in the catalog JSON and')
lines.push('re-copy from `variants[N].sourceRel` to `public/images/site/<surface>/<filename>`.')
lines.push('')
lines.push('---')
lines.push('')

for (const surface of sortedSurfaces) {
  const surfaceEntries = catalog
    .filter((e) => e.surface === surface)
    .sort((a, b) => a.filename.localeCompare(b.filename))
  lines.push(`## ${surface} (${surfaceEntries.length} canonical files)`)
  lines.push('')
  lines.push('| File | Source | Size (KB) | Variants | Theme keywords |')
  lines.push('| --- | --- | ---: | ---: | --- |')
  for (const e of surfaceEntries) {
    const kb = Math.round(e.canonicalBytes / 1024)
    const kw = e.keywords.slice(0, 8).join(', ')
    const sourceLabel = e.canonicalSourceBatch.includes('vertex') ? 'vertex' : 'gemini'
    const variantHint = e.variantCount > 1 ? `${e.variantCount}` : '1'
    lines.push(`| \`${e.filename}\` | ${sourceLabel} | ${kb} | ${variantHint} | ${kw} |`)
  }
  lines.push('')
}

ensureDir(path.dirname(INDEX_DOC_PATH))
fs.writeFileSync(INDEX_DOC_PATH, lines.join('\n'))
console.log(`✓ wrote ${path.relative(ROOT, INDEX_DOC_PATH)}`)
console.log()
console.log('Done.')
