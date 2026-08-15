/**
 * The homepage featured rail — a fresh set of series on every page refresh,
 * with the newest release always leading.
 *
 * Founder, 2026-08-14: "I need the homepage featured series to be dynamic. New
 * series in the features each refresh, except the latest uploaded should always
 * be the first shown on homepage." / "Each page refresh."
 *
 * WHY THE ROTATION HAPPENS ON THE CLIENT. The homepage is served with
 * `cache-control: s-maxage=31536000` — a year of shared edge cache. A rotation
 * computed during render would be baked into the cached HTML and every visitor
 * would see the same "random" set until the cache turned over, which is the
 * opposite of what was asked for. Rotating after hydration also avoids a React
 * hydration mismatch, which is what any `Math.random()` in render would produce.
 *
 * So: `featuredForServer()` is deterministic and renders identically on the
 * server and on the first client pass; `rotateFeatured()` runs once in an
 * effect and reshuffles the tail. The lead never moves.
 */
import { ALL_SERIES_ORDER, NEW_SERIES_ORDER, SERIES_DATA } from '@/data/series'

/** How many cards the rail shows. Founder direction 2026-05-14 (SA-031(1)): 7. */
export const FEATURED_RAIL_SIZE = 7

/**
 * Series written for one named person rather than for the catalog.
 *
 * SA-036(4) is explicit: a commissioned series "enters SERIES_DATA and
 * NEW_SERIES_ORDER, takes one editorially-appropriate /series rail placement,
 * and leaves FEATURED_SERIES and HOMEPAGE_TODAY untouched unless the founder
 * directs otherwise. Reach is by direct link."
 *
 * It is therefore skipped for the LEAD slot even though it is the most recent
 * entry in NEW_SERIES_ORDER, and kept out of the rotating tail as well. Lifting
 * this is a founder call — delete the slug here and the rule below picks it up
 * automatically as the newest.
 */
export const COMMISSIONED_SERIES: ReadonlySet<string> = new Set([
  'looking-at-the-sun',
])

/**
 * The newest series eligible to lead the homepage.
 *
 * Derived from the END of NEW_SERIES_ORDER rather than hardcoded, so shipping a
 * series updates the homepage by appending one slug. The previous arrangement
 * pinned the lead in a `HOMEPAGE_TODAY` literal in `src/app/page.tsx`, which is
 * why it still named `he-cannot-deny-himself` after a newer series had shipped.
 */
export function latestEligibleSeries(): string {
  for (let i = NEW_SERIES_ORDER.length - 1; i >= 0; i -= 1) {
    const slug = NEW_SERIES_ORDER[i]
    if (COMMISSIONED_SERIES.has(slug)) continue
    if (!SERIES_DATA[slug]) continue
    return slug
  }
  // NEW_SERIES_ORDER is non-empty and its entries are all in SERIES_DATA, so
  // this is unreachable in practice; falling back to the catalog head keeps the
  // rail rendering rather than throwing on the homepage.
  return ALL_SERIES_ORDER[0]
}

/** Every series that may appear in the rotating tail, in catalog order. */
export function rotatableSeries(lead: string): string[] {
  return ALL_SERIES_ORDER.filter(
    (slug) =>
      slug !== lead &&
      !COMMISSIONED_SERIES.has(slug) &&
      Boolean(SERIES_DATA[slug]),
  )
}

/**
 * The deterministic set rendered on the server and on the first client pass.
 * Catalog order after the lead — stable, so server and client HTML match.
 */
export function featuredForServer(size: number = FEATURED_RAIL_SIZE): string[] {
  const lead = latestEligibleSeries()
  return [lead, ...rotatableSeries(lead)].slice(0, size)
}

/**
 * A freshly rotated set: the lead, then `size - 1` distinct series drawn at
 * random from the rest of the catalog.
 *
 * `random` is injectable so the shuffle is testable — the production caller
 * passes nothing and gets `Math.random`.
 */
export function rotateFeatured(
  size: number = FEATURED_RAIL_SIZE,
  random: () => number = Math.random,
): string[] {
  const lead = latestEligibleSeries()
  const pool = rotatableSeries(lead)

  // Fisher-Yates over a copy. Partial is enough — we only need the first n.
  const wanted = Math.max(0, size - 1)
  const take = Math.min(wanted, pool.length)
  for (let i = 0; i < take; i += 1) {
    const j = i + Math.floor(random() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return [lead, ...pool.slice(0, take)]
}
