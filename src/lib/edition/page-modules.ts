/**
 * Page-side edition modules (SA-093).
 *
 * Founder, 2026-08-19 morning: "You didn't add any modules… MORE CONTENT!
 * MORE SECTIONS!" — the seven new kinds were invisible because their DB rows
 * sat behind a blocked SQL paste. The architectural correction: deterministic
 * sections never needed a database. Everything here computes AT RENDER TIME
 * from data bundled into the worker (module imports, or getVerse's
 * Workers-safe ASSETS path). No fs, no rows, no paste — the paper is full
 * every day by construction.
 *
 * The DB keeps what it is actually for: the review queue (lead, practice,
 * strip, screening) and the audited gallery.
 */
import PROVERBS from '../../../public/bibles/BSB/PRO.json'
import { BIBLE_365_SERIES } from '@/data/bible-365'
import B365_REFS from '@/data/bible-365-refs.json'
import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'
import { DEVOTIONAL_TEASERS } from '@/data/devotional-teasers'
import { getSeriesHero } from '@/lib/series-hero'

const DAY_MS = 86_400_000

/** UTC days since epoch — the same stride base the generators use. */
export function daysSinceEpochUTC(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      DAY_MS,
  )
}

/* ── A proverb a day — BSB verbatim, bundled corpus ──────────────────── */

export interface PageProverb {
  reference: string
  text: string
  translation: 'BSB'
}

const PROVERB_POOL: PageProverb[] = (() => {
  const book = PROVERBS as Record<string, Record<string, string>>
  const pool: PageProverb[] = []
  // Chapters 10–29 hold the two-line sayings; a proverb is one verse that
  // stands alone. 12–30 words keeps it a saying rather than a fragment.
  for (let ch = 10; ch <= 29; ch += 1) {
    const chapter = book[String(ch)]
    if (!chapter) continue
    for (const [v, text] of Object.entries(chapter)) {
      const words = text.trim().split(/\s+/).length
      if (words >= 12 && words <= 30) {
        pool.push({
          reference: `Proverbs ${ch}:${v}`,
          text: text.trim(),
          translation: 'BSB',
        })
      }
    }
  }
  if (pool.length < 150) {
    // The corpus shrank or the filter broke — fail the build, not the reader.
    throw new Error(
      `proverb pool collapsed to ${pool.length}; expected 150+ from Proverbs 10–29`,
    )
  }
  return pool
})()

export function pageProverb(date: Date): PageProverb {
  return PROVERB_POOL[daysSinceEpochUTC(date) % PROVERB_POOL.length]
}

/* ── From the archive — an older reading, resurfaced ─────────────────── */

export interface PageArchive {
  slug: string
  title: string
  teaser: string
  seriesSlug: string
  seriesTitle: string
  image: string
}

interface ArchiveEntry {
  slug: string
  seriesSlug: string
  seriesTitle: string
  dayTitle: string
}

const ARCHIVE_POOL: ArchiveEntry[] = (() => {
  const pool: ArchiveEntry[] = []
  for (const seriesSlug of ALL_SERIES_ORDER) {
    if (seriesSlug === 'bible-365') continue
    const series = SERIES_DATA[seriesSlug]
    if (!series?.days) continue
    for (const day of series.days) {
      pool.push({
        slug: day.slug,
        seriesSlug,
        seriesTitle: series.title,
        dayTitle: day.title,
      })
    }
  }
  return pool
})()

export function pageArchive(date: Date, excludeSlug?: string): PageArchive {
  const n = daysSinceEpochUTC(date)
  // A different stride from the lead rotation so the two never sync up.
  let idx = (n * 7 + 3) % ARCHIVE_POOL.length
  if (ARCHIVE_POOL[idx].slug === excludeSlug) {
    idx = (idx + 1) % ARCHIVE_POOL.length
  }
  const entry = ARCHIVE_POOL[idx]
  return {
    slug: entry.slug,
    title: entry.dayTitle,
    teaser:
      DEVOTIONAL_TEASERS[entry.slug] ??
      SERIES_DATA[entry.seriesSlug]?.question ??
      '',
    seriesSlug: entry.seriesSlug,
    seriesTitle: entry.seriesTitle,
    image:
      getSeriesHero(entry.seriesSlug)?.src ??
      SERIES_DATA[entry.seriesSlug]?.heroImage ??
      '/images/site/series/prayer-of-jabez.webp',
  }
}

/* ── Today in the Bible-365 plan ─────────────────────────────────────── */

export interface PageB365 {
  day: number
  title: string
  slug: string
  reference: string
}

const B365 = BIBLE_365_SERIES.days

export function pageB365(date: Date): PageB365 {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1)
  const dayOfYear =
    Math.floor(
      (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
        startOfYear) /
        DAY_MS,
    ) + 1
  const idx = Math.min(dayOfYear, B365.length) - 1
  const entry = B365[idx]
  const reference =
    (B365_REFS as Record<string, string>)[String(entry.day)] ?? ''
  if (!reference) {
    // A hole in a 365-file set is a data bug, not a render decision.
    throw new Error(`bible-365 day ${entry.day} has no scripture reference`)
  }
  return { day: entry.day, title: entry.title, slug: entry.slug, reference }
}
