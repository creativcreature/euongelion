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

// FOUNDER CURATION RULE (2026-05-08):
// Each series gets ONE single-ink/halftone symbol from the curated
// brand-aesthetic subset (sym-*, obj-*, brand-*, element-*). No
// realistic narrative illustrations. Files are used as-generated
// (no Pillow treatment). All sources live in public/images/library/decorative/.
const MAPPING = {
  // 7 Wake-Up Magazine series (originals)
  'identity':                              { surface: 'decorative', file: 'sym-doorway-arched-linocut.png' },
  'peace':                                 { surface: 'decorative', file: 'sym-dove-flight-linocut.png' },
  'community':                             { surface: 'decorative', file: 'sym-bread-wine-table.png' },
  'kingdom':                               { surface: 'decorative', file: 'sym-keys-kingdom.png' },
  'provision':                             { surface: 'decorative', file: 'sym-manna-falling-stamped.png' },
  'truth':                                 { surface: 'decorative', file: 'sym-open-scroll.png' },
  'hope':                                  { surface: 'decorative', file: 'sym-anchor-hope-linocut.png' },

  // Substack series (4 expansion days each)
  'too-busy-for-god':                      { surface: 'decorative', file: 'obj-oil-lamp-wick-burning.png' },
  'hearing-god-in-the-noise':              { surface: 'decorative', file: 'sym-shofar-rams-horn-linocut.png' },
  'abiding-in-his-presence':               { surface: 'decorative', file: 'sym-vine-grapes-linocut.png' },
  'surrender-to-gods-will':                { surface: 'decorative', file: 'obj-cup-trembling-stone.png' },

  // New series — gospel/doctrine
  'in-the-beginning-week-1':               { surface: 'decorative', file: 'sym-burning-bush-brushed.png' },
  'what-is-the-gospel':                    { surface: 'decorative', file: 'sym-cross-on-hill.png' },
  'why-jesus':                             { surface: 'decorative', file: 'sym-cross-simple-linocut.png' },
  'what-does-it-mean-to-believe':          { surface: 'decorative', file: 'sym-fish-linocut.png' },
  'what-is-carrying-a-cross':              { surface: 'decorative', file: 'sym-cross-burgundy-linocut.png' },
  'once-saved-always-saved':               { surface: 'decorative', file: 'sym-shield-faith-linocut.png' },
  'what-happens-when-you-repeatedly-sin':  { surface: 'decorative', file: 'sym-water-pouring-brushed.png' },
  'the-nature-of-belief':                  { surface: 'decorative', file: 'sym-fish-terracotta-linocut.png' },
  'the-work-of-god':                       { surface: 'decorative', file: 'obj-clay-bowl-bread-water.png' },
  'the-word-before-words':                 { surface: 'decorative', file: 'sym-scroll-open-etched.png' },
  'genesis-two-stories-of-creation':       { surface: 'decorative', file: 'sym-noahs-ark-linocut.png' },
  'the-blueprint-of-community':            { surface: 'decorative', file: 'sym-temple-columns-pair-linocut.png' },
  'signs-boldness-opposition-integrity':   { surface: 'decorative', file: 'sym-flame-single-linocut.png' },
  'witness-under-pressure-expansion':      { surface: 'decorative', file: 'obj-bronze-trumpet-curved.png' },
  'anointed':                              { surface: 'decorative', file: 'obj-oil-flask-amber-glass.png' },
  'coming-to-the-end-of-ourselves':        { surface: 'decorative', file: 'sym-empty-chalice.png' },
  'valued':                                { surface: 'decorative', file: 'sym-pomegranate-cut-linocut.png' },
  'rooted':                                { surface: 'decorative', file: 'sym-fig-branch-linocut.png' },
  'present-in-the-chaos':                  { surface: 'decorative', file: 'sym-waves-three-stacked-linocut.png' },
  'standing-strong':                       { surface: 'decorative', file: 'sym-stone-tablets-flat.png' },
  'what-is-christianity':                  { surface: 'decorative', file: 'sym-fishes-bread-basket.png' },
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
