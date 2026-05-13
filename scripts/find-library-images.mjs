#!/usr/bin/env node
/**
 * Find candidate images in the curated library by keyword + optional surface.
 *
 * Usage:
 *   node scripts/find-library-images.mjs <keyword1> [keyword2 ...] [--surface=poster|devotional|hero|chapter-header|decorative|logo] [--limit=20]
 *
 * Examples:
 *   node scripts/find-library-images.mjs gospel wilderness
 *   node scripts/find-library-images.mjs peace dove --surface=poster
 *
 * Output: pipe-delimited rows of (score | surface | libraryRel | keywords),
 * sorted by score descending. Score = count of search keywords that appear
 * in the entry's keywords. Ties broken by surface preference (poster first
 * for the current Riso brand direction) and shorter filename.
 *
 * The catalog file is docs/image-library-catalog-2026-05-08.json — 1,404
 * unique filenames pre-tagged across 6 surfaces. See CLAUDE.md.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const CATALOG_PATH = resolve(
  process.cwd(),
  'docs/image-library-catalog-2026-05-08.json',
)

const SURFACE_PRIORITY = {
  poster: 0,
  devotional: 1,
  'chapter-header': 2,
  hero: 3,
  decorative: 4,
  logo: 5,
}

function parseArgs(argv) {
  const args = { keywords: [], surface: null, limit: 20 }
  for (const tok of argv) {
    if (tok.startsWith('--surface=')) args.surface = tok.slice(10).trim()
    else if (tok.startsWith('--limit=')) args.limit = parseInt(tok.slice(8), 10)
    else args.keywords.push(tok.toLowerCase())
  }
  return args
}

function score(entry, keywords) {
  const set = new Set((entry.keywords || []).map((k) => k.toLowerCase()))
  let hits = 0
  for (const k of keywords) if (set.has(k)) hits += 1
  return hits
}

function main() {
  const { keywords, surface, limit } = parseArgs(process.argv.slice(2))
  if (!keywords.length) {
    console.error(
      'Usage: find-library-images.mjs <keyword>... [--surface=...] [--limit=N]',
    )
    process.exit(1)
  }
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'))
  const entries = catalog.entries || []
  const scored = []
  for (const entry of entries) {
    if (surface && entry.surface !== surface) continue
    const s = score(entry, keywords)
    if (s === 0) continue
    scored.push({ score: s, entry })
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const sa = SURFACE_PRIORITY[a.entry.surface] ?? 99
    const sb = SURFACE_PRIORITY[b.entry.surface] ?? 99
    if (sa !== sb) return sa - sb
    return a.entry.filename.localeCompare(b.entry.filename)
  })
  for (const row of scored.slice(0, limit)) {
    const kw = (row.entry.keywords || []).join(',')
    console.log(
      [
        row.score,
        row.entry.surface,
        row.entry.libraryRel,
        kw,
      ].join(' | '),
    )
  }
}

main()
