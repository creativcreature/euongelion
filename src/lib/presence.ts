'use client'

import { getProgress } from '@/lib/progress'

/**
 * Presence — F-066 (SA-025, guilt-free momentum hybrid, surface B).
 *
 * "Days you showed up" as pure local, ambient data. This is deliberately NOT
 * a streak engine: no counts are surfaced visually, no gap is ever framed as
 * a miss, and nothing here is synced or scored. A day is "present" when the
 * reader completed a reading that day, from either reader:
 *
 *  1. The wake-up/catalog reader — markDevotionalComplete() writes
 *     `wakeup_progress` entries with a completedAt timestamp; those dates
 *     are folded in here so existing history lights up retroactively.
 *  2. The Daily Bread plan reader — completion is server-side (no local
 *     progress entry), so DailyBreadView calls recordPresenceToday() at its
 *     completion point and the date lands in the local presence log.
 *
 * Storage is localStorage only (ambient device-local state, same contract as
 * progress.ts / bookmarks). If storage is unavailable the week simply reads
 * as unlit — presence is a quiet observation, never a feature that can
 * "break" the reading flow.
 */

const PRESENCE_KEY = 'euangelion:presence-days'
/** Keep the log small — the UI only ever reads the current week. */
const PRESENCE_LOG_CAP = 60

export const PRESENCE_UPDATED_EVENT = 'euangelion:presence-updated'

export interface WeekPresence {
  /** Sunday → Saturday for the week containing `now`. */
  present: [boolean, boolean, boolean, boolean, boolean, boolean, boolean]
  /** 0 (Sunday) … 6 (Saturday) — which dot is "today". */
  todayIndex: number
  /** For the screen-reader summary only — never rendered as visible text. */
  presentCount: number
}

/** Local-timezone calendar key, e.g. "2026-07-10". */
export function localDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function readPresenceLog(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(PRESENCE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is string =>
        typeof entry === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry),
    )
  } catch {
    return []
  }
}

/**
 * Record that the reader completed a reading today. Idempotent per calendar
 * day. Dispatches PRESENCE_UPDATED_EVENT so mounted week rows refresh live.
 */
export function recordPresenceToday(now: Date = new Date()): void {
  if (typeof window === 'undefined') return
  const key = localDateKey(now)
  const log = readPresenceLog()
  if (!log.includes(key)) {
    const next = [...log, key].sort().slice(-PRESENCE_LOG_CAP)
    try {
      window.localStorage.setItem(PRESENCE_KEY, JSON.stringify(next))
    } catch {
      // Storage unavailable (private mode) — ambient presence simply
      // won't persist; nothing in the reading flow depends on it.
    }
  }
  window.dispatchEvent(new CustomEvent(PRESENCE_UPDATED_EVENT))
}

/**
 * Every locally-known present day: the explicit presence log merged with
 * the wake-up reader's completion history (completedAt → local date).
 */
export function getPresenceDates(): Set<string> {
  const dates = new Set<string>(readPresenceLog())
  for (const entry of getProgress()) {
    if (!entry.completedAt) continue
    const completed = new Date(entry.completedAt)
    if (!Number.isNaN(completed.getTime())) {
      dates.add(localDateKey(completed))
    }
  }
  return dates
}

/** Presence for the Sunday→Saturday week containing `now`. */
export function getWeekPresence(now: Date = new Date()): WeekPresence {
  const dates = getPresenceDates()
  const weekStart = new Date(now)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())

  const present = [false, false, false, false, false, false, false] as [
    boolean,
    boolean,
    boolean,
    boolean,
    boolean,
    boolean,
    boolean,
  ]
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + i)
    present[i] = dates.has(localDateKey(day))
  }

  return {
    present,
    todayIndex: now.getDay(),
    presentCount: present.filter(Boolean).length,
  }
}
