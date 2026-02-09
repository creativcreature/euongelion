#!/usr/bin/env node
/**
 * Converts 19 Substack series JSONs into individual devotional day files
 * in public/devotionals/{series-slug}-day-{n}.json
 *
 * Handles three source formats:
 * Format A: { series: { id }, days: [{ day: { number, title }, modules }] }
 * Format B: { slug, title, days: [{ day_number, title, modules }] }
 * Format C: { series: { id }, day: { number }, modules } (single day)
 */

import * as fs from 'fs'
import * as path from 'path'

const SERIES_DIR = path.join(__dirname, '..', 'content', 'series-json')
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'devotionals')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>

// Map nested Substack module fields to flat Module interface fields
const MODULE_FIELD_MAP: Record<string, Record<string, string>> = {
  scripture: {
    text: 'passage',
    reference: 'reference',
    translation: 'translation',
  },
  vocab: {
    word: 'word',
    transliteration: 'transliteration',
    language: 'language',
    definition: 'definition',
    meaning: 'definition',
    root_meaning: 'usage',
    rootMeaning: 'usage',
    usage_note: 'usage',
    usageNote: 'usage',
  },
  teaching: {
    body: 'content',
    title: 'heading',
  },
  story: {
    body: 'content',
    title: 'heading',
  },
  insight: {
    body: 'content',
    title: 'heading',
  },
  bridge: {
    body: 'content',
    title: 'heading',
  },
  reflection: {
    prompt: 'prompt',
    question: 'prompt',
    body: 'content',
    title: 'heading',
  },
  prayer: {
    text: 'prayerText',
    body: 'prayerText',
    prayer_text: 'prayerText',
    prayerText: 'prayerText',
    breath_prayer: 'breathPrayer',
    breathPrayer: 'breathPrayer',
    title: 'heading',
  },
  takeaway: {
    body: 'content',
    text: 'content',
    title: 'heading',
    key_point: 'content',
    keyPoint: 'content',
  },
  comprehension: {
    question: 'question',
    options: 'options',
    answer: 'answer',
    correct_answer: 'answer',
    correctAnswer: 'answer',
    explanation: 'explanation',
    title: 'heading',
  },
  profile: {
    name: 'name',
    era: 'era',
    bio: 'bio',
    body: 'bio',
    title: 'heading',
    figure_name: 'name',
    figureName: 'name',
    time_period: 'era',
    timePeriod: 'era',
  },
  resource: {
    title: 'heading',
    resources: 'resources',
    items: 'resources',
  },
}

function normalizeModule(mod: AnyObj): AnyObj {
  const { type } = mod
  const nested: AnyObj = mod.content || mod.data || {}
  const fieldMap = MODULE_FIELD_MAP[type] || {}
  const result: AnyObj = { type }

  // Map nested fields to flat Module fields
  for (const [sourceKey, targetKey] of Object.entries(fieldMap)) {
    if (nested[sourceKey] !== undefined && result[targetKey] === undefined) {
      result[targetKey] = nested[sourceKey]
    }
  }

  // Bridge: combine ancientTruth + modernApplication
  if (type === 'bridge' && !result['content']) {
    const parts: string[] = []
    const ancient = nested['ancientTruth'] || nested['ancient_truth']
    const modern = nested['modernApplication'] || nested['modern_application']
    if (ancient) parts.push(String(ancient))
    if (modern) parts.push(String(modern))
    if (parts.length > 0) result['content'] = parts.join('\n\n')
  }

  // Teaching fallback: keyInsight if no body
  if (type === 'teaching' && !result['content']) {
    const insight = nested['keyInsight'] || nested['key_insight']
    if (insight) result['content'] = String(insight)
  }

  // Comprehension: ensure answer is number
  if (type === 'comprehension' && result['answer'] !== undefined) {
    result['answer'] = Number(result['answer'])
  }

  // Heading fallback
  if (!result['heading'] && nested['title']) {
    result['heading'] = nested['title']
  }

  return result
}

function estimateWordCount(modules: AnyObj[]): number {
  let words = 0
  for (const mod of modules) {
    for (const val of Object.values(mod)) {
      if (typeof val === 'string') words += val.split(/\s+/).length
    }
  }
  return words
}

function writeDayFile(
  seriesSlug: string,
  dayNum: number,
  title: string,
  teaser: string,
  anchorVerse: string,
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

  const devotional = {
    day: dayNum,
    title,
    teaser,
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
    // Format A: { series: { id }, days: [...] }
    // Days can be either { day: { number, title }, modules } or { number, title, modules }
    seriesSlug = data.series.id
    seriesTitle = data.series.title
    for (const dayEntry of data.days) {
      let dayNum: number
      let dayTitle: string
      let theme = ''
      let anchorVerse = ''
      let modules: AnyObj[]

      if (dayEntry.day && typeof dayEntry.day === 'object') {
        // { day: { number, title, ... }, modules }
        dayNum = dayEntry.day.number
        dayTitle = dayEntry.day.title
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
        // { number: 1, title: "...", modules: [...] }
        dayNum = dayEntry.number
        dayTitle = dayEntry.title
        theme = dayEntry.theme || ''
        anchorVerse = dayEntry.anchorVerse || ''
        modules = dayEntry.modules
      }

      writeDayFile(seriesSlug, dayNum, dayTitle, theme, anchorVerse, modules)
      count++
    }
  } else if (!data.series && Array.isArray(data.days)) {
    // Format B: { slug, title, days: [{ day_number, title, modules }] }
    seriesSlug = data.slug
    seriesTitle = data.title
    for (const dayEntry of data.days) {
      const dayNum = dayEntry.day_number
      writeDayFile(
        seriesSlug,
        dayNum,
        dayEntry.title,
        dayEntry.subtitle || '',
        '',
        dayEntry.modules,
      )
      count++
    }
  } else if (data.series && data.day && data.modules) {
    // Format C: single day file { series, day, modules }
    seriesSlug = data.series.id
    seriesTitle = data.series.title
    const dayNum = data.day.number || 1
    writeDayFile(
      seriesSlug,
      dayNum,
      data.day.title || seriesTitle,
      data.day.theme || '',
      data.day.anchorVerse || '',
      data.modules,
    )
    count = 1
  } else if (data.series && data.overview && data.modules) {
    // Format C variant: overview file, treat as day 1
    seriesSlug = data.series.id
    seriesTitle = data.series.title
    writeDayFile(
      seriesSlug,
      1,
      seriesTitle,
      data.overview.introduction || '',
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
console.log('Preparing Substack series...\n')

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
