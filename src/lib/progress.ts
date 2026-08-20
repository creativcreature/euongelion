'use client'

import type { DevotionalProgress } from '@/types'
import { SERIES_DATA } from '@/data/series'
import {
  advanceActiveDayAfterCompletion,
  rewindActiveDayAfterUnmark,
} from '@/lib/reading/active-day'
import { unionCompletions } from '@/lib/reading/completion-merge'
import {
  READING_PROGRESS_MERGED,
  pushReadingCompletion,
  removeReadingCompletion,
} from '@/lib/reading/reading-progress-sync'

const PROGRESS_KEY = 'wakeup_progress'
const SERIES_START_KEY = 'series_start_dates'

export function getProgress(): DevotionalProgress[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(PROGRESS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function isDevotionalRead(slug: string): boolean {
  return getProgress().some((p) => p.slug === slug)
}

/**
 * Fold completions recorded on the reader's account into this device.
 *
 * Union, not replace — see `lib/reading/completion-merge.ts` for why
 * completion is the one piece of reading state where merging is correct.
 *
 * Announces `READING_PROGRESS_MERGED` rather than `progressUpdated`: the
 * latter means "you just finished something" and CompletionBeat answers it
 * with a benediction, which would be wrong for a devotional the reader
 * finished last Tuesday on another device.
 */
export function mergeLocalCompletions(
  rows: readonly DevotionalProgress[],
): DevotionalProgress[] {
  if (typeof window === 'undefined') return []
  const merged = unionCompletions(getProgress(), rows)
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(merged))
  } catch {
    // Storage full or blocked (private mode). The account still holds the
    // truth and the merge repeats on the next load; nothing is lost.
  }
  window.dispatchEvent(
    new CustomEvent(READING_PROGRESS_MERGED, {
      detail: { count: merged.length },
    }),
  )
  return merged
}

/**
 * Replace this device's completions with the account's, wholesale.
 *
 * The one place union is WRONG: a DIFFERENT account signed in on this device
 * (see `reconcileReadingProgress`). Union would fold the previous reader's
 * history into the new reader's view, which is the cross-account leak the
 * owner stamp exists to stop — so the server state wins outright.
 */
export function replaceLocalCompletions(
  rows: readonly DevotionalProgress[],
): DevotionalProgress[] {
  if (typeof window === 'undefined') return []
  const next = rows.map((row) => ({ ...row }))
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(next))
  } catch {
    // Storage full or blocked (private mode). The owner stamp persists through
    // the same storage, so a blocked write here blocks the re-stamp with it
    // and the next load runs the replacement again; nothing is claimed early.
  }
  window.dispatchEvent(
    new CustomEvent(READING_PROGRESS_MERGED, {
      detail: { count: next.length },
    }),
  )
  return next
}

export function markDevotionalComplete(slug: string, timeSpent?: number): void {
  if (typeof window === 'undefined') return
  const completedAt = new Date().toISOString()
  try {
    const progress = getProgress()
    if (progress.some((p) => p.slug === slug)) return

    const updated = [...progress, { slug, completedAt, timeSpent }]
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(updated))
    window.dispatchEvent(
      new CustomEvent('progressUpdated', { detail: { slug } }),
    )
  } catch {
    // silently fail
  }

  // Local progress is device-only; `active_series.current_day` is what every
  // "continue reading" surface reads. Advancing it here — the one choke point
  // every MARK READ path already goes through — is what makes finishing a day
  // move the reader forward instead of parking them on day 1 forever.
  //
  // Deliberately outside the try/catch above: a localStorage failure must not
  // cancel the server write, and the advance reports its own failures rather
  // than being swallowed by this function's `catch {}`.
  void advanceActiveDayAfterCompletion(slug)

  // The same choke point, for the same reason: this is where a completion
  // becomes real, so this is where it has to leave the device. Without it the
  // reader's history is one cleared cache away from gone, and a second device
  // starts them at zero — the largest thing signing in did not buy them.
  //
  // Fire-and-forget: nobody should wait on a round trip to see a reading
  // marked done. It no-ops for a signed-out reader and for the moments before
  // auth is known, and the reconcile on the next load catches whatever it
  // skipped.
  void pushReadingCompletion({ slug, completedAt, timeSpent })
}

export function getSeriesProgress(seriesSlug: string) {
  const progress = getProgress()
  const devotionals = getSeriesDevotionals(seriesSlug)
  const completed = devotionals.filter((slug) =>
    progress.some((p) => p.slug === slug),
  ).length

  return {
    completed,
    total: devotionals.length,
    percentage:
      devotionals.length > 0
        ? Math.round((completed / devotionals.length) * 100)
        : 0,
  }
}

export function getOverallProgress() {
  const progress = getProgress()
  const total = 35
  return {
    completed: progress.length,
    total,
    percentage: Math.round((progress.length / total) * 100),
  }
}

export function canReadDevotional(_slug: string) {
  // Day-gating disabled — all content freely accessible
  return { canRead: true }
}

// Day-gating: track when user starts a series
function getSeriesStartDates(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(SERIES_START_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

export function startSeries(seriesSlug: string): void {
  if (typeof window === 'undefined') return
  const dates = getSeriesStartDates()
  if (!dates[seriesSlug]) {
    dates[seriesSlug] = new Date().toISOString()
    localStorage.setItem(SERIES_START_KEY, JSON.stringify(dates))
  }
}

function getSeriesDevotionals(seriesSlug: string): string[] {
  const series = SERIES_DATA[seriesSlug]
  if (!series) return []
  return series.days.map((d) => d.slug)
}

/**
 * Undo a completion.
 *
 * Founder, 2026-08-19: _"i accidentally marked one and now cant go back"_.
 * Marking a day read wrote to three places — localStorage, the server row, and
 * `active_series.current_day` — and none of them had an inverse. An action a
 * person can take by accident, on a surface built for one-handed use at 6am,
 * needs a way back or the product is telling them their mistake is permanent.
 *
 * All three are reversed, in the order that keeps the reader's own device
 * honest first: local state (so the UI corrects immediately), then the day they
 * are standing on, then the account row. Removing only locally would be worse
 * than doing nothing — the next reconcile would pull the completion back and
 * the undo would silently un-undo itself.
 */
export function unmarkDevotionalComplete(slug: string): void {
  if (typeof window === 'undefined') return
  try {
    const progress = getProgress()
    const next = progress.filter((p) => p.slug !== slug)
    // Nothing to undo. Say so by doing nothing rather than firing events that
    // make surfaces re-render for no reason.
    if (next.length === progress.length) return

    localStorage.setItem(PROGRESS_KEY, JSON.stringify(next))
    window.dispatchEvent(
      new CustomEvent('progressUpdated', { detail: { slug } }),
    )
  } catch {
    // Storage unavailable — the server calls below are still worth making.
  }

  // Outside the try for the same reason the completion path is: a localStorage
  // failure must not cancel the writes that make this survive a reload.
  void rewindActiveDayAfterUnmark(slug)
  void removeReadingCompletion(slug)
}
