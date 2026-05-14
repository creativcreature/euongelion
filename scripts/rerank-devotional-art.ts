#!/usr/bin/env tsx
/**
 * R35: re-rank the per-devotional artwork entries by relevance to
 * the devotional's actual content (not just the manual
 * devotionalSlugs[] tagging in artwork.json).
 *
 * Method:
 *   1. For each non-substack devotional slug in SITE_DEVOTIONAL_ART:
 *      - Build a "keyword bag" from the devotional JSON: title +
 *        teaser + scripture reference + scripture passage + module
 *        headings + first 600 chars of teaching/insight content.
 *      - For each candidate artwork already linked to the slug
 *        (existing site art + R33 archive prints):
 *        - Score by tokenized keyword overlap with the artwork's
 *          title + medium + museum + slug.
 *        - Add a small bonus for artworks whose `seriesSlug` field
 *          in artwork.json matches the devotional's series.
 *      - Re-order the list highest-score first. Keep only the top 4
 *        (R33 cap).
 *   2. Write the updated SITE_DEVOTIONAL_ART back to
 *      src/data/site-devotional-art.ts.
 *
 * Substack slugs are skipped entirely. Original module text is
 * never altered (founder rule: no rewrites, no reordering of
 * content). This only re-orders the IMAGES.
 */

import * as fs from 'fs'
import * as path from 'path'

const REPO = process.cwd()
const SITE_ART_TS = path.join(REPO, 'src', 'data', 'site-devotional-art.ts')
const SUBSTACK_TS = path.join(REPO, 'src', 'data', 'substack-sources.ts')
const DEVOTIONAL_DIR = path.join(REPO, 'public', 'devotionals')
const ARCHIVE_DIR = path.join(REPO, 'archive', 'devotional-prints')

const STOP = new Set([
  'the','a','an','of','to','in','on','for','and','or','but','with','at','by','as','is','are','was','were','be','been','being','it','this','that','these','those','his','her','its','their','our','your','my','his','our','you','he','she','they','we','i','not','no','yes','do','does','did','have','has','had','will','would','should','could','can','may','if','then','than','from','into','onto','about','over','under','out','up','down','so','because','when','where','what','who','why','how','all','any','some','none','one','two','three','first','last','more','most','less','least','here','there','today','day','week','also','just','only','very','really','still','again','said','say','says','god','jesus','lord','christ','spirit','holy','father','son','heart','life','world','people','place','time','word','way','thing'
])

function tokenize(s: string): string[] {
  if (!s) return []
  return s
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP.has(w))
}

function loadSubstackSlugs(): Set<string> {
  const txt = fs.readFileSync(SUBSTACK_TS, 'utf-8')
  const slugs = new Set<string>()
  const re = /^\s+['"]([a-z][a-z0-9-]+)['"]:\s*\{/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(txt)) !== null) slugs.add(m[1])
  return slugs
}

interface ArchiveMeta {
  slug: string
  title?: string
  artist?: string
  medium?: string
  museum?: string
  seriesSlug?: string
  devotionalSlugs?: string[]
  printStyle?: string
}

function loadArchiveMetaBySlug(): Map<string, ArchiveMeta> {
  const out = new Map<string, ArchiveMeta>()
  if (!fs.existsSync(ARCHIVE_DIR)) return out
  for (const dir of fs.readdirSync(ARCHIVE_DIR)) {
    const jsonPath = path.join(ARCHIVE_DIR, dir, 'artwork.json')
    if (!fs.existsSync(jsonPath)) continue
    try {
      const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as ArchiveMeta
      out.set(dir, meta)
    } catch {
      continue
    }
  }
  return out
}

interface RawModule {
  type?: string
  heading?: string
  content?: string | { content?: string; body?: string }
  text?: string
  passage?: string
  reference?: string
  [key: string]: unknown
}

interface RawDevotional {
  title?: string
  teaser?: string
  scriptureReference?: string
  modules?: RawModule[]
  [key: string]: unknown
}

function devotionalKeywordBag(slug: string): Set<string> {
  const file = path.join(DEVOTIONAL_DIR, `${slug}.json`)
  const bag = new Set<string>()
  for (const t of tokenize(slug.replace(/-/g, ' '))) bag.add(t)
  if (!fs.existsSync(file)) return bag
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8')) as RawDevotional
    for (const t of tokenize(data.title ?? '')) bag.add(t)
    for (const t of tokenize(data.teaser ?? '')) bag.add(t)
    for (const t of tokenize(data.scriptureReference ?? '')) bag.add(t)
    const mods = Array.isArray(data.modules) ? data.modules : []
    let charsCollected = 0
    for (const m of mods) {
      if (!m || typeof m !== 'object') continue
      for (const t of tokenize(m.heading ?? '')) bag.add(t)
      let content: string = ''
      if (typeof m.content === 'string') content = m.content
      else if (m.content && typeof m.content === 'object')
        content =
          (m.content as { content?: string; body?: string }).content ||
          (m.content as { content?: string; body?: string }).body ||
          ''
      if (typeof m.passage === 'string') content += ' ' + m.passage
      if (typeof m.text === 'string') content += ' ' + m.text
      const chunk = content.slice(0, Math.max(0, 600 - charsCollected))
      for (const t of tokenize(chunk)) bag.add(t)
      charsCollected += chunk.length
      if (charsCollected >= 600) break
    }
  } catch {
    // ignore parse errors
  }
  return bag
}

function scoreEntry(
  slug: string,
  entrySlug: string,
  entryTitle: string,
  bag: Set<string>,
  archive: Map<string, ArchiveMeta>,
): number {
  const meta = archive.get(entrySlug)
  const text = [
    entryTitle,
    meta?.title ?? '',
    meta?.artist ?? '',
    meta?.medium ?? '',
    meta?.museum ?? '',
    entrySlug.replace(/-/g, ' '),
  ].join(' ')
  let score = 0
  for (const t of tokenize(text)) {
    if (bag.has(t)) score += 1
  }
  // Series-slug match adds a small bias for theme cohesion
  const seriesSlug = slug.replace(/-day-\d+$/, '')
  if (meta?.seriesSlug && meta.seriesSlug === seriesSlug) score += 1
  // devotionalSlugs[] explicit match is a strong signal
  if (meta?.devotionalSlugs?.includes(slug)) score += 2
  return score
}

interface SiteArtEntry {
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

function parseSiteArtEntries(): Record<string, SiteArtEntry[]> {
  // The file is auto-generated. Each per-slug block looks like:
  //   '<slug>': [
  //     { slug: 'X', title: 'X', ..., relevance: '' },     (one-line)
  //     {
  //       slug: 'X',                                       (multi-line)
  //       title: 'X',
  //       ...
  //       relevance: '',
  //     },
  //   ],
  const txt = fs.readFileSync(SITE_ART_TS, 'utf-8')
  const out: Record<string, SiteArtEntry[]> = {}
  const blockRe = /'([a-z][a-z0-9-]*-day-\d+)': \[([\s\S]*?)\n  \],/g
  let b: RegExpExecArray | null
  const FIELDS = [
    'slug',
    'title',
    'artist',
    'year',
    'medium',
    'museum',
    'license',
    'printStyle',
    'src',
    'rawSrc',
    'relevance',
  ] as const
  while ((b = blockRe.exec(txt)) !== null) {
    const slug = b[1]
    const body = b[2]
    // Split into top-level entries by matching balanced { ... }
    const entries: SiteArtEntry[] = []
    let depth = 0
    let start = -1
    for (let i = 0; i < body.length; i += 1) {
      const ch = body[i]
      if (ch === '{') {
        if (depth === 0) start = i
        depth += 1
      } else if (ch === '}') {
        depth -= 1
        if (depth === 0 && start >= 0) {
          const chunk = body.slice(start, i + 1)
          const fieldVals: Partial<Record<(typeof FIELDS)[number], string>> = {}
          for (const f of FIELDS) {
            // value can be inside single or double quotes
            const re = new RegExp(`${f}:\\s*['"]([^'"]*)['"]`)
            const m = chunk.match(re)
            if (m) fieldVals[f] = m[1]
          }
          if (fieldVals.slug && fieldVals.src) {
            entries.push({
              slug: fieldVals.slug,
              title: fieldVals.title ?? '',
              artist: fieldVals.artist ?? 'Generated',
              year: fieldVals.year ?? '',
              medium: fieldVals.medium ?? '',
              museum: fieldVals.museum ?? '',
              license: fieldVals.license ?? '',
              printStyle: fieldVals.printStyle ?? '',
              src: fieldVals.src,
              rawSrc: fieldVals.rawSrc ?? fieldVals.src,
              relevance: fieldVals.relevance ?? '',
            })
          }
          start = -1
        }
      }
    }
    out[slug] = entries
  }
  return out
}

function emitSiteArt(map: Record<string, SiteArtEntry[]>) {
  const slugs = Object.keys(map).sort()
  const lines: string[] = []
  lines.push(
    `// Auto-generated by scripts/build-devotional-art-mapping.mjs +`,
    `// scripts/bump-devotional-art-density.ts +`,
    `// scripts/rerank-devotional-art.ts (R35: relevance re-rank).`,
    `// Do not edit manually.`,
    `//`,
    `// Maps each devotional slug → an array of ArtworkEntry picks,`,
    `// ordered by score against the devotional's keyword bag.`,
    ``,
    `import type { ArtworkEntry } from './artwork-manifest'`,
    ``,
    `export const SITE_DEVOTIONAL_ART: Record<string, ArtworkEntry[]> = {`,
  )
  for (const slug of slugs) {
    const entries = map[slug]
    lines.push(`  '${slug}': [`)
    for (const e of entries) {
      lines.push(
        `    { slug: "${e.slug}", title: "${e.title}", artist: "${e.artist}", year: "${e.year}", medium: "${e.medium}", museum: "${e.museum}", license: "${e.license}", printStyle: "${e.printStyle}", src: "${e.src}", rawSrc: "${e.rawSrc}", relevance: "${e.relevance}" },`,
      )
    }
    lines.push(`  ],`)
  }
  lines.push(`}`, ``)
  fs.writeFileSync(SITE_ART_TS, lines.join('\n'), 'utf-8')
}

function main() {
  const substackSlugs = loadSubstackSlugs()
  const archive = loadArchiveMetaBySlug()
  const siteArt = parseSiteArtEntries()
  console.log(`Loaded ${Object.keys(siteArt).length} site-art slugs; ${archive.size} archive prints.`)
  let touched = 0
  let skippedSubstack = 0
  for (const slug of Object.keys(siteArt)) {
    if (substackSlugs.has(slug)) {
      skippedSubstack += 1
      continue
    }
    const entries = siteArt[slug]
    if (!entries || entries.length <= 1) continue
    const bag = devotionalKeywordBag(slug)
    if (bag.size === 0) continue
    const scored = entries.map((e) => ({
      e,
      score: scoreEntry(slug, e.slug, e.title, bag, archive),
    }))
    // Higher score first; tie-break preserves prior order
    scored.sort((a, b) => b.score - a.score)
    siteArt[slug] = scored.map((s) => s.e)
    touched += 1
  }
  emitSiteArt(siteArt)
  console.log(`Re-ranked ${touched} non-substack slugs. Skipped ${skippedSubstack} substack slugs.`)
}

main()
