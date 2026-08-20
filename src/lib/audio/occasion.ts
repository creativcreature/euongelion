import { SERIES_DATA, ALL_SERIES_ORDER } from '@/data/series'
import { FORMAT_META } from '@/lib/audio/formats'
import {
  longFormBookRuns,
  type ScriptureBookRun,
} from '@/lib/audio/scripture-whole'
import { getNarrationTrack } from '@/lib/audio/tracks'
import type { QueueItem } from '@/stores/audioStore'

/**
 * Discovery, on listening's own terms.
 *
 * The reading side has one organising question — *what are you wrestling with?*
 * — and the whole IA descends from it: Soul Audit, pathway, series, day. Audio
 * cannot inherit that question. Nobody puts headphones on and asks what they are
 * wrestling with; they ask **how long have I got, and what am I doing?**
 *
 * So this is the listening equivalent of the Soul Audit, and it is deliberately
 * faster: two taps, no questionnaire, because someone reaching for audio usually
 * has their hands full. It resolves to a queue you press play on, not a list you
 * browse.
 */

/** Minutes a listener says they have. */
export const BUDGETS = [5, 10, 20, 60] as const
export type Budget = (typeof BUDGETS)[number]

export const ACTIVITIES = [
  'commuting',
  'working',
  'walking',
  'resting',
] as const
export type Activity = (typeof ACTIVITIES)[number]

export interface Occasion {
  minutes: Budget
  activity: Activity
}

/**
 * A stable shuffle.
 *
 * The same occasion must return the same queue for the whole day, or pressing
 * back and choosing again silently reshuffles what someone was part-way
 * through. Seeded on the day plus the occasion rather than randomised.
 */
function seededOrder<T>(items: T[], seed: number): T[] {
  const out = [...items]
  let s = seed
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296
    const j = s % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function dayNumber(now: Date): number {
  return Math.floor(now.getTime() / 86_400_000)
}

/**
 * Activity decides how much of the budget to fill and how long a single piece
 * may be — not which content is "suitable", which would be a judgement the
 * catalogue cannot support.
 */
const SHAPE: Record<Activity, { maxPieceMin: number; fill: number }> = {
  // A commute has a hard edge: overshooting means arriving mid-sentence.
  commuting: { maxPieceMin: 30, fill: 0.95 },
  // Background listening tolerates a long single piece and wants continuity.
  working: { maxPieceMin: 60, fill: 1.15 },
  walking: { maxPieceMin: 30, fill: 1.0 },
  // Resting favours shorter pieces, so stopping is easy.
  resting: { maxPieceMin: 20, fill: 0.9 },
}

/** Every delivered track, as queue items. */
export function allListenable(): QueueItem[] {
  const items: QueueItem[] = []
  for (const seriesSlug of ALL_SERIES_ORDER) {
    const series = SERIES_DATA[seriesSlug]
    if (!series) continue
    for (const day of series.days) {
      const track = getNarrationTrack(day.slug)
      if (!track) continue
      items.push({
        slug: day.slug,
        title: day.title,
        src: track.src,
        duration: track.duration,
        href: `/devotional/${day.slug}`,
        context: series.title,
      })
    }
  }
  return items
}

/**
 * Fill the budget, in priority order, dropping anything that would overshoot
 * rather than truncating it. Never repeats a series until every series has been
 * offered once, so a 60-minute session is not four days of the same arc.
 */
export function buildOccasionQueue(
  occasion: Occasion,
  now: Date = new Date(),
  pool: QueueItem[] = allListenable(),
): QueueItem[] {
  const shape = SHAPE[occasion.activity]
  const budget = occasion.minutes * 60 * shape.fill
  const maxPiece = shape.maxPieceMin * 60

  const seed =
    dayNumber(now) * 31 +
    occasion.minutes * 7 +
    ACTIVITIES.indexOf(occasion.activity)
  const ordered = seededOrder(
    pool.filter((item) => item.duration <= maxPiece),
    seed,
  )

  const chosen: QueueItem[] = []
  const usedContexts = new Set<string>()
  let total = 0

  // Two passes: one series each, then fill whatever budget is left.
  for (const pass of [0, 1]) {
    for (const item of ordered) {
      if (chosen.includes(item)) continue
      if (pass === 0 && item.context && usedContexts.has(item.context)) continue
      if (total + item.duration > budget) continue
      chosen.push(item)
      if (item.context) usedContexts.add(item.context)
      total += item.duration
    }
    if (total >= budget * 0.75) break
  }

  return chosen
}

/**
 * Long-form answers to "an hour or more".
 *
 * The picker's honest empty state — *nothing that length yet, the catalogue
 * tops out at 28 minutes* — was true of the devotional pool and never true of
 * the whole catalogue. `bible-365` runs in canonical order, so grouped by book
 * it is already long-form: 36 runs clear 40 minutes and the longest is over
 * five hours. Nothing new is recorded to make this true; it was always there,
 * addressed a day at a time.
 *
 * Returns runs, not a flattened queue, because at this length the listener is
 * choosing WHICH book — a shuffle across five hours of scripture is not a
 * thing anyone asked for. Empty for every budget but the longest, and for
 * activities the format does not suit (see `FORMAT_META['scripture-whole']`).
 */
export function longFormFor(occasion: Occasion): ScriptureBookRun[] {
  if (occasion.minutes !== 60) return []
  if (!FORMAT_META['scripture-whole'].activities.includes(occasion.activity)) {
    return []
  }
  return longFormBookRuns(FORMAT_META['scripture-whole'].minutes[0]).sort(
    (a, b) => a.duration - b.duration,
  )
}

/** "about 10 minutes" — how the choice reads back to a listener. */
export function budgetLabel(minutes: Budget): string {
  if (minutes === 5) return 'Under 5 minutes'
  if (minutes === 60) return 'An hour or more'
  return `About ${minutes} minutes`
}
