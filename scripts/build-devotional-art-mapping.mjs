#!/usr/bin/env node
/**
 * build-devotional-art-mapping.mjs
 *
 * Stage 3 of the 2026-05-07 image-swap migration.
 *
 * For each devotional JSON in public/devotionals/, pick the top-scored
 * library image by theme-keyword overlap. Convert to WebP, write to
 * public/images/site/devotional/<devotional-slug>.webp, and emit
 * src/data/site-devotional-art.ts mapping slug → ArtworkEntry[].
 *
 * The existing DEVOTIONAL_ARTWORKS[slug] map (from artwork-manifest.ts,
 * sourced from public/images/devotional-prints/ artist prints) becomes the
 * fallback. DevotionalPageClient is patched to prefer the new map when
 * non-empty.
 *
 * Per-devotional output: 2 art picks (interspersed at calculated insertion
 * points by DevotionalPageClient). 175 devotionals × 2 = up to 350 picks,
 * but reuse across devotionals is fine — the same library image can serve
 * multiple devotionals on the same theme.
 *
 * Idempotent: re-runnable. Each run rebuilds the WebP set + TS mapping.
 *
 * Sources:
 *   public/images/library/devotional/   (244 candidates)
 *   public/images/library/chapter-header/ (118 candidates — used as overflow)
 *   docs/image-library-catalog-2026-05-08.json (theme keywords per file)
 */

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const LIBRARY_DIR = path.join(ROOT, 'public/images/library')
const DEVOTIONAL_DIR = path.join(ROOT, 'public/devotionals')
const SITE_DIR = path.join(ROOT, 'public/images/site/devotional')
const CATALOG_PATH = path.join(ROOT, 'docs/image-library-catalog-2026-05-08.json')
const OUTPUT_TS = path.join(ROOT, 'src/data/site-devotional-art.ts')

const PICKS_PER_DEVOTIONAL = 2

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function convertToWebp(srcPng, dstWebp) {
  ensureDir(path.dirname(dstWebp))
  execSync(`cwebp -q 80 -quiet "${srcPng}" -o "${dstWebp}"`, { stdio: 'pipe' })
}

console.log('━━━ Stage 3: Devotional art mapping ━━━')
console.log()

// Load catalog (only need devotional + chapter-header surfaces)
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'))
const candidates = catalog.entries.filter((e) =>
  e.surface === 'devotional' || e.surface === 'chapter-header'
)
console.log(`Library candidates: ${candidates.length} (devotional + chapter-header)`)

// Load all devotionals
const devFiles = fs.readdirSync(DEVOTIONAL_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
console.log(`Devotionals: ${devFiles.length}`)
console.log()

// Build a slug-keyword map per devotional
function devKeywords(dev) {
  const tokens = new Set()
  const fields = [
    dev.title, dev.subtitle, dev.teaser, dev.theme, dev.framework,
    dev.scriptureReference, dev.anchorVerse,
  ]
  for (const f of fields) {
    if (typeof f !== 'string') continue
    for (const t of f.toLowerCase().split(/[^a-z]+/)) {
      if (t.length >= 4) tokens.add(t)
    }
  }
  // Add slug keywords
  if (dev.slug) {
    for (const t of dev.slug.toLowerCase().split('-')) {
      if (t.length >= 3 && !/^\d+$/.test(t)) tokens.add(t)
    }
  }
  return tokens
}

function score(devKw, candKw) {
  let s = 0
  for (const k of candKw) if (devKw.has(k)) s++
  return s
}

// Light per-devotional shuffle seed for variety when scores tie
function seededRand(seed) {
  let x = seed % 2147483647
  if (x <= 0) x += 2147483646
  return () => (x = (x * 16807) % 2147483647) / 2147483647
}

const mapping = {} // slug -> [{filename, score, libraryRel}, ...]
const useCounts = {} // filename -> times used (mild penalty for over-use)

for (const file of devFiles) {
  const devPath = path.join(DEVOTIONAL_DIR, file)
  const dev = JSON.parse(fs.readFileSync(devPath, 'utf8'))
  // Some devotionals don't have a slug field; derive from filename
  const slug = dev.slug || file.replace(/\.json$/, '')
  const devKw = devKeywords({ ...dev, slug })

  // Score every candidate
  const scored = candidates.map((c) => {
    const baseScore = score(devKw, new Set(c.keywords))
    const usagePenalty = (useCounts[c.filename] || 0) * 0.5
    return { ...c, score: baseScore - usagePenalty }
  }).sort((a, b) => b.score - a.score)

  // Pick top N (with tie-breaking by deterministic shuffle on slug hash)
  let seed = 0
  for (let i = 0; i < slug.length; i++) seed = ((seed * 31) + slug.charCodeAt(i)) | 0
  const rand = seededRand(Math.abs(seed) || 1)

  // From the top 8 scoring candidates, randomly pick PICKS_PER_DEVOTIONAL
  const topPool = scored.slice(0, Math.max(8, PICKS_PER_DEVOTIONAL))
  const picks = []
  while (picks.length < PICKS_PER_DEVOTIONAL && topPool.length > 0) {
    const idx = Math.floor(rand() * topPool.length)
    const pick = topPool.splice(idx, 1)[0]
    picks.push(pick)
    useCounts[pick.filename] = (useCounts[pick.filename] || 0) + 1
  }

  mapping[slug] = picks.map((p) => ({ ...p, devSlug: slug }))
}

console.log(`Built mapping for ${Object.keys(mapping).length} devotionals`)
const usageStats = Object.values(useCounts).reduce((a, b) => a + b, 0)
const uniquePicks = Object.keys(useCounts).length
console.log(`Used ${uniquePicks} unique library files (${usageStats} total picks, avg ${(usageStats / uniquePicks).toFixed(1)} reuses per file)`)
console.log()

// Convert each unique picked file to WebP at public/images/site/devotional/
ensureDir(SITE_DIR)
// Clear old contents
for (const f of fs.readdirSync(SITE_DIR).filter((f) => f.endsWith('.webp'))) {
  fs.unlinkSync(path.join(SITE_DIR, f))
}

const webpByFilename = {} // library filename -> /images/site/devotional/<webp basename>
for (const filename of Object.keys(useCounts)) {
  // Find the catalog entry to get library path
  const entry = candidates.find((c) => c.filename === filename)
  if (!entry) continue
  const src = path.join(ROOT, entry.libraryRel)
  // WebP filename = library filename, replace .png → .webp
  const webpName = filename.replace(/\.[^.]+$/, '.webp')
  const dst = path.join(SITE_DIR, webpName)
  convertToWebp(src, dst)
  webpByFilename[filename] = `/images/site/devotional/${webpName}`
}
console.log(`✓ converted ${Object.keys(webpByFilename).length} unique WebPs to ${path.relative(ROOT, SITE_DIR)}/`)

// Emit src/data/site-devotional-art.ts
const lines = []
lines.push('// Auto-generated by scripts/build-devotional-art-mapping.mjs')
lines.push('// Do not edit manually. Re-run the script to refresh.')
lines.push('//')
lines.push('// Maps each devotional slug → an array of ArtworkEntry-shaped picks')
lines.push('// from the new generated library (Stage 3 of the 2026-05-07')
lines.push('// image-swap migration).')
lines.push('//')
lines.push('// DevotionalPageClient prefers this map when non-empty, falling back')
lines.push('// to the legacy DEVOTIONAL_ARTWORKS[slug] (artist prints) when not set.')
lines.push('')
lines.push('import type { ArtworkEntry } from "./artwork-manifest"')
lines.push('')
lines.push('export const SITE_DEVOTIONAL_ART: Record<string, ArtworkEntry[]> = {')
for (const [slug, picks] of Object.entries(mapping).sort(([a], [b]) => a.localeCompare(b))) {
  if (picks.length === 0) continue
  const items = picks.map((p) => {
    const src = webpByFilename[p.filename]
    if (!src) return null
    const titleFromFilename = p.filename
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
    return `    { slug: ${JSON.stringify(p.filename.replace(/\.[^.]+$/, ''))}, title: ${JSON.stringify(titleFromFilename)}, artist: "Generated", year: "2026", medium: "single-ink illustration", museum: "", license: "Original", printStyle: "single-ink", src: ${JSON.stringify(src)}, rawSrc: ${JSON.stringify(src)}, relevance: "" }`
  }).filter(Boolean)
  if (items.length === 0) continue
  lines.push(`  ${JSON.stringify(slug)}: [`)
  for (const item of items) {
    lines.push(`${item},`)
  }
  lines.push(`  ],`)
}
lines.push('}')
lines.push('')

fs.writeFileSync(OUTPUT_TS, lines.join('\n'))
console.log(`✓ wrote ${path.relative(ROOT, OUTPUT_TS)}`)
console.log()
console.log('Done.')
