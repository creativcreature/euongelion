/**
 * series-detail-tabs.ts
 *
 * Server-side data assembly for the tabbed series detail page
 * (F-074 — DAYS · ABOUT · VOICES · ARTWORK, Waking Up model).
 *
 * VOICES — extracted from the `profile` modules inside each day's
 * devotional JSON (public/devotionals/<slug>.json). Profiles are the
 * historic/biblical/testimony figures a series draws on (e.g. Corrie
 * ten Boom, Augustine, Isaiah). Series whose days carry no profile
 * modules (the 7 panels-format Wake-Up originals) yield an empty
 * array and the tab is omitted — nothing is fabricated.
 *
 * ARTWORK — the per-day artwork already assigned to each series by
 * the relevance pipeline (SITE_DEVOTIONAL_ART, R35 re-rank). Static
 * import, so no runtime I/O; series without per-day art (bible-365)
 * yield an empty array and the tab is omitted.
 *
 * Runtime notes (mirrors src/lib/today-devotional.ts): on Cloudflare
 * Workers public/devotionals/*.json are ASSETS, not filesystem files,
 * so day JSONs are read via fs first (dev/build) and self-fetch
 * second (Workers ISR). Voice extraction is capped at 31 days: the
 * only longer series is bible-365, whose canonical detail surface is
 * the dedicated /series/bible-365 route, and 365 self-fetches at ISR
 * time would exceed the Workers subrequest budget.
 */

import { SITE_DEVOTIONAL_ART } from '@/data/site-devotional-art'
import type { SeriesInfo } from '@/data/series'

export interface SeriesVoice {
  name: string
  title: string
  description: string
  keyQuote: string
  days: number[]
}

export interface SeriesArtworkItem {
  slug: string
  src: string
  title: string
  days: number[]
}

/** bible-365 guard — see module docblock. */
const MAX_DAYS_FOR_VOICE_EXTRACTION = 31

type JsonObject = Record<string, unknown>

async function loadDevotionalJson(slug: string): Promise<JsonObject | null> {
  // Strategy 1: Node fs (dev + build-time SSG).
  try {
    const { promises: fs } = await import('node:fs')
    const { join } = await import('node:path')
    const filePath = join(
      process.cwd(),
      'public',
      'devotionals',
      `${slug}.json`,
    )
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as JsonObject
  } catch {
    // Workers runtime — fs is unavailable; fall through to self-fetch.
  }

  // Strategy 2: self-fetch via NEXT_PUBLIC_APP_URL (Cloudflare Workers).
  // Same localhost guard as today-devotional.ts: a dev build can bake in
  // http://localhost:3333, which is never reachable from the Worker.
  let baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || 'https://euangelion.app'
  ).replace(/\/$/, '')
  if (/localhost|127\.0\.0\.1/.test(baseUrl)) {
    baseUrl = 'https://euangelion.app'
  }

  try {
    const res = await fetch(`${baseUrl}/devotionals/${slug}.json`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) {
      console.error(
        `[series-detail-tabs] devotional JSON fetch failed (${res.status}): ${slug}`,
      )
      return null
    }
    return (await res.json()) as JsonObject
  } catch (error) {
    console.error(
      `[series-detail-tabs] devotional JSON unreachable: ${slug}`,
      error,
    )
    return null
  }
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Normalize one raw profile record into a voice, or null when it
 * lacks the minimum substance (a name plus either a description or a
 * key quote). Handles the flat, content-nested, and data-nested
 * module formats seen across the devotional JSON variants.
 */
function normalizeProfileRecord(
  raw: unknown,
): Omit<SeriesVoice, 'days'> | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as JsonObject
  const content =
    record.content && typeof record.content === 'object'
      ? (record.content as JsonObject)
      : {}
  const data =
    record.data && typeof record.data === 'object'
      ? (record.data as JsonObject)
      : {}
  const merged: JsonObject = { ...record, ...content, ...data }

  const name = toText(merged.name)
  const description = toText(merged.description)
  const keyQuote = toText(merged.keyQuote)
  if (!name || (!description && !keyQuote)) return null

  return {
    name,
    title: toText(merged.title) || toText(merged.heading),
    description,
    keyQuote,
  }
}

/** Extract every profile record from one day's modules. */
function extractDayProfiles(
  dayJson: JsonObject,
): Array<Omit<SeriesVoice, 'days'>> {
  const modules = Array.isArray(dayJson.modules) ? dayJson.modules : []
  const profiles: Array<Omit<SeriesVoice, 'days'>> = []
  for (const mod of modules) {
    if (!mod || typeof mod !== 'object') continue
    const modObj = mod as JsonObject
    if (String(modObj.type || '') !== 'profile') continue

    // Variant A: one profile module = one figure (450 of 451 modules).
    const single = normalizeProfileRecord(modObj)
    if (single) {
      profiles.push(single)
      continue
    }

    // Variant B: `profiles: []` array of figures on a single module
    // (signs-boldness-opposition-integrity-day-1).
    if (Array.isArray(modObj.profiles)) {
      for (const entry of modObj.profiles) {
        const normalized = normalizeProfileRecord(entry)
        if (normalized) profiles.push(normalized)
      }
    }
  }
  return profiles
}

/**
 * Build the deduped voice list for a series. Voices repeating across
 * days (e.g. Nick Vujicic through all 5 days of "Valued") collapse to
 * one entry carrying every day number they appear on.
 */
export async function buildSeriesVoices(
  series: Pick<SeriesInfo, 'days'>,
): Promise<SeriesVoice[]> {
  if (series.days.length > MAX_DAYS_FOR_VOICE_EXTRACTION) return []

  const dayJsons = await Promise.all(
    series.days.map(async (day) => ({
      day: day.day,
      json: await loadDevotionalJson(day.slug),
    })),
  )

  const byName = new Map<string, SeriesVoice>()
  for (const { day, json } of dayJsons) {
    if (!json) continue
    for (const profile of extractDayProfiles(json)) {
      const key = profile.name.toLowerCase()
      const existing = byName.get(key)
      if (existing) {
        if (!existing.days.includes(day)) existing.days.push(day)
        // Keep the first (earliest-day) title/description/quote — the
        // introduction of the figure, not a later-day variation.
        continue
      }
      byName.set(key, { ...profile, days: [day] })
    }
  }

  return Array.from(byName.values()).map((voice) => ({
    ...voice,
    days: [...voice.days].sort((a, b) => a - b),
  }))
}

/**
 * Build the deduped artwork list for a series from the per-day art
 * assignments. Purely static — safe on any runtime.
 */
export function buildSeriesArtwork(
  series: Pick<SeriesInfo, 'days'>,
): SeriesArtworkItem[] {
  const bySlug = new Map<string, SeriesArtworkItem>()
  for (const day of series.days) {
    const entries = SITE_DEVOTIONAL_ART[day.slug] ?? []
    for (const entry of entries) {
      if (!entry.src || !entry.slug) continue
      const existing = bySlug.get(entry.slug)
      if (existing) {
        if (!existing.days.includes(day.day)) existing.days.push(day.day)
        continue
      }
      bySlug.set(entry.slug, {
        slug: entry.slug,
        src: entry.src,
        title: entry.title || 'Series artwork',
        days: [day.day],
      })
    }
  }

  return Array.from(bySlug.values()).map((item) => ({
    ...item,
    days: [...item.days].sort((a, b) => a - b),
  }))
}
