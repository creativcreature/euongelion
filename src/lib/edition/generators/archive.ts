/**
 * The Daily Bread — From the Archive (SA-092).
 *
 * An older devotional resurfaced: one reading a day out of everything the
 * catalog has already shipped. Pure catalog lookup — slug from the shipped
 * files, title from the series data, teaser from the teaser bank, image from
 * the series hero — resolved exactly the way the rail resolves its briefs.
 * Nothing here is written by us and nothing is recommended; it is rotation.
 *
 * THE POOL is `public/devotionals/*.json` minus the `bible-365-*` plan files
 * (the plan has its own section, 'b365'), sorted by filename so the walk is
 * stable. Every slug in the pool MUST resolve to a series day — a devotional
 * file no series claims is a catalog defect and THROWS (Development Rule 1).
 *
 * THE LEAD RULE: the archive pick must never be the same devotional the
 * front page is already leading with. On a collision the pick skips forward —
 * by 31, not by 1, and the number is load-bearing: a skip of 1 lands on
 * exactly the index tomorrow's rotation will use, which would print the same
 * archive entry two mornings running. 31 lands outside every index the
 * surrounding ±30 days can reach (the pool floor of 62 guarantees it), so
 * the no-repeat-within-30-days property survives the collision rule. The
 * tests prove both properties together.
 */
import { readdirSync } from 'node:fs'
import path from 'node:path'
import {
  DEVOTIONAL_TEASERS,
  DEVOTIONAL_TITLES,
} from '@/data/devotional-teasers'
import { getSeriesHero } from '@/lib/series-hero'
import { findSeriesForSlug, pickTodaySlug } from '@/lib/today-devotional'
import type { ArchivePayload, EditionItem } from '../kinds'

/** Floor that makes the collision-skip proof work: 31 and n-31 must both
 * exceed 30, so n >= 62. The real pool is ~210. */
export const ARCHIVE_POOL_FLOOR = 62

/** The collision skip. See the file comment before changing it. */
export const LEAD_COLLISION_SKIP = 31

let cachedPool: string[] | null = null

/** FNV-1a, 32-bit — the same stable hash the puzzle page uses. Orders the
 * pool so consecutive days cross series: alphabetical order would resurface
 * day 1, day 2, day 3 of one series on consecutive mornings, which is a
 * rerun schedule, not an archive. */
function fnv1a(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Every shipped devotional slug outside the Bible-365 plan, ordered by
 * slug hash (see fnv1a above). */
export function archivePool(
  devotionalsDir: string = path.join(process.cwd(), 'public', 'devotionals'),
): string[] {
  if (cachedPool) return cachedPool

  // The '#archive' suffix keeps the slug's differing character away from the
  // end of the hash stream: FNV's final multiply preserves the order of
  // strings that differ only in their last character, which walked
  // rekindled-day-6 … day-1 on consecutive mornings before the salt.
  const slugs = readdirSync(devotionalsDir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('bible-365-'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort(
      (a, b) =>
        fnv1a(`${a}#archive`) - fnv1a(`${b}#archive`) || a.localeCompare(b),
    )

  if (slugs.length < ARCHIVE_POOL_FLOOR) {
    throw new Error(
      `archive: pool has ${slugs.length} devotionals — the floor is ` +
        `${ARCHIVE_POOL_FLOOR} (required by the lead-collision skip proof). ` +
        'The catalog shrank; fix the cause, do not lower the floor.',
    )
  }

  for (const slug of slugs) {
    if (!findSeriesForSlug(slug)) {
      throw new Error(
        `archive: devotional file "${slug}.json" resolves to no series day — ` +
          'a shipped devotional every series disowns is a catalog defect.',
      )
    }
  }

  cachedPool = slugs
  return cachedPool
}

/** Days since 1970-01-01 UTC. The rotation index. */
function daysSinceEpoch(date: Date): number {
  const ms = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  )
  if (Number.isNaN(ms)) throw new Error('archive: invalid Date')
  if (ms < 0) {
    throw new Error(
      'archive: the rotation is only defined from 1970-01-01 forward',
    )
  }
  return Math.floor(ms / 86_400_000)
}

/** Which slug the archive runs on this date. Exported for the tests. */
export function archiveSlugForDate(date: Date): string {
  const pool = archivePool()
  const i = daysSinceEpoch(date) % pool.length
  const lead = pickTodaySlug(date)
  if (pool[i] === lead) {
    return pool[(i + LEAD_COLLISION_SKIP) % pool.length]
  }
  return pool[i]
}

/**
 * The teaser under the resurfaced reading: the devotional's own teaser where
 * the bank has one, else the series question, else the framework's reference
 * head — the same fallback ladder the rail's kicker walks. A day with none
 * of the three is a data defect and throws.
 */
function teaserFor(slug: string, seriesSlug: string): string {
  const banked = DEVOTIONAL_TEASERS[slug]?.trim()
  if (banked) return banked
  const meta = findSeriesForSlug(slug)
  const question = meta?.series.question?.trim()
  if (question) return question
  const frameworkHead = meta?.series.framework?.split(' - ')[0]?.trim()
  if (frameworkHead) return frameworkHead
  throw new Error(
    `archive: "${slug}" (series "${seriesSlug}") has no teaser, no series ` +
      'question and no framework — nothing honest to print under it.',
  )
}

/** One resurfaced devotional for the UTC date. Slot 0, published — catalog
 * lookup over shipped content; there is nothing to review. */
export async function generateArchive(
  date: Date,
): Promise<EditionItem<'archive'>[]> {
  const slug = archiveSlugForDate(date)
  const meta = findSeriesForSlug(slug)
  if (!meta) {
    // archivePool() validated every slug; reaching this means the catalog
    // changed between pool build and pick. Still a defect, still loud.
    throw new Error(`archive: "${slug}" no longer resolves to a series day`)
  }

  const image = getSeriesHero(meta.seriesSlug)?.src
  if (!image) {
    throw new Error(
      `archive: series "${meta.seriesSlug}" has no hero image — the archive ` +
        'cannot resurface a reading without one',
    )
  }

  // The devotional's REAL title from the title bank — 135 of the 210 series
  // day entries carry a bare "Day N", which is a position, not a headline.
  // The bank covers the whole pool today; the day entry remains the
  // structural fallback for a future slug the bank lags behind on.
  const title = DEVOTIONAL_TITLES[slug]?.trim() || meta.day.title

  const payload: ArchivePayload = {
    slug,
    title,
    teaser: teaserFor(slug, meta.seriesSlug),
    seriesSlug: meta.seriesSlug,
    image,
  }

  return [
    {
      kind: 'archive',
      publishDate: date.toISOString().slice(0, 10),
      slot: 0,
      status: 'published',
      payload,
    },
  ]
}
