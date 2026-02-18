import fs from 'fs'
import path from 'path'
import { CURATED_SOURCE_PRIORITY } from './constants'

export interface CuratedDayModule {
  type: string
  order?: number
  [key: string]: unknown
}

export interface CuratedDay {
  day: number
  title: string
  scriptureReference: string
  modules: CuratedDayModule[]
}

export interface CuratedSeries {
  slug: string
  title: string
  sourcePath: string
  days: CuratedDay[]
}

type JsonObject = Record<string, unknown>

function normalizeModule(raw: unknown): CuratedDayModule | null {
  if (!raw || typeof raw !== 'object') return null
  const rawModule = raw as JsonObject
  const type = String(rawModule.type || '').trim()
  if (!type) return null

  const content =
    rawModule.content && typeof rawModule.content === 'object'
      ? (rawModule.content as JsonObject)
      : {}

  return {
    ...content,
    ...rawModule,
    type,
  }
}

function normalizeDay(raw: unknown, fallbackDay: number): CuratedDay | null {
  if (!raw || typeof raw !== 'object') return null
  const dayObj = raw as JsonObject

  const nestedDay =
    dayObj.day && typeof dayObj.day === 'object'
      ? (dayObj.day as JsonObject)
      : null

  const dayNumberRaw = nestedDay?.number ?? dayObj.day ?? dayObj.number
  const dayNumber =
    typeof dayNumberRaw === 'number'
      ? dayNumberRaw
      : Number.parseInt(String(dayNumberRaw || fallbackDay), 10)

  const title =
    String(nestedDay?.title || dayObj.title || `Day ${fallbackDay}`).trim() ||
    `Day ${fallbackDay}`
  const scriptureReference = String(
    nestedDay?.anchorVerse ||
      dayObj.anchorVerse ||
      dayObj.verse ||
      dayObj.scriptureReference ||
      '',
  ).trim()

  let modulesRaw = Array.isArray(dayObj.modules)
    ? dayObj.modules
    : Array.isArray((dayObj as JsonObject).contentModules)
      ? ((dayObj as JsonObject).contentModules as unknown[])
      : []

  if (modulesRaw.length === 0 && Array.isArray(dayObj.panels)) {
    const panels = dayObj.panels as Array<Record<string, unknown>>
    const prayerPanel = panels.find((panel) => panel.type === 'prayer')
    const textPanel = panels.find((panel) => {
      const type = String(panel.type || '')
      return type === 'text' || type === 'text-with-image'
    })
    const takeawayPanel = [...panels].reverse().find((panel) => {
      const type = String(panel.type || '')
      return type === 'text' || type === 'text-with-image'
    })
    const takeawayLine = String(
      (dayObj.nextStep as string) ||
        (dayObj.takeaway as string) ||
        takeawayPanel?.content ||
        '',
    )
      .trim()
      .split('\n')
      .find((line) => line.trim().length > 10)

    const syntheticModules: Array<Record<string, unknown>> = [
      {
        type: 'scripture',
        reference: String(
          dayObj.scriptureReference || dayObj.anchorVerse || '',
        ).trim(),
        passage: String(dayObj.framework || '').trim(),
      },
      {
        type: 'teaching',
        content: String(textPanel?.content || '').trim(),
      },
      {
        type: 'reflection',
        prompt: `What is one honest response you have to "${title}" today?`,
      },
      {
        type: 'prayer',
        prayerText: String(prayerPanel?.content || '').trim(),
      },
      {
        type: 'takeaway',
        commitment:
          takeawayLine ||
          `Practice one concrete response to "${title}" before the day ends.`,
      },
    ]

    modulesRaw = syntheticModules
  }

  const modules = modulesRaw
    .map((mod) => normalizeModule(mod))
    .filter((mod): mod is CuratedDayModule => Boolean(mod))

  if (!Number.isFinite(dayNumber) || modules.length === 0) return null

  return {
    day: dayNumber,
    title,
    scriptureReference,
    modules,
  }
}

function loadJsonFile(filePath: string): JsonObject | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw) as JsonObject
  } catch {
    return null
  }
}

function normalizeSeries(
  raw: JsonObject,
  sourcePath: string,
): CuratedSeries | null {
  const series =
    raw.series && typeof raw.series === 'object'
      ? (raw.series as JsonObject)
      : {}
  const slug = String(series.id || raw.slug || '').trim()
  if (!slug) return null

  const title = String(series.title || raw.title || slug).trim()
  const daysRaw: unknown[] = Array.isArray(raw.days)
    ? (raw.days as unknown[])
    : raw.day
      ? [raw]
      : []

  const days = daysRaw
    .map((day, index) => normalizeDay(day, index + 1))
    .filter((day): day is CuratedDay => Boolean(day))
    .sort((a, b) => a.day - b.day)

  if (days.length === 0) return null

  return {
    slug,
    title,
    sourcePath,
    days,
  }
}

function scanSeriesFromDirectory(absDir: string): CuratedSeries[] {
  if (!fs.existsSync(absDir)) return []
  const files = fs
    .readdirSync(absDir)
    .filter((file) => file.endsWith('.json'))
    .sort()

  const seriesList: CuratedSeries[] = []
  for (const file of files) {
    const fullPath = path.join(absDir, file)
    const parsed = loadJsonFile(fullPath)
    if (!parsed) continue
    const series = normalizeSeries(parsed, fullPath)
    if (!series) continue
    seriesList.push(series)
  }

  return seriesList
}

let cachedCatalog: Map<string, CuratedSeries> | null = null

export function getCuratedCatalog(): Map<string, CuratedSeries> {
  if (cachedCatalog) return cachedCatalog

  const catalog = new Map<string, CuratedSeries>()
  for (const relDir of CURATED_SOURCE_PRIORITY) {
    const absDir = path.join(process.cwd(), relDir)
    const entries = scanSeriesFromDirectory(absDir)
    for (const entry of entries) {
      // First source wins due to explicit priority ordering.
      if (!catalog.has(entry.slug)) {
        catalog.set(entry.slug, entry)
      }
    }
  }

  cachedCatalog = catalog
  return catalog
}

export function getCuratedSeries(slug: string): CuratedSeries | null {
  return getCuratedCatalog().get(slug) ?? null
}

export function getCuratedSeriesSlugs(): string[] {
  return Array.from(getCuratedCatalog().keys())
}
