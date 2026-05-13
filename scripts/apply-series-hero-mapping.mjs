#!/usr/bin/env node
/**
 * apply-series-hero-mapping.mjs
 *
 * Stage 2 of the 2026-05-07 image-swap migration.
 *
 * For each of the 32 series in src/data/series.ts:
 *   1. Look up the picked library image in MAPPING below.
 *   2. Convert source PNG → WebP at quality 80, write to
 *      public/images/site/series/<slug>.webp
 *   3. Patch src/data/series.ts in place to add/update
 *      heroImage: '/images/site/series/<slug>.webp'
 *
 * Idempotent: if heroImage already points at the right path, nothing changes.
 *
 * Sources are filenames in public/images/library/<surface>/<filename>.
 * The library is built by scripts/consolidate-image-library.mjs (Stage A).
 *
 * To re-pick a single series, edit MAPPING and re-run.
 */

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const LIBRARY_DIR = path.join(ROOT, 'public/images/library')
const SERIES_DIR = path.join(ROOT, 'public/images/site/series')
const SERIES_TS = path.join(ROOT, 'src/data/series.ts')

// slug → library filename (relative to public/images/library/<surface>/)
const MAPPING = {
  // 7 Wake-Up Magazine series (originals)
  'identity':                              { surface: 'chapter-header', file: 'figure-prophet-wilderness.png' },
  'peace':                                 { surface: 'chapter-header', file: 'fruit-03-peace-dove-boat.png' },
  'community':                             { surface: 'chapter-header', file: 'community-circle-prayer.png' },
  'kingdom':                               { surface: 'hero',           file: 'banner-jerusalem-walls-dusk.png' },
  'provision':                             { surface: 'hero',           file: 'banner-flock-distant-shepherd.png' },
  'truth':                                 { surface: 'hero',           file: 'gospel2-02-sermon-mount-wide.png' },
  'hope':                                  { surface: 'hero',           file: 'banner-stone-tomb-dawn.png' },

  // Substack series (4 expansion days each)
  'too-busy-for-god':                      { surface: 'hero',           file: 'atmos-fog-hills-dawn.png' },
  'hearing-god-in-the-noise':              { surface: 'chapter-header', file: 'elijah-ravens-brook.png' },
  'abiding-in-his-presence':               { surface: 'hero',           file: 'banner-vineyard-rows.png' },
  'surrender-to-gods-will':                { surface: 'hero',           file: 'gospel3-02-last-supper-flat.png' },

  // New series — gospel/doctrine
  'in-the-beginning-week-1':               { surface: 'hero',           file: 'atmos-desert-noon-banner.png' },
  'what-is-the-gospel':                    { surface: 'hero',           file: 'gospel2-01-calling-disciples-shore.png' },
  'why-jesus':                             { surface: 'hero',           file: 'banner-river-jordan.png' },
  'what-does-it-mean-to-believe':          { surface: 'hero',           file: 'gospel2-04-walking-water-banner.png' },
  'what-is-carrying-a-cross':              { surface: 'hero',           file: 'gospel3-07-golgotha-crosses.png' },
  'once-saved-always-saved':               { surface: 'hero',           file: 'banner-vineyard-rows.png' },
  'what-happens-when-you-repeatedly-sin':  { surface: 'chapter-header', file: 'cultural-1st-century-jewish-synagogue.png' },
  'the-nature-of-belief':                  { surface: 'chapter-header', file: 'figure-mother-child-doorway.png' },
  'the-work-of-god':                       { surface: 'hero',           file: 'gospel2-09-cleansing-temple.png' },
  'the-word-before-words':                 { surface: 'hero',           file: 'atmos-fog-hills-dawn.png' },
  'genesis-two-stories-of-creation':       { surface: 'hero',           file: 'atmos-desert-noon-banner.png' },
  'the-blueprint-of-community':            { surface: 'chapter-header', file: 'community-feast-long-table.png' },
  'signs-boldness-opposition-integrity':   { surface: 'chapter-header', file: 'cultural-1st-century-jewish-synagogue.png' },
  'witness-under-pressure-expansion':      { surface: 'hero',           file: 'banner-temple-ruins-dusk.png' },
  'anointed':                              { surface: 'hero',           file: 'banner-flock-distant-shepherd.png' },
  'coming-to-the-end-of-ourselves':        { surface: 'hero',           file: 'banner-wilderness-cave.png' },
  'valued':                                { surface: 'chapter-header', file: 'figure-mother-child-doorway.png' },
  'rooted':                                { surface: 'hero',           file: 'atmos-olive-grove-sunset.png' },
  'present-in-the-chaos':                  { surface: 'hero',           file: 'atmos-stormy-sea-ultrawide.png' },
  'standing-strong':                       { surface: 'hero',           file: 'banner-stone-tomb-dawn.png' },
  'what-is-christianity':                  { surface: 'hero',           file: 'banner-river-jordan.png' },
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function convertToWebp(srcPng, dstWebp) {
  ensureDir(path.dirname(dstWebp))
  execSync(`cwebp -q 80 -quiet "${srcPng}" -o "${dstWebp}"`, { stdio: 'pipe' })
}

console.log('━━━ Stage 2: Series hero mapping ━━━')
console.log()

// Verify all source files exist before doing anything destructive
const missing = []
for (const [slug, { surface, file }] of Object.entries(MAPPING)) {
  const src = path.join(LIBRARY_DIR, surface, file)
  if (!fs.existsSync(src)) missing.push({ slug, src })
}
if (missing.length > 0) {
  console.error(`✗ Missing source files (${missing.length}):`)
  missing.forEach((m) => console.error(`    ${m.slug}: ${m.src}`))
  process.exit(1)
}
console.log(`✓ all ${Object.keys(MAPPING).length} source files exist`)
console.log()

// Convert each source to WebP in public/images/site/series/<slug>.webp
ensureDir(SERIES_DIR)
let copied = 0
for (const [slug, { surface, file }] of Object.entries(MAPPING)) {
  const src = path.join(LIBRARY_DIR, surface, file)
  const dst = path.join(SERIES_DIR, `${slug}.webp`)
  convertToWebp(src, dst)
  copied++
}
console.log(`✓ converted ${copied} series heroes to WebP at public/images/site/series/`)
console.log()

// Patch series.ts: for each series object, ensure heroImage is set to
// '/images/site/series/<slug>.webp'. Strategy: regex on the SERIES_DATA
// object literal.
let seriesText = fs.readFileSync(SERIES_TS, 'utf8')
const original = seriesText
let touched = 0

for (const slug of Object.keys(MAPPING)) {
  // Match the series object's start: lines like
  //   identity: {              (no quotes, top-level series)
  //   'too-busy-for-god': {    (quoted slug)
  // We want to add heroImage AFTER the title field (consistent placement).
  const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const targetPath = `/images/site/series/${slug}.webp`

  // Pattern A: heroImage already exists for this series — update it
  const updatePattern = new RegExp(
    `((?:^|\\n)  '?${escapedSlug}'?:\\s*\\{[\\s\\S]*?heroImage:\\s*)(['"]).*?\\2`,
    'g'
  )
  if (updatePattern.test(seriesText)) {
    seriesText = seriesText.replace(updatePattern, `$1$2${targetPath}$2`)
    touched++
    continue
  }

  // Pattern B: no heroImage — insert after the title line
  const insertPattern = new RegExp(
    `((?:^|\\n)  '?${escapedSlug}'?:\\s*\\{\\s*\\n    title:\\s*['"][^'"]*['"],\\n)`,
    'm'
  )
  if (insertPattern.test(seriesText)) {
    seriesText = seriesText.replace(
      insertPattern,
      `$1    heroImage: '${targetPath}',\n`
    )
    touched++
    continue
  }

  console.warn(`⚠ could not locate series '${slug}' to insert heroImage`)
}

if (seriesText !== original) {
  fs.writeFileSync(SERIES_TS, seriesText)
  console.log(`✓ patched src/data/series.ts: ${touched} series got heroImage`)
} else {
  console.log(`(no changes needed in series.ts — all heroImages already correct)`)
}
console.log()
console.log('Done.')
