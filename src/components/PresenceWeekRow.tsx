'use client'

import { useSyncExternalStore } from 'react'
import {
  PRESENCE_UPDATED_EVENT,
  getWeekPresence,
  type WeekPresence,
} from '@/lib/presence'

/**
 * PresenceWeekRow — F-066 (SA-025), surface B: the gentle presence
 * indicator. Anchors: Open's dotted S-M-T-W-T-F-S week row; Bears
 * Gratitude's presence-without-counting.
 *
 * Contract (founder-locked):
 *  - Days you showed up are quietly lit. Lit/unlit only — NO visible
 *    numbers, NO "streak", NO "missed", NO red. A gap is just an unlit
 *    dot; it carries zero negative framing.
 *  - The current day is marked so the row reads as "this week", not as
 *    a score.
 *  - The only count anywhere is the screen-reader summary in aria-label
 *    ("Present 3 of 7 days this week.") — accessibility, not gamification.
 *  - Purely local data (src/lib/presence.ts); no fetch, no sync. The
 *    server snapshot is null so SSR output is untouched; the row appears
 *    on hydration.
 *
 * Shared by the Today returning band and the Settings profile header.
 */

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

// Module-level snapshot cache: useSyncExternalStore requires a stable
// snapshot between invalidations, and presence only changes when a
// completion event says so (PRESENCE_UPDATED_EVENT / progressUpdated).
let cachedWeek: WeekPresence | null = null
let cacheValid = false
let subscriberCount = 0

function subscribe(onStoreChange: () => void): () => void {
  // Completions can happen while no row is mounted (the reader pages carry
  // no presence row) — the first subscriber after such a gap must not trust
  // the cache. React re-reads the snapshot right after subscribing, so this
  // refresh lands before anything stale is shown.
  if (subscriberCount === 0) {
    cacheValid = false
  }
  subscriberCount++

  const invalidate = () => {
    cacheValid = false
    onStoreChange()
  }
  window.addEventListener(PRESENCE_UPDATED_EVENT, invalidate)
  // The wake-up reader's completions land in wakeup_progress and announce
  // themselves via progressUpdated — fold those in live too.
  window.addEventListener('progressUpdated', invalidate)
  return () => {
    subscriberCount--
    window.removeEventListener(PRESENCE_UPDATED_EVENT, invalidate)
    window.removeEventListener('progressUpdated', invalidate)
  }
}

function getSnapshot(): WeekPresence | null {
  if (!cacheValid) {
    cachedWeek = getWeekPresence()
    cacheValid = true
  }
  return cachedWeek
}

function getServerSnapshot(): WeekPresence | null {
  return null
}

export default function PresenceWeekRow({
  className = '',
}: {
  className?: string
}) {
  const week = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  if (!week) return null

  return (
    <div
      className={`presence-week-row${className ? ` ${className}` : ''}`}
      data-testid="presence-week-row"
      role="img"
      aria-label={`Present ${week.presentCount} of 7 days this week.`}
    >
      <span className="presence-week-label text-label" aria-hidden="true">
        THIS WEEK
      </span>
      <span className="presence-week-days" aria-hidden="true">
        {DAY_LETTERS.map((letter, index) => {
          const lit = week.present[index]
          const isToday = index === week.todayIndex
          return (
            <span
              key={`presence-day-${index}`}
              className={`presence-week-day${isToday ? ' presence-week-day-today' : ''}`}
              data-lit={lit ? 'true' : 'false'}
              data-today={isToday ? 'true' : 'false'}
            >
              <span className="presence-week-letter text-label">{letter}</span>
              <span
                className={`presence-week-dot${lit ? ' presence-week-dot-lit' : ''}`}
              />
            </span>
          )
        })}
      </span>
    </div>
  )
}
