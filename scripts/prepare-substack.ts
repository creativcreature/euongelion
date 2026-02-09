#!/usr/bin/env node
/**
 * Converts 19 Substack series JSONs into individual devotional day files
 * in public/devotionals/{series-slug}-day-{n}.json
 *
 * PRESERVES all original Substack data — only renames fields where
 * component expectations differ from source naming.
 *
 * Handles five source variants:
 * A: { series, days: [{ number, title, anchorVerse, theme, modules }] }
 * B: { series, days: [{ day: { number, title }, modules }] }
 * C: { series, days: [...], masterDocument, profiles, resources }
 * D: { series, day: { number }, modules } (single day at root)
 * E: { series, overview, modules } (overview treated as day 1)
 */

import * as fs from 'fs'
import * as path from 'path'

const SERIES_DIR = path.join(process.cwd(), 'content', 'series-json')
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'devotionals')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>

/**
 * Normalizes a module by spreading all nested content fields to the top level.
 * Only renames the few fields where component expectations differ from source.
 */
function normalizeModule(mod: AnyObj): AnyObj {
  const { type, order, content, data, ...rest } = mod

  // Determine nested content object (Substack wraps fields under content or data)
  const nested: AnyObj | null =
    content && typeof content === 'object' && !Array.isArray(content)
      ? content
      : data && typeof data === 'object' && !Array.isArray(data)
        ? data
        : null

  // Start with type + all top-level fields (excluding order/content/data wrappers)
  const result: AnyObj = { type, ...rest }

  if (nested) {
    // Spread ALL nested fields into result (preserving everything)
    for (const [key, val] of Object.entries(nested)) {
      if (val !== undefined && val !== null) {
        result[key] = val
      }
    }
  }

  // --- Critical renames (component expects different field names) ---

  // Scripture: text -> passage
  if (type === 'scripture' && result.text && !result.passage) {
    result.passage = result.text
    delete result.text
  }

  // Vocab: meaning -> definition (keep meaning as alias too)
  if (result.meaning && !result.definition) {
    result.definition = result.meaning
  }

  // Vocab: rootMeaning -> usage (keep rootMeaning too)
  if (result.rootMeaning && !result.usage) {
    result.usage = result.rootMeaning
  }

  // Teaching/Story/Insight/Bridge: body -> content
  if (result.body && !result.content) {
    result.content = result.body
  }

  // Title -> heading (avoid collision with devotional-level title)
  if (result.title && type !== 'profile') {
    if (!result.heading) result.heading = result.title
    delete result.title
  }

  // Prayer: text -> prayerText (avoid collision with general text)
  if (type === 'prayer') {
    if (result.text && !result.prayerText) {
      result.prayerText = result.text
      delete result.text
    }
    // Rename prayer's type to prayerType to avoid collision with module type
    if (result.type !== type) {
      // type was overwritten by nested 'type' field (e.g., "personal")
      result.prayerType = result.type
      result.type = type
    }
  }

  // Profile: keep title as heading, description stays as description
  if (type === 'profile') {
    if (result.title && !result.heading) {
      result.heading = result.title
    }
  }

  // Takeaway: commitment is the primary field — also provide as content for backward compat
  if (type === 'takeaway' && result.commitment && !result.content) {
    result.content = result.commitment
  }

  // Remove order metadata (not needed in output)
  delete result.order

  return result
}

function estimateWordCount(modules: AnyObj[]): number {
  let words = 0
  const countStr = (val: unknown): void => {
    if (typeof val === 'string') {
      words += val.split(/\s+/).length
    } else if (Array.isArray(val)) {
      val.forEach(countStr)
    } else if (val && typeof val === 'object') {
      Object.values(val).forEach(countStr)
    }
  }
  for (const mod of modules) {
    for (const val of Object.values(mod)) {
      countStr(val)
    }
  }
  return words
}

function writeDayFile(
  seriesSlug: string,
  dayNum: number,
  title: string,
  subtitle: string,
  teaser: string,
  anchorVerse: string,
  theme: string,
  rawModules: AnyObj[],
): void {
  const slug = `${seriesSlug}-day-${dayNum}`
  const modules = rawModules.map(normalizeModule)

  // Extract scripture reference from first scripture module if not provided
  let scriptureRef = anchorVerse
  if (!scriptureRef) {
    const firstScripture = modules.find((m) => m.type === 'scripture')
    if (firstScripture) scriptureRef = firstScripture.reference || ''
  }

  const devotional: AnyObj = {
    day: dayNum,
    title,
    ...(subtitle ? { subtitle } : {}),
    teaser: teaser || theme || '',
    ...(anchorVerse ? { anchorVerse } : {}),
    ...(theme ? { theme } : {}),
    framework: scriptureRef,
    scriptureReference: scriptureRef,
    modules,
    panels: [],
    totalWords: estimateWordCount(modules),
  }

  const outPath = path.join(OUTPUT_DIR, `${slug}.json`)
  fs.writeFileSync(outPath, JSON.stringify(devotional, null, 2))
}

function processFile(filePath: string): number {
  const raw = fs.readFileSync(filePath, 'utf8')
  const data = JSON.parse(raw) as AnyObj
  let count = 0
  let seriesSlug: string
  let seriesTitle: string

  if (data.series && Array.isArray(data.days)) {
    // Variants A/B/C: multi-day series
    seriesSlug = data.series.id
    seriesTitle = data.series.title

    for (const dayEntry of data.days) {
      let dayNum: number
      let dayTitle: string
      let subtitle = ''
      let theme = ''
      let anchorVerse = ''
      let modules: AnyObj[]

      if (dayEntry.day && typeof dayEntry.day === 'object') {
        // Variant B: { day: { number, title, subtitle, anchorVerse, theme }, modules }
        dayNum = dayEntry.day.number
        dayTitle = dayEntry.day.title
        subtitle = dayEntry.day.subtitle || ''
        theme = dayEntry.day.theme || ''
        anchorVerse = dayEntry.day.anchorVerse || ''
        modules = dayEntry.modules
      } else if (typeof dayEntry.day === 'number') {
        // { day: 1, title: "...", modules: [...] }
        dayNum = dayEntry.day
        dayTitle = dayEntry.title
        theme = dayEntry.theme || ''
        anchorVerse = dayEntry.verse || dayEntry.anchorVerse || ''
        modules = dayEntry.modules
      } else {
        // Variant A: { number: 1, title: "...", anchorVerse, theme, modules }
        dayNum = dayEntry.number
        dayTitle = dayEntry.title
        theme = dayEntry.theme || ''
        anchorVerse = dayEntry.anchorVerse || ''
        modules = dayEntry.modules
      }

      writeDayFile(
        seriesSlug,
        dayNum,
        dayTitle,
        subtitle,
        theme,
        anchorVerse,
        theme,
        modules,
      )
      count++
    }
  } else if (!data.series && Array.isArray(data.days)) {
    // Format B (no series wrapper): { slug, title, days: [{ day_number, title, modules }] }
    seriesSlug = data.slug
    seriesTitle = data.title
    for (const dayEntry of data.days) {
      const dayNum = dayEntry.day_number
      writeDayFile(
        seriesSlug,
        dayNum,
        dayEntry.title,
        dayEntry.subtitle || '',
        dayEntry.subtitle || '',
        '',
        '',
        dayEntry.modules,
      )
      count++
    }
  } else if (data.series && data.day && data.modules) {
    // Variant D: single day file { series, day, modules }
    seriesSlug = data.series.id
    seriesTitle = data.series.title
    const dayNum = data.day.number || 1
    writeDayFile(
      seriesSlug,
      dayNum,
      data.day.title || seriesTitle,
      data.day.subtitle || '',
      data.day.theme || '',
      data.day.anchorVerse || '',
      data.day.theme || '',
      data.modules,
    )
    count = 1
  } else if (data.series && data.overview && data.modules) {
    // Variant E: overview file, treat as day 1
    seriesSlug = data.series.id
    seriesTitle = data.series.title
    writeDayFile(
      seriesSlug,
      1,
      seriesTitle,
      '',
      data.overview.introduction || '',
      '',
      '',
      data.modules,
    )
    count = 1
  } else {
    console.log(`  SKIPPED: ${path.basename(filePath)} (unknown format)`)
    return 0
  }

  console.log(`  ${seriesTitle} (${seriesSlug}): ${count} day(s)`)
  return count
}

// Main
console.log('Preparing Substack series (preserving all original data)...\n')

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

const files = fs
  .readdirSync(SERIES_DIR)
  .filter((f: string) => f.endsWith('.json'))

let totalDays = 0
for (const file of files) {
  totalDays += processFile(path.join(SERIES_DIR, file))
}

console.log(
  `\nDone! Generated ${totalDays} devotional files in public/devotionals/`,
)
