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

// Load catalog
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'))

// FOUNDER CURATION RULE (2026-05-08):
// Restrict to brand-aesthetic single-ink/halftone/limited-palette
// imagery only. Per the founder's reference (cracked-earth blue-halftone
// scapegoat), the site uses ONLY the decorative single-ink subset of
// the library — sym-*, obj-*, brand-*, element-* prefixes. Realistic
// narrative illustrations (story-*, parable-*, gen-*, ed-*, plus all
// of devotional/, chapter-header/, hero/, poster/) are EXCLUDED entirely.
// No Pillow treatment is applied — files are used as-generated.
const BRAND_AESTHETIC_PREFIXES = /^(sym|obj|brand|element)[-_]/
const candidates = catalog.entries.filter(
  (e) => e.surface === 'decorative' && BRAND_AESTHETIC_PREFIXES.test(e.filename)
)
console.log(`Library curation: ${catalog.entries.length} total → ${candidates.length} brand-aesthetic candidates`)
console.log(`  prefixes kept: sym-*, obj-*, brand-*, element-* (single-ink, halftone, limited palette)`)

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
  // Add slug keywords (heavily weighted later via multi-counting)
  if (dev.slug) {
    for (const t of dev.slug.toLowerCase().split('-')) {
      if (t.length >= 3 && !/^\d+$/.test(t)) tokens.add(t)
    }
  }
  // Pull biblical book + character names from scripture anchor
  // (e.g. "Matthew 6:33" → ["matthew", "matt"])
  const sr = (dev.scriptureReference || dev.anchorVerse || '')
  const bookMatch = sr.match(/^([1-3]?\s*[A-Za-z]+)/)
  if (bookMatch) {
    const book = bookMatch[1].toLowerCase().replace(/\s+/g, '')
    tokens.add(book)
    // Common name expansions (matt → matthew, ex → exodus, gen → genesis)
    const expansions = {
      gen: 'genesis', ex: 'exodus', lev: 'leviticus', num: 'numbers',
      deut: 'deuteronomy', josh: 'joshua', judg: 'judges', sam: 'samuel',
      ki: 'kings', chron: 'chronicles', neh: 'nehemiah', esth: 'esther',
      ps: 'psalm', prov: 'proverbs', eccl: 'ecclesiastes',
      song: 'songs', isa: 'isaiah', jer: 'jeremiah', lam: 'lamentations',
      ezek: 'ezekiel', dan: 'daniel', hos: 'hosea',
      matt: 'matthew', mk: 'mark', lk: 'luke', jn: 'john',
      rom: 'romans', cor: 'corinthians', gal: 'galatians',
      eph: 'ephesians', phil: 'philippians', col: 'colossians',
      thess: 'thessalonians', tim: 'timothy', tit: 'titus',
      heb: 'hebrews', jas: 'james', pet: 'peter', rev: 'revelation',
    }
    for (const [k, v] of Object.entries(expansions)) {
      if (book.startsWith(k)) tokens.add(v)
    }
  }
  return tokens
}

// Heavier weight for tokens that appear in BOTH the slug (high-signal)
// AND the candidate filename. Slug tokens count 3×, generic title/scripture
// tokens count 1×. This pushes contextually-specific matches above generic
// ones (avoids "vine" matching every devotional that mentions "wine").
function score(devKw, candKw, devSlugTokens) {
  let s = 0
  for (const k of candKw) {
    if (devSlugTokens.has(k)) s += 3
    else if (devKw.has(k)) s += 1
  }
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

  // Build the slug-token set (for high-weight scoring)
  const slugTokens = new Set(
    slug.toLowerCase().split('-').filter((t) => t.length >= 3 && !/^\d+$/.test(t))
  )

  // Score every candidate. A specific match (slug token in candidate
  // filename) outweighs a generic title/keyword match by 3×, so a
  // devotional about "vineyard" gets `banner-vineyard-rows.png` over
  // `banner-stone-tomb-dawn.png` even if both have one weak match.
  const scored = candidates.map((c) => {
    const baseScore = score(devKw, new Set(c.keywords), slugTokens)
    const usagePenalty = (useCounts[c.filename] || 0) * 0.5
    return { ...c, score: baseScore - usagePenalty }
  }).sort((a, b) => b.score - a.score)

  // Pick top N (with tie-breaking by deterministic shuffle on slug hash)
  let seed = 0
  for (let i = 0; i < slug.length; i++) seed = ((seed * 31) + slug.charCodeAt(i)) | 0
  const rand = seededRand(Math.abs(seed) || 1)

  // Pick strategy:
  //   1. If any candidate has score > 0 (keyword overlap), prefer those.
  //   2. ALWAYS fill PICKS_PER_DEVOTIONAL slots — fall back to a
  //      deterministic round-robin from the full curated set when
  //      scoring exhausts. Curated set is small (~134); every devotional
  //      will get its full pick count even with no thematic match.
  //   3. Top-scored slot is deterministic (no shuffle); remaining slots
  //      shuffle within a window for variety.
  const picks = []
  const pickedFilenames = new Set()
  const scoredPool = scored.filter((c) => c.score > 0).slice(0, 12)

  // Slot 1: top-scored if available
  if (scoredPool.length > 0) {
    const top = scoredPool.shift()
    picks.push(top)
    pickedFilenames.add(top.filename)
    useCounts[top.filename] = (useCounts[top.filename] || 0) + 1
  }

  // Remaining slots from scored pool with shuffle
  while (picks.length < PICKS_PER_DEVOTIONAL && scoredPool.length > 0) {
    const window = scoredPool.slice(0, 5)
    const idx = Math.floor(rand() * window.length)
    const pick = window[idx]
    picks.push(pick)
    pickedFilenames.add(pick.filename)
    scoredPool.splice(scoredPool.indexOf(pick), 1)
    useCounts[pick.filename] = (useCounts[pick.filename] || 0) + 1
  }

  // Fallback: fill from the FULL curated subset, sorted by use-count
  // (least-used first) + deterministic shuffle for tie-breaking. This
  // keeps the brand aesthetic consistent — every slot gets a sym/obj/
  // brand/element pick even when no keyword match scored.
  if (picks.length < PICKS_PER_DEVOTIONAL) {
    const fallbackPool = candidates
      .filter((c) => !pickedFilenames.has(c.filename))
      .map((c) => ({
        ...c,
        useCount: useCounts[c.filename] || 0,
        // Deterministic per-devotional jitter for tie-breaking
        jitter: rand(),
      }))
      .sort((a, b) => {
        if (a.useCount !== b.useCount) return a.useCount - b.useCount
        return a.jitter - b.jitter
      })
    while (picks.length < PICKS_PER_DEVOTIONAL && fallbackPool.length > 0) {
      const pick = fallbackPool.shift()
      picks.push(pick)
      pickedFilenames.add(pick.filename)
      useCounts[pick.filename] = (useCounts[pick.filename] || 0) + 1
    }
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
