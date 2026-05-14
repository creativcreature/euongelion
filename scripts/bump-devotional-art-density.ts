#!/usr/bin/env tsx
/**
 * R33: bump image density on NON-SUBSTACK devotionals using the
 * archive/devotional-prints/ library.
 *
 * For each artwork in archive/devotional-prints/<slug>/ with a
 * print.webp AND a non-empty `devotionalSlugs[]` in artwork.json:
 *   1. Copy print.webp to
 *      public/images/devotional-prints/<artwork-slug>.webp
 *   2. Record the (devotionalSlug -> artwork-entry) mapping.
 *
 * Then merge into SITE_DEVOTIONAL_ART:
 *   - Substack devotional slugs are skipped (founder: substack
 *     content + images must match the original, never the curated
 *     archive).
 *   - Non-substack slugs get the new artwork entries APPENDED to
 *     their existing entries (preserves R31 audit work; no entry
 *     is removed).
 *
 * The script is idempotent: re-running overwrites public/.../webp
 * files but preserves SITE_DEVOTIONAL_ART by reading the current
 * entries and merging additive only.
 */

import * as fs from 'fs'
import * as path from 'path'

const REPO = process.cwd()
const ARCHIVE_DIR = path.join(REPO, 'archive', 'devotional-prints')
const PUBLIC_OUT = path.join(REPO, 'public', 'images', 'devotional-prints')
const SOURCES_TS = path.join(REPO, 'src', 'data', 'substack-sources.ts')
const SITE_ART_TS = path.join(REPO, 'src', 'data', 'site-devotional-art.ts')

interface ArtworkMeta {
  slug: string
  title: string
  artist: string
  year: string
  medium: string
  museum: string
  license: string
  printStyle?: string
  devotionalSlugs?: string[]
  seriesSlug?: string
}

interface ArtworkEntry {
  slug: string
  title: string
  artist: string
  year: string
  medium: string
  museum: string
  license: string
  printStyle: string
  src: string
  rawSrc: string
  relevance: string
}

function loadSubstackSlugs(): Set<string> {
  const txt = fs.readFileSync(SOURCES_TS, 'utf-8')
  const slugs = new Set<string>()
  // Match either single- or double-quoted keys (prettier may flip).
  const re = /^\s+['"]([a-z][a-z0-9-]+)['"]:\s*\{/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(txt)) !== null) slugs.add(m[1])
  return slugs
}

function readArchive(): ArtworkMeta[] {
  const out: ArtworkMeta[] = []
  for (const dir of fs.readdirSync(ARCHIVE_DIR)) {
    const full = path.join(ARCHIVE_DIR, dir)
    if (!fs.statSync(full).isDirectory()) continue
    const jsonPath = path.join(full, 'artwork.json')
    const printPath = path.join(full, 'print.webp')
    if (!fs.existsSync(jsonPath)) continue
    if (!fs.existsSync(printPath)) continue
    const meta = JSON.parse(
      fs.readFileSync(jsonPath, 'utf-8'),
    ) as ArtworkMeta
    if (!meta.devotionalSlugs || meta.devotionalSlugs.length === 0) continue
    out.push(meta)
  }
  return out
}

function copyPrints(metas: ArtworkMeta[]): Map<string, string> {
  fs.mkdirSync(PUBLIC_OUT, { recursive: true })
  const m = new Map<string, string>()
  for (const meta of metas) {
    const src = path.join(ARCHIVE_DIR, meta.slug, 'print.webp')
    const dst = path.join(PUBLIC_OUT, `${meta.slug}.webp`)
    if (!fs.existsSync(dst)) fs.copyFileSync(src, dst)
    m.set(meta.slug, `/images/devotional-prints/${meta.slug}.webp`)
  }
  return m
}

function metaToEntry(
  meta: ArtworkMeta,
  publicPath: string,
): ArtworkEntry {
  return {
    slug: meta.slug,
    title: meta.title,
    artist: meta.artist,
    year: meta.year,
    medium: meta.medium,
    museum: meta.museum,
    license: meta.license,
    printStyle: meta.printStyle ?? 'single-ink',
    src: publicPath,
    rawSrc: publicPath,
    relevance: '',
  }
}

function bumpSiteArt(
  perSlug: Map<string, ArtworkEntry[]>,
  substackSlugs: Set<string>,
): void {
  const src = fs.readFileSync(SITE_ART_TS, 'utf-8')
  // Find each slug entry and the entries array for it.
  // Pattern: '<slug>': [\n   { ... },\n   { ... },\n ],
  const slugRe = /(  '([a-z][a-z0-9-]*-day-\d+)': \[)([\s\S]*?)(\n  \],)/g
  let added = 0
  let touchedSlugs = 0
  let skippedSubstack = 0

  const next = src.replace(
    slugRe,
    (_match, head, slug, body, tail) => {
      if (substackSlugs.has(slug)) {
        skippedSubstack += 1
        return _match
      }
      const extras = perSlug.get(slug)
      if (!extras || extras.length === 0) return _match
      touchedSlugs += 1
      const append = extras
        .map((e) => {
          const json = JSON.stringify(e)
            .replace(/^\{/, '{ ')
            .replace(/\}$/, ' }')
            .replace(/","/g, '", "')
            .replace(/":"/g, '": "')
            .replace(/":/g, '": ')
            .replace(/,/g, ', ')
          return `    ${json},`
        })
        .join('\n')
      added += extras.length
      // Strip trailing newline from body so we splice cleanly
      const bodyTrimmed = body.replace(/\n\s*$/, '')
      return `${head}${bodyTrimmed}\n${append}${tail}`
    },
  )

  fs.writeFileSync(SITE_ART_TS, next, 'utf-8')
  console.log(
    `Touched ${touchedSlugs} slugs, added ${added} entries, skipped ${skippedSubstack} substack slugs.`,
  )
}

function main() {
  const substackSlugs = loadSubstackSlugs()
  console.log(`Loaded ${substackSlugs.size} substack slugs to skip.`)

  const archive = readArchive()
  console.log(`Loaded ${archive.length} archive prints with devotional tags.`)

  const publicPaths = copyPrints(archive)
  console.log(`Copied ${publicPaths.size} prints to public/.`)

  const perSlug = new Map<string, ArtworkEntry[]>()
  for (const meta of archive) {
    const publicPath = publicPaths.get(meta.slug)!
    const entry = metaToEntry(meta, publicPath)
    for (const dslug of meta.devotionalSlugs ?? []) {
      if (substackSlugs.has(dslug)) continue
      const list = perSlug.get(dslug) ?? []
      // Cap at 4 additional per slug to keep page from being all images
      if (list.length >= 4) continue
      list.push(entry)
      perSlug.set(dslug, list)
    }
  }
  console.log(`Built per-slug map with ${perSlug.size} non-substack slugs.`)

  bumpSiteArt(perSlug, substackSlugs)
}

main()
