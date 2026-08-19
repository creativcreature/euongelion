#!/usr/bin/env node
/**
 * Generate src/data/devotional-publish-dates.ts.
 *
 * Every devotional gets a date. They are not all worth the same, so each record
 * also carries the evidence it rests on, and the reader renders accordingly:
 *
 *   substack     a real publication date from the Substack export or the live
 *                post's JSON-LD. One reading, one day. Render the exact day.
 *   series-ship  the whole series entered the repo on one day, which for a
 *                prefab series IS its publication day. Render the exact day.
 *   first-seen   the reading arrived in a bulk import of dozens or hundreds.
 *                The day is when a script ran, not when anything was published.
 *                Render the MONTH only — claiming a day here would invent a
 *                publishing event that never happened.
 *
 * Re-runnable and safe: it reads only evidence, never the previous output.
 *
 *   node scripts/build-publish-dates.mjs           # write
 *   node scripts/build-publish-dates.mjs --check   # report, write nothing
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CHECK = process.argv.includes('--check')
const OUT = path.join(REPO, 'src/data/devotional-publish-dates.ts')

/** A bulk import this size or larger is a script run, not a publication. */
const BULK_THRESHOLD = 20

// Recovered by fetching the live posts' JSON-LD datePublished. These published
// after the Substack CSV export was taken, so the export has no date for them.
// Verified 2026-08-18; the same method reproduced a known CSV date exactly.
const RECOVERED = {
  'genesis-two-stories-of-creation-day-1': '2026-01-11',
  'genesis-two-stories-of-creation-day-2': '2026-01-12',
  'genesis-two-stories-of-creation-day-3': '2026-01-13',
  'genesis-two-stories-of-creation-day-4': '2026-01-14',
  'genesis-two-stories-of-creation-day-5': '2026-01-15',
}

const parseCsv = (text) => {
  const rows = []
  let row = [], field = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false }
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  const head = rows.shift()
  return rows.filter((r) => r.length === head.length)
             .map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])))
}

// --- evidence 1: Substack publication dates -------------------------------
const csv = parseCsv(fs.readFileSync(path.join(REPO, 'content/data/posts.csv'), 'utf8'))
const bySlug = {}
for (const r of csv) {
  const id = r.post_id || ''
  if (!id.includes('.') || !(r.post_date || '').trim()) continue
  bySlug[id.slice(id.indexOf('.') + 1)] = r.post_date.slice(0, 10)
}
const sourcesTs = fs.readFileSync(path.join(REPO, 'src/data/substack-sources.ts'), 'utf8')
const substack = { ...RECOVERED }
for (const m of sourcesTs.matchAll(/'([a-z0-9-]+)':\s*\{\s*substackUrl:\s*'([^']+)'/g)) {
  const urlSlug = m[2].replace(/\/$/, '').split('/p/').pop()
  if (bySlug[urlSlug]) substack[m[1]] = bySlug[urlSlug]
}

// --- evidence 2: the day each file first entered git ------------------------
const log = execFileSync('git', [
  'log', '--diff-filter=A', '--name-only', '--format=COMMIT|%ad', '--date=short',
  '--', 'public/devotionals',
], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

const firstSeen = {}
let commitDate = null
for (const line of log.split('\n')) {
  if (line.startsWith('COMMIT|')) { commitDate = line.slice(7).trim(); continue }
  // git log is newest-first, so the last write for a path is its oldest commit
  if (line.endsWith('.json') && commitDate) firstSeen[path.basename(line, '.json')] = commitDate
}
const daySize = {}
for (const d of Object.values(firstSeen)) daySize[d] = (daySize[d] || 0) + 1

// --- resolve ---------------------------------------------------------------
const slugs = fs.readdirSync(path.join(REPO, 'public/devotionals'))
  .filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort()

const out = {}
const tally = { substack: 0, 'series-ship': 0, 'first-seen': 0, none: 0 }
for (const slug of slugs) {
  const git = firstSeen[slug]
  const sub = substack[slug]
  // The earliest thing we can evidence is the closest to the truth: a Substack
  // post predates the repo import of the same reading by months.
  if (sub && (!git || sub <= git)) { out[slug] = { publishedAt: sub, source: 'substack' }; tally.substack++ }
  else if (git) {
    const source = daySize[git] >= BULK_THRESHOLD ? 'first-seen' : 'series-ship'
    out[slug] = { publishedAt: git, source }
    tally[source]++
  } else tally.none++
}

const precise = tally.substack + tally['series-ship']
console.log(`devotionals            : ${slugs.length}`)
console.log(`  substack (exact day) : ${tally.substack}`)
console.log(`  series ship (exact)  : ${tally['series-ship']}`)
console.log(`  bulk import (month)  : ${tally['first-seen']}`)
console.log(`  unresolved           : ${tally.none}`)
console.log(`exact-day coverage     : ${precise}/${slugs.length} (${Math.round((precise / slugs.length) * 100)}%)`)

if (CHECK) { console.log('\n--check: nothing written'); process.exit(0) }

const body = Object.entries(out)
  .map(([s, v]) => `  '${s}': { publishedAt: '${v.publishedAt}', source: '${v.source}' },`)
  .join('\n')

fs.writeFileSync(OUT, `/**
 * Auto-generated by scripts/build-publish-dates.mjs. Do NOT edit by hand.
 *
 * \`source\` records what the date rests on, because the three are not equally
 * strong and must not be rendered the same way:
 *
 *   'substack'    real publication date. Render the exact day.
 *   'series-ship' the whole series landed together, which is its publication
 *                 day. Render the exact day.
 *   'first-seen'  arrived in a bulk import of ${BULK_THRESHOLD}+ files. The day is when a
 *                 script ran. Render the MONTH ONLY — an exact day here would
 *                 assert a publishing event that never took place.
 *
 * Use formatPublished() rather than reading publishedAt directly, so the
 * distinction cannot be lost at a call site.
 */

export type PublishDateSource = 'substack' | 'series-ship' | 'first-seen'

export interface DevotionalPublishDate {
  publishedAt: string
  source: PublishDateSource
}

export const DEVOTIONAL_PUBLISH_DATES: Record<string, DevotionalPublishDate> = {
${body}
}

/** Exact-day sources are safe to render as a full date; bulk imports are not. */
export const isExactDay = (s: PublishDateSource) => s !== 'first-seen'

/**
 * Render a devotional's date at the granularity its evidence supports.
 * Returns null when we have nothing — the colophon simply omits the line.
 */
export function formatPublished(slug: string): string | null {
  const rec = DEVOTIONAL_PUBLISH_DATES[slug]
  if (!rec) return null
  const [y, m, d] = rec.publishedAt.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return isExactDay(rec.source)
    ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}
`, 'utf8')
console.log(`\nwrote ${path.relative(REPO, OUT)}`)
