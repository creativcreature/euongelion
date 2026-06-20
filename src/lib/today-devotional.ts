/**
 * today-devotional.ts
 *
 * Stable, date-driven devotional selection for the /today surface.
 *
 * Algorithm: walk ALL_SERIES_ORDER (non-bible-365) and collect every
 * day slug in series order, then index by day-of-year (UTC) modulo the
 * catalog length. Same UTC calendar date always returns the same slug,
 * so server + client + crawler see identical content.
 *
 * Cloudflare Workers: public/devotionals/*.json are ASSETS, not
 * filesystem files — fs.readFile silently fails.  Use self-fetch via
 * NEXT_PUBLIC_APP_URL (set in wrangler.jsonc / Vercel env) with a
 * production fallback of https://euangelion.app.
 */

import {
  SERIES_DATA,
  WAKEUP_SERIES_ORDER,
  SUBSTACK_SERIES_ORDER,
  NEW_SERIES_ORDER,
} from '@/data/series'
import type { Devotional } from '@/types'

// ---------------------------------------------------------------------------
// Curated rotation — all non-bible-365 slugs in a stable order
// ---------------------------------------------------------------------------

const CURATED_ORDER = [
  ...WAKEUP_SERIES_ORDER,
  ...SUBSTACK_SERIES_ORDER,
  ...NEW_SERIES_ORDER,
] as const

/** Flat, ordered list of every day slug across the curated rotation. */
export const TODAY_ROTATION: string[] = CURATED_ORDER.flatMap((seriesSlug) => {
  const series = SERIES_DATA[seriesSlug]
  if (!series) return []
  return series.days.map((d) => d.slug)
})

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** UTC day-of-year (1-indexed). Jan 1 = 1, Dec 31 = 365 or 366. */
function utcDayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const now = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  )
  const MS_PER_DAY = 86_400_000
  return Math.floor((now - start) / MS_PER_DAY)
}

/** Pick today's slug deterministically. */
export function pickTodaySlug(date: Date = new Date()): string {
  const dayIndex = utcDayOfYear(date) - 1 // 0-indexed
  const slug = TODAY_ROTATION[dayIndex % TODAY_ROTATION.length]
  // Fallback to first slug in rotation if something goes wrong
  return slug ?? TODAY_ROTATION[0]
}

// ---------------------------------------------------------------------------
// Series metadata for a given slug
// ---------------------------------------------------------------------------

export function findSeriesForSlug(slug: string) {
  for (const seriesSlug of CURATED_ORDER) {
    const series = SERIES_DATA[seriesSlug]
    if (!series) continue
    const day = series.days.find((d) => d.slug === slug)
    if (day) return { series, seriesSlug, day }
  }
  return null
}

// ---------------------------------------------------------------------------
// Content fetch — self-fetch from Workers asset binding
// ---------------------------------------------------------------------------

/**
 * Load the full devotional JSON.
 *
 * Strategy (in order):
 * 1. Node.js fs.readFile — works in Next.js dev and Node runtimes where
 *    public/ is on disk. Fastest, no network roundtrip.
 * 2. Self-fetch via NEXT_PUBLIC_APP_URL — works on Cloudflare Workers where
 *    public/devotionals/ files are ASSETS (bound to the Worker), not on a
 *    filesystem. The NEXT_PUBLIC_APP_URL secret is set to the production URL
 *    (https://euangelion.app) in the Cloudflare secrets.
 *
 * On Workers, strategy 1 silently fails (fs is not available); strategy 2
 * picks up. In local dev, strategy 1 succeeds and strategy 2 is never reached.
 */
export async function fetchTodayDevotional(
  slug: string,
): Promise<Devotional | null> {
  // Strategy 1: Node fs (dev + Node runtimes)
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
    return JSON.parse(raw) as Devotional
  } catch {
    // Workers runtime — fs is not available; fall through to self-fetch.
  }

  // Strategy 2: self-fetch via NEXT_PUBLIC_APP_URL (Cloudflare Workers).
  // NEXT_PUBLIC_* is inlined at BUILD time, so a dev build can bake in
  // http://localhost:3333 here. Strategy 2 only runs on Workers (where fs
  // failed), and a localhost base is never reachable there — so treat any
  // localhost/127.0.0.1 base as unset and fall back to the production origin.
  // This makes the live self-fetch robust regardless of what the build inlined.
  let baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL || 'https://euangelion.app'
  ).replace(/\/$/, '')
  if (/localhost|127\.0\.0\.1/.test(baseUrl)) {
    baseUrl = 'https://euangelion.app'
  }

  const url = `${baseUrl}/devotionals/${slug}.json`

  try {
    const res = await fetch(url, {
      // ISR: revalidate at most once per hour so /today stays warm
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return (await res.json()) as Devotional
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Edition date label
// ---------------------------------------------------------------------------

/** "Wednesday, June 11, 2026" */
export function formatEditionDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/** "JUN. 11, 2026" — compressed masthead edition slug */
export function formatEditionSlug(date: Date = new Date()): string {
  const month = date
    .toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
    .toUpperCase()
  const day = date.toLocaleString('en-US', { day: '2-digit', timeZone: 'UTC' })
  const year = date.toLocaleString('en-US', {
    year: 'numeric',
    timeZone: 'UTC',
  })
  return `${month}. ${day}, ${year}`
}
