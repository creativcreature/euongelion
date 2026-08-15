/**
 * Catalog ordering for the series library (F-090).
 *
 * The browse page needs to sort the whole catalog several ways, and "newest"
 * is the one that cannot be read off any single existing constant:
 * ALL_SERIES_ORDER opens with `bible-365` and then runs Wake-Up -> Substack ->
 * new, which is roughly provenance order, not release order.
 *
 * Recency is therefore derived once, here, so the library, the homepage rail
 * and any future surface agree on which series is newest instead of each
 * hardcoding a slug (the failure that left `HOMEPAGE_TODAY` naming a series
 * two releases old).
 */
import {
  ALL_SERIES_ORDER,
  NEW_SERIES_ORDER,
  SERIES_DATA,
  type SeriesInfo,
} from '@/data/series'

export type SortKey =
  | 'az'
  | 'za'
  | 'newest'
  | 'shortest'
  | 'longest'
  | 'pathway'

export const SORT_OPTIONS: ReadonlyArray<{ key: SortKey; label: string }> = [
  { key: 'az', label: 'A–Z' },
  { key: 'za', label: 'Z–A' },
  { key: 'newest', label: 'Newest' },
  { key: 'shortest', label: 'Shortest' },
  { key: 'longest', label: 'Longest' },
  { key: 'pathway', label: 'Pathway' },
]

/** Reading order of the three pathways, Sleep -> Awake -> Shepherd. */
const PATHWAY_RANK: Record<SeriesInfo['pathway'], number> = {
  Sleep: 0,
  Awake: 1,
  Shepherd: 2,
}

/**
 * Higher = more recently released.
 *
 * NEW_SERIES_ORDER is append-only and chronological, so its entries rank above
 * everything else in their own order. The older provenance blocks keep their
 * catalog order beneath. Shipping a series needs no change here.
 */
let recencyCache: Map<string, number> | null = null

export function seriesRecencyRank(slug: string): number {
  if (!recencyCache) {
    recencyCache = new Map()
    // Older blocks first, in catalog order.
    const older = ALL_SERIES_ORDER.filter(
      (s) => !(NEW_SERIES_ORDER as readonly string[]).includes(s),
    )
    older.forEach((s, i) => recencyCache!.set(s, i))
    // Then the chronological new block, always above.
    NEW_SERIES_ORDER.forEach((s, i) => recencyCache!.set(s, older.length + i))
  }
  return recencyCache.get(slug) ?? -1
}

/** The most recently released series in the catalog. */
export function newestSeriesSlug(): string {
  return [...ALL_SERIES_ORDER].sort(
    (a, b) => seriesRecencyRank(b) - seriesRecencyRank(a),
  )[0]
}

/**
 * Filing title — leading articles dropped, the way a library shelves things.
 *
 * This MUST be the key both the sort and the A–Z bucket use. When the sort
 * compared the full title while the bucket stripped "The", the jump rail came
 * out as "… R S N W T V": "The Nature of Belief" filed under N but sorted under
 * T, so its letter marker appeared after S.
 */
export function filingTitle(slug: string): string {
  const title = SERIES_DATA[slug]?.title ?? slug
  return title.replace(/^(the|a|an)\s+/i, '')
}

/** Sort a list of slugs. Always returns a new array; ties break A–Z for stability. */
export function sortSeries(slugs: readonly string[], key: SortKey): string[] {
  const title = filingTitle
  const days = (slug: string) => SERIES_DATA[slug]?.days.length ?? 0
  const byTitle = (a: string, b: string) =>
    title(a).localeCompare(title(b), 'en', { sensitivity: 'base' })

  const sorted = [...slugs]
  switch (key) {
    case 'az':
      return sorted.sort(byTitle)
    case 'za':
      return sorted.sort((a, b) => byTitle(b, a))
    case 'newest':
      return sorted.sort(
        (a, b) => seriesRecencyRank(b) - seriesRecencyRank(a) || byTitle(a, b),
      )
    case 'shortest':
      return sorted.sort((a, b) => days(a) - days(b) || byTitle(a, b))
    case 'longest':
      return sorted.sort((a, b) => days(b) - days(a) || byTitle(a, b))
    case 'pathway':
      return sorted.sort((a, b) => {
        const pa = SERIES_DATA[a]?.pathway
        const pb = SERIES_DATA[b]?.pathway
        const ra = pa ? PATHWAY_RANK[pa] : 99
        const rb = pb ? PATHWAY_RANK[pb] : 99
        return ra - rb || byTitle(a, b)
      })
    default:
      return sorted.sort(byTitle)
  }
}

/** "7 days" / "365 days" — one place so the unit never drifts. */
export function dayCountLabel(slug: string): string {
  const n = SERIES_DATA[slug]?.days.length ?? 0
  return n === 1 ? '1 day' : `${n} days`
}

/**
 * Alphabetical index buckets for the library view: 'A' … 'Z', '#'.
 * Lets the reader jump, and makes it obvious nothing is hidden.
 */
export function alphaBucket(slug: string): string {
  const first = filingTitle(slug).charAt(0).toUpperCase()
  return /[A-Z]/.test(first) ? first : '#'
}
