#!/usr/bin/env tsx
/**
 * R32: build src/data/substack-sources.ts — a static map from
 * devotional-slug → { substackUrl, substackImage } extracted from
 * content/series-html/*.html.
 *
 * Inputs:
 *   - content/series-html/<post_id>.<post_slug>.html
 *   - src/data/series.ts (SUBSTACK_SERIES_ORDER + SERIES_DATA[*].days)
 *
 * Heuristic:
 *   Each substack series corresponds to multiple HTML files. Their
 *   filenames are <numeric_post_id>.<slug>.html. The post_id is
 *   monotonically increasing in publication order. The Nth HTML file
 *   (sorted by post_id) for a series maps to its Day N. Extra files
 *   beyond the series' day count are ignored (substack auto-suffix
 *   collisions from drafts).
 *
 * Each HTML file's first substack-post-media.s3.amazonaws.com image
 * URL is treated as the canonical header image for that day.
 */

import * as fs from 'fs'
import * as path from 'path'

const REPO = process.cwd()
const HTML_DIR = path.join(REPO, 'content', 'series-html')
const SERIES_TS = path.join(REPO, 'src', 'data', 'series.ts')
const OUT = path.join(REPO, 'src', 'data', 'substack-sources.ts')
const PUB = 'https://wokegod.substack.com'

interface HtmlFile {
  postId: number
  postSlug: string
  filename: string
  fullPath: string
}

interface SourceEntry {
  substackUrl: string
  substackImage: string | null
}

function parseSeriesTs(): {
  substackOrder: string[]
  seriesDayCounts: Record<string, number>
} {
  const src = fs.readFileSync(SERIES_TS, 'utf-8')

  // SUBSTACK_SERIES_ORDER — single declaration, list of single-quoted strings
  const orderMatch = src.match(
    /export const SUBSTACK_SERIES_ORDER = \[([\s\S]*?)\] as const/,
  )
  const substackOrder: string[] = []
  if (orderMatch) {
    const re = /'([a-z0-9-]+)'/g
    let m: RegExpExecArray | null
    while ((m = re.exec(orderMatch[1])) !== null) substackOrder.push(m[1])
  }

  // Day counts — scan each series' entry for the days array length OR
  // the Array.from({ length: N }) pattern.
  const seriesDayCounts: Record<string, number> = {}
  for (const slug of substackOrder) {
    // Try Array.from({ length: N }, ...) first
    const arrFromRe = new RegExp(
      `'${slug}':[\\s\\S]*?days: Array\\.from\\(\\{ length: (\\d+) \\}`,
      'm',
    )
    const arrFromMatch = src.match(arrFromRe)
    if (arrFromMatch) {
      seriesDayCounts[slug] = Number.parseInt(arrFromMatch[1], 10)
      continue
    }

    // Otherwise count `day: <N>` entries inside the series block.
    const blockRe = new RegExp(`'${slug}':\\s*\\{[\\s\\S]*?\\n  \\},`, 'm')
    const block = src.match(blockRe)
    if (block) {
      const dayRe = /\bday:\s*(\d+),/g
      const days: number[] = []
      let m: RegExpExecArray | null
      while ((m = dayRe.exec(block[0])) !== null)
        days.push(Number.parseInt(m[1], 10))
      seriesDayCounts[slug] = Math.max(0, ...days) || days.length
    }
  }
  return { substackOrder, seriesDayCounts }
}

function listHtmlFiles(): HtmlFile[] {
  const out: HtmlFile[] = []
  for (const f of fs.readdirSync(HTML_DIR)) {
    if (!f.endsWith('.html')) continue
    if (f.includes('how-to-use-the-substack-editor')) continue
    const base = f.replace(/\.html$/, '')
    const dot = base.indexOf('.')
    if (dot < 0) continue
    const postId = Number.parseInt(base.slice(0, dot), 10)
    if (!Number.isFinite(postId)) continue
    const postSlug = base.slice(dot + 1)
    out.push({
      postId,
      postSlug,
      filename: f,
      fullPath: path.join(HTML_DIR, f),
    })
  }
  return out.sort((a, b) => a.postId - b.postId)
}

function extractFirstImage(filePath: string): string | null {
  const html = fs.readFileSync(filePath, 'utf-8')
  const re =
    /https:\/\/substack-post-media\.s3\.amazonaws\.com\/public\/images\/[A-Za-z0-9._-]+\.(png|jpg|jpeg|webp)/i
  const m = html.match(re)
  return m ? m[0] : null
}

function findCandidatesForSeries(
  seriesSlug: string,
  allFiles: HtmlFile[],
): HtmlFile[] {
  // A file's postSlug belongs to this series if it equals seriesSlug
  // or starts with `${seriesSlug}-` (the substack auto-suffix
  // pattern). Special-case: `what-happens-when-you-repeatedly-sin`
  // appears in series.ts but its HTML filenames are
  // `what-happens-when-you-repeatedly`.
  const aliases = SERIES_ALIASES[seriesSlug] ?? [seriesSlug]
  return allFiles.filter((f) =>
    aliases.some((a) => f.postSlug === a || f.postSlug.startsWith(`${a}-`)),
  )
}

/**
 * Substack URL slug aliases — when the published substack post slug
 * differs from the canonical series slug we use in src/data/series.ts.
 */
const SERIES_ALIASES: Record<string, string[]> = {
  'what-happens-when-you-repeatedly-sin': [
    'what-happens-when-you-repeatedly-sin',
    'what-happens-when-you-repeatedly',
  ],
}

function buildMap() {
  const { substackOrder, seriesDayCounts } = parseSeriesTs()
  const allFiles = listHtmlFiles()
  const entries: Record<string, SourceEntry> = {}

  for (const seriesSlug of substackOrder) {
    const dayCount = seriesDayCounts[seriesSlug]
    if (!dayCount) {
      console.warn(`SKIP series (no day count): ${seriesSlug}`)
      continue
    }
    const candidates = findCandidatesForSeries(seriesSlug, allFiles)
    if (candidates.length === 0) {
      console.warn(`SKIP series (no HTML candidates): ${seriesSlug}`)
      continue
    }
    // Take first `dayCount` by post_id order
    const days = candidates.slice(0, dayCount)
    for (let i = 0; i < days.length; i += 1) {
      const file = days[i]
      const slug = `${seriesSlug}-day-${i + 1}`
      const image = extractFirstImage(file.fullPath)
      entries[slug] = {
        substackUrl: `${PUB}/p/${file.postSlug}`,
        substackImage: image,
      }
    }
    if (days.length < dayCount) {
      console.warn(
        `PARTIAL: ${seriesSlug} expected ${dayCount} days, got ${days.length}`,
      )
    }
  }

  return entries
}

function writeOutput(entries: Record<string, SourceEntry>) {
  const lines: string[] = []
  lines.push(
    `/**`,
    ` * Auto-generated by scripts/build-substack-sources.ts.`,
    ` *`,
    ` * Maps each substack-sourced devotional slug → its canonical`,
    ` * Substack post URL + the post's primary header image URL`,
    ` * (hot-linked from substack-post-media.s3.amazonaws.com).`,
    ` *`,
    ` * Used by the devotional reader and series page to render a`,
    ` * "Read original on Substack" CTA and to surface the substack`,
    ` * image as a page header for substack-format devotionals.`,
    ` *`,
    ` * Do NOT edit by hand. Re-run scripts/build-substack-sources.ts`,
    ` * when source HTML changes.`,
    ` */`,
    ``,
    `export interface SubstackSource {`,
    `  substackUrl: string`,
    `  substackImage: string | null`,
    `}`,
    ``,
    `export const SUBSTACK_SOURCES: Record<string, SubstackSource> = {`,
  )
  const slugs = Object.keys(entries).sort()
  for (const slug of slugs) {
    const e = entries[slug]
    const img = e.substackImage ? JSON.stringify(e.substackImage) : 'null'
    lines.push(`  ${JSON.stringify(slug)}: {`)
    lines.push(`    substackUrl: ${JSON.stringify(e.substackUrl)},`)
    lines.push(`    substackImage: ${img},`)
    lines.push(`  },`)
  }
  lines.push(`}`, ``)

  fs.writeFileSync(OUT, lines.join('\n'), 'utf-8')
  console.log(`Wrote ${OUT} with ${slugs.length} entries.`)
}

function main() {
  const entries = buildMap()
  writeOutput(entries)
}

main()
