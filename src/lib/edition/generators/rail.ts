/**
 * The Daily Bread — The Rail (SA-090 / F-136).
 *
 * "Also in this edition": three other readings from the catalog, chosen
 * deterministically by day so two readers on the same morning get the same
 * front page. This is the pipeline port of the `alsoToday` block that lived
 * inline in `src/app/daily-bread/page.tsx` — same catalog, same modulo, same
 * three slugs — moved behind the edition store so the rail stops being
 * recomputed at render time.
 *
 * It is not a recommendation engine and does not pretend to be one.
 */
import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'
import { getSeriesHero } from '@/lib/series-hero'
import type { EditionItem, RailPayload } from '../kinds'

/** How many briefs the rail runs. Slots 0..RAIL_SIZE-1. */
const RAIL_SIZE = 3

/**
 * The catalog the rail draws from. `bible-365` is excluded: it is the
 * year-long plan, not a series a reader picks up alongside today's reading.
 */
function railSlugs(): string[] {
  const slugs = ALL_SERIES_ORDER.filter(
    (s) => SERIES_DATA[s] && s !== 'bible-365',
  )
  if (slugs.length < RAIL_SIZE) {
    throw new Error(
      `rail needs at least ${RAIL_SIZE} series, catalog has ${slugs.length}`,
    )
  }
  return [...slugs]
}

/** Day of the year, 1-based, in UTC. */
function dayOfYear(date: Date): number {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1)
  const today = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  )
  return Math.floor((today - startOfYear) / 86_400_000) + 1
}

/**
 * The standfirst under a brief. The series question is the reader-facing
 * line; where a series has none, the framework's reference segment
 * ("Matthew 6:33 - Seek first…" → "Matthew 6:33") is the honest fallback.
 * A series with neither is a data defect and throws rather than shipping a
 * brief with an empty line under it.
 */
function kickerFor(slug: string): string {
  const series = SERIES_DATA[slug]
  const question = series.question?.trim()
  if (question) return question
  const frameworkHead = series.framework?.split(' - ')[0]?.trim()
  if (frameworkHead) return frameworkHead
  throw new Error(
    `series "${slug}" has neither a question nor a framework for the rail kicker`,
  )
}

/**
 * The three briefs for one UTC date. Slots 0/1/2, approved — there is nothing
 * to review in a catalog lookup.
 */
export async function generateRail(date: Date): Promise<EditionItem<'rail'>[]> {
  const slugs = railSlugs()
  const doy = dayOfYear(date)
  const publishDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
    .toISOString()
    .slice(0, 10)

  return Array.from({ length: RAIL_SIZE }, (_, slot) => {
    const slug = slugs[(doy * RAIL_SIZE + slot) % slugs.length]
    const series = SERIES_DATA[slug]
    const image = getSeriesHero(slug)?.src
    if (!image) {
      throw new Error(
        `series "${slug}" has no hero image — the rail cannot run a brief without one`,
      )
    }

    const payload: RailPayload = {
      slug,
      title: series.title,
      image,
      kicker: kickerFor(slug),
    }

    return {
      kind: 'rail' as const,
      publishDate,
      slot,
      status: 'approved' as const,
      payload,
    }
  })
}
