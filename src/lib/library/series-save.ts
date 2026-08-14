/**
 * Series-level save (SA-039 / F-088).
 *
 * Founder direction 2026-08-14: "User should save a devotional series, not
 * individual devotional. Right now a user has to save each individual
 * devotional in a series for it to appear in the library which is incorrect."
 *
 * What is stored is the SERIES slug, in the same `session_bookmarks` row shape
 * the per-devotional save already used — the endpoint validates slug *safety*,
 * not that a slug names a devotional, so no schema change and no migration was
 * required to make the unit of saving a series.
 *
 * Existing per-day rows are not migrated or deleted. They roll up: a saved day
 * slug counts as its series being saved, which is the auto-migration the
 * founder asked for, achieved by reading rather than by rewriting anyone's
 * library.
 */
import { SERIES_DATA } from '@/data/series'

/** `abiding-in-his-presence-day-3` -> `abiding-in-his-presence`. */
export function seriesSlugOf(slug: string): string | null {
  const m = slug.match(/^(.+)-day-\d+$/)
  if (!m) return null
  // The one historical rename that survives in saved rows.
  return m[1] === 'identity-crisis' ? 'identity' : m[1]
}

/** True when the slug names a series rather than one of its days. */
export function isSeriesSlug(slug: string): boolean {
  return Boolean(SERIES_DATA[slug])
}

/**
 * Every saved slug that belongs to `seriesSlug` — the series row itself plus
 * any legacy per-day rows. Used to save and to clear.
 */
export function savedSlugsForSeries(
  savedSlugs: readonly string[],
  seriesSlug: string,
): string[] {
  return savedSlugs.filter(
    (slug) => slug === seriesSlug || seriesSlugOf(slug) === seriesSlug,
  )
}

/** A series counts as saved if its own row exists, or any of its days does. */
export function isSeriesSaved(
  savedSlugs: readonly string[],
  seriesSlug: string | null,
): boolean {
  if (!seriesSlug) return false
  return savedSlugsForSeries(savedSlugs, seriesSlug).length > 0
}

/**
 * The library's shelf: one entry per series, newest first, folding legacy
 * per-day rows into the series they belong to. A saved slug that resolves to
 * no known series (a deleted devotional, say) is kept on its own rather than
 * silently dropped.
 */
export function shelfFromSaved(
  saved: readonly { devotionalSlug: string; savedAt?: string }[],
): { seriesSlug: string; title: string; savedAt?: string; dayCount: number }[] {
  const bySeries = new Map<string, { savedAt?: string }>()

  for (const row of saved) {
    const slug = row.devotionalSlug
    const key = isSeriesSlug(slug) ? slug : (seriesSlugOf(slug) ?? slug)
    const existing = bySeries.get(key)
    // Keep the most recent save timestamp across the folded rows.
    if (!existing || (row.savedAt ?? '') > (existing.savedAt ?? '')) {
      bySeries.set(key, { savedAt: row.savedAt })
    }
  }

  return Array.from(bySeries.entries())
    .map(([seriesSlug, meta]) => ({
      seriesSlug,
      title: SERIES_DATA[seriesSlug]?.title ?? seriesSlug,
      savedAt: meta.savedAt,
      dayCount: SERIES_DATA[seriesSlug]?.days.length ?? 0,
    }))
    .sort((a, b) => (b.savedAt ?? '').localeCompare(a.savedAt ?? ''))
}
