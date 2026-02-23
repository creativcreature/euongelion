#!/usr/bin/env node
/**
 * generate-artwork-manifest.mjs
 *
 * Reads all artwork.json files from public/images/devotional-prints/
 * and generates src/data/artwork-manifest.ts with:
 *   - SERIES_HERO: best hero artwork per series
 *   - DEVOTIONAL_ARTWORKS: 3+ artworks per devotional (gap-filled)
 *   - ALL_ARTWORKS: full lookup table
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'fs'
import { join, resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '..')
const PRINTS_DIR = join(ROOT, 'public/images/devotional-prints')
const OUTPUT_FILE = join(ROOT, 'src/data/artwork-manifest.ts')
const TARGET_PER_DEVOTIONAL = 3

// ─── Slug normalization ─────────────────────────────────────────────
// Artwork uses "identity-crisis", SERIES_DATA uses "identity"
const SERIES_SLUG_MAP = { 'identity-crisis': 'identity' }

function normalizeSeriesSlug(raw) {
  return SERIES_SLUG_MAP[raw] || raw
}

function extractSeriesSlugFromDevotional(devSlug) {
  const match = devSlug.match(/^(.+)-day-\d+$/)
  if (!match) return devSlug
  return normalizeSeriesSlug(match[1])
}

// ─── Read all artwork.json files ────────────────────────────────────
function loadAllArtworks() {
  const artworks = []
  const dirs = readdirSync(PRINTS_DIR).sort()

  for (const dir of dirs) {
    const artworkPath = join(PRINTS_DIR, dir, 'artwork.json')
    if (!existsSync(artworkPath)) continue

    try {
      const data = JSON.parse(readFileSync(artworkPath, 'utf8'))
      const printPath = join(PRINTS_DIR, dir, 'print.webp')

      // Skip if print.webp is missing
      if (!existsSync(printPath)) continue

      const rawPath = join(PRINTS_DIR, dir, 'raw.jpg')
      const hasRaw = existsSync(rawPath)

      artworks.push({
        slug: data.slug || dir,
        title: data.title || 'Untitled',
        artist: data.artist || 'Unknown',
        year: data.year || '',
        medium: data.medium || 'painting',
        museum: data.museum || '',
        license: data.license || 'Public Domain',
        printStyle: data.printStyle || 'etching',
        src: `/images/devotional-prints/${dir}/print.webp`,
        rawSrc: hasRaw ? `/images/devotional-prints/${dir}/raw.jpg` : `/images/devotional-prints/${dir}/print.webp`,
        relevance: data.relevance || '',
        devotionalSlugs: data.devotionalSlugs || [],
        seriesSlug: normalizeSeriesSlug(data.seriesSlug || ''),
        _dir: dir,
      })
    } catch {
      // Skip malformed JSON
    }
  }

  return artworks
}

// ─── Hero selection ────────────────────────────────────────────────
function scoreArtwork(artwork, seriesDevotionals) {
  let score = 0

  // Named artist vs Unknown
  if (artwork.artist && artwork.artist !== 'Unknown') score += 3

  // Medium priority
  const medium = (artwork.medium || '').toLowerCase()
  if (medium === 'painting') score += 3
  else if (medium === 'sculpture') score += 2
  else if (medium === 'artifact') score += 1
  // architecture = 0

  // Pre-1800 era bonus (Old Masters)
  const yearMatch = artwork.year.match(/\d{4}/)
  if (yearMatch && parseInt(yearMatch[0]) < 1800) score += 1

  // Mapped to day-1 of the series
  if (seriesDevotionals.length > 0) {
    const day1Slug = seriesDevotionals.find((s) => s.endsWith('-day-1'))
    if (day1Slug && artwork.devotionalSlugs.includes(day1Slug)) score += 2
  }

  return score
}

function selectSeriesHeroes(artworks) {
  // Group artworks by series
  const bySeriesRaw = {}
  for (const a of artworks) {
    if (!a.seriesSlug) continue
    if (!bySeriesRaw[a.seriesSlug]) bySeriesRaw[a.seriesSlug] = []
    bySeriesRaw[a.seriesSlug].push(a)
  }

  // Group devotional slugs by series
  const devSlugsBySeries = {}
  for (const a of artworks) {
    for (const ds of a.devotionalSlugs) {
      const ss = extractSeriesSlugFromDevotional(ds)
      if (!devSlugsBySeries[ss]) devSlugsBySeries[ss] = new Set()
      devSlugsBySeries[ss].add(ds)
    }
  }

  const heroes = {}
  for (const [series, pool] of Object.entries(bySeriesRaw)) {
    const seriesDevs = [...(devSlugsBySeries[series] || [])]
    const scored = pool.map((a) => ({
      artwork: a,
      score: scoreArtwork(a, seriesDevs),
    }))
    scored.sort((a, b) => b.score - a.score)
    heroes[series] = scored[0].artwork
  }

  return heroes
}

// ─── Redistribution ─────────────────────────────────────────────────
function buildDevotionalArtworkMap(artworks) {
  // Step 1: Build initial mapping from artwork.json devotionalSlugs
  const devMap = {} // devotionalSlug -> Set<artworkSlug>
  const artworkUsage = {} // artworkSlug -> count of assignments

  for (const a of artworks) {
    artworkUsage[a.slug] = 0
    for (const ds of a.devotionalSlugs) {
      if (!devMap[ds]) devMap[ds] = new Set()
      devMap[ds].add(a.slug)
      artworkUsage[a.slug]++
    }
  }

  // Build series artwork pool
  const seriesPool = {} // normalizedSeriesSlug -> artwork[]
  for (const a of artworks) {
    if (!a.seriesSlug) continue
    if (!seriesPool[a.seriesSlug]) seriesPool[a.seriesSlug] = []
    seriesPool[a.seriesSlug].push(a)
  }

  // Collect ALL devotional slugs from artwork mappings
  const allDevSlugs = new Set()
  for (const a of artworks) {
    for (const ds of a.devotionalSlugs) {
      allDevSlugs.add(ds)
    }
  }
  // Also add any devotional slugs we can derive from series pools
  // We need a more authoritative source — read the series data
  // For now, discover from artwork metadata

  // Step 2: Handle uncovered devotionals
  // Find devotional slugs that exist in the artworks but have 0 images
  // (We'll discover more from the series data import later)

  // Step 3: Include unmapped artworks
  const unmapped = artworks.filter(
    (a) => a.devotionalSlugs.length === 0 && a.seriesSlug,
  )
  for (const a of unmapped) {
    // Find the devotional in this series with fewest artworks
    const seriesDevs = [...allDevSlugs].filter(
      (ds) => extractSeriesSlugFromDevotional(ds) === a.seriesSlug,
    )
    if (seriesDevs.length === 0) continue

    seriesDevs.sort(
      (x, y) => (devMap[x]?.size || 0) - (devMap[y]?.size || 0),
    )
    const target = seriesDevs[0]
    if (!devMap[target]) devMap[target] = new Set()
    devMap[target].add(a.slug)
    artworkUsage[a.slug] = (artworkUsage[a.slug] || 0) + 1
  }

  // Step 4: Fill to TARGET_PER_DEVOTIONAL
  for (const devSlug of [...allDevSlugs]) {
    if (!devMap[devSlug]) devMap[devSlug] = new Set()

    while (devMap[devSlug].size < TARGET_PER_DEVOTIONAL) {
      const seriesSlug = extractSeriesSlugFromDevotional(devSlug)
      const pool = seriesPool[seriesSlug] || []

      // Find candidates not already assigned to this devotional
      const candidates = pool.filter((a) => !devMap[devSlug].has(a.slug))
      if (candidates.length === 0) break

      // Pick least-used candidate
      candidates.sort(
        (a, b) =>
          (artworkUsage[a.slug] || 0) - (artworkUsage[b.slug] || 0),
      )
      const pick = candidates[0]
      devMap[devSlug].add(pick.slug)
      artworkUsage[pick.slug] = (artworkUsage[pick.slug] || 0) + 1
    }
  }

  return devMap
}

// ─── Generate TypeScript ────────────────────────────────────────────
function generateManifest() {
  const artworks = loadAllArtworks()
  console.log(`[artwork-manifest] Loaded ${artworks.length} artworks`)

  const heroes = selectSeriesHeroes(artworks)
  console.log(
    `[artwork-manifest] Selected heroes for ${Object.keys(heroes).length} series`,
  )

  const devMap = buildDevotionalArtworkMap(artworks)

  // Build lookup
  const lookup = {}
  for (const a of artworks) {
    lookup[a.slug] = a
  }

  // Stats
  const devCounts = Object.values(devMap).map((s) => s.size)
  const under3 = devCounts.filter((c) => c < 3).length
  const at3Plus = devCounts.filter((c) => c >= 3).length
  console.log(
    `[artwork-manifest] Devotional coverage: ${Object.keys(devMap).length} devotionals`,
  )
  console.log(
    `[artwork-manifest]   3+ images: ${at3Plus}, under 3: ${under3}`,
  )

  // Generate TypeScript
  const lines = [
    '// Auto-generated by scripts/generate-artwork-manifest.mjs',
    '// Do not edit manually. Run: npm run generate:artwork-manifest',
    '',
    'export interface ArtworkEntry {',
    '  slug: string',
    '  title: string',
    '  artist: string',
    '  year: string',
    '  medium: string',
    '  museum: string',
    '  license: string',
    '  printStyle: string',
    '  src: string',
    '  rawSrc: string',
    '  relevance: string',
    '}',
    '',
  ]

  // Helper to serialize an artwork entry
  function serializeEntry(a) {
    return [
      `  slug: ${JSON.stringify(a.slug)},`,
      `  title: ${JSON.stringify(a.title)},`,
      `  artist: ${JSON.stringify(a.artist)},`,
      `  year: ${JSON.stringify(a.year)},`,
      `  medium: ${JSON.stringify(a.medium)},`,
      `  museum: ${JSON.stringify(a.museum)},`,
      `  license: ${JSON.stringify(a.license)},`,
      `  printStyle: ${JSON.stringify(a.printStyle)},`,
      `  src: ${JSON.stringify(a.src)},`,
      `  rawSrc: ${JSON.stringify(a.rawSrc)},`,
      `  relevance: ${JSON.stringify(a.relevance)},`,
    ].join(' ')
  }

  // SERIES_HERO
  lines.push(
    'export const SERIES_HERO: Record<string, ArtworkEntry> = {',
  )
  for (const [series, artwork] of Object.entries(heroes).sort(
    (a, b) => a[0].localeCompare(b[0]),
  )) {
    lines.push(`  ${JSON.stringify(series)}: { ${serializeEntry(artwork)} },`)
  }
  lines.push('}')
  lines.push('')

  // DEVOTIONAL_ARTWORKS
  lines.push(
    'export const DEVOTIONAL_ARTWORKS: Record<string, ArtworkEntry[]> = {',
  )
  for (const [devSlug, slugSet] of Object.entries(devMap).sort(
    (a, b) => a[0].localeCompare(b[0]),
  )) {
    const entries = [...slugSet]
      .map((s) => lookup[s])
      .filter(Boolean)
    if (entries.length === 0) continue
    lines.push(`  ${JSON.stringify(devSlug)}: [`)
    for (const e of entries) {
      lines.push(`    { ${serializeEntry(e)} },`)
    }
    lines.push('  ],')
  }
  lines.push('}')
  lines.push('')

  // ALL_ARTWORKS
  lines.push(
    'export const ALL_ARTWORKS: Record<string, ArtworkEntry> = {',
  )
  for (const a of artworks.sort((x, y) =>
    x.slug.localeCompare(y.slug),
  )) {
    lines.push(`  ${JSON.stringify(a.slug)}: { ${serializeEntry(a)} },`)
  }
  lines.push('}')
  lines.push('')

  writeFileSync(OUTPUT_FILE, lines.join('\n'), 'utf8')
  console.log(`[artwork-manifest] Written to ${OUTPUT_FILE}`)
}

generateManifest()
