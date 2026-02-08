'use client'

import type { DevotionalProgress } from '@/types'

const PROGRESS_KEY = 'wakeup_progress'
const SERIES_START_KEY = 'series_start_dates'
const UNLOCK_HOUR = 7 // 7 AM local time

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

export function markDevotionalComplete(slug: string, timeSpent?: number): void {
  if (typeof window === 'undefined') return
  try {
    const progress = getProgress()
    if (progress.some((p) => p.slug === slug)) return

    const updated = [
      ...progress,
      { slug, completedAt: new Date().toISOString(), timeSpent },
    ]
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(updated))
    window.dispatchEvent(
      new CustomEvent('progressUpdated', { detail: { slug } }),
    )
  } catch {
    // silently fail
  }
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

export function canReadDevotional(slug: string) {
  // Find which series this devotional belongs to
  const seriesSlug = findSeriesForDevotional(slug)
  if (!seriesSlug) return { canRead: false, reason: 'Not found' }

  const devotionals = getSeriesDevotionals(seriesSlug)
  const dayIndex = devotionals.indexOf(slug)
  if (dayIndex === -1) return { canRead: false, reason: 'Not found' }

  // Day 1 is always available
  if (dayIndex === 0) return { canRead: true }

  // Check sequential completion: previous day must be complete
  const previousSlug = devotionals[dayIndex - 1]
  if (!isDevotionalRead(previousSlug)) {
    return {
      canRead: false,
      reason: 'Complete previous devotionals first',
      nextToRead: previousSlug,
    }
  }

  // Check day-gating: has enough time passed since series start?
  const dayGateResult = isDayUnlocked(seriesSlug, dayIndex)
  if (!dayGateResult.unlocked) {
    return {
      canRead: false,
      reason: dayGateResult.message,
    }
  }

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

function isDayUnlocked(
  seriesSlug: string,
  dayIndex: number,
): { unlocked: boolean; message: string } {
  const dates = getSeriesStartDates()
  const startDateStr = dates[seriesSlug]

  // If series hasn't been started, day 1 is always available (handled above)
  // For day 2+, if no start date, they can't proceed
  if (!startDateStr) {
    return {
      unlocked: false,
      message:
        "This day isn't ready yet. Good things take time. Including you. Come back tomorrow.",
    }
  }

  const startDate = new Date(startDateStr)
  const now = new Date()

  // Calculate how many days have passed since start, based on 7 AM unlock
  const startDay = new Date(startDate)
  startDay.setHours(UNLOCK_HOUR, 0, 0, 0)
  if (startDate.getHours() >= UNLOCK_HOUR) {
    // Started after 7 AM, so day 1 = today, day 2 = tomorrow 7 AM
  } else {
    // Started before 7 AM, treat as previous day
    startDay.setDate(startDay.getDate() - 1)
  }

  const nowDay = new Date(now)
  nowDay.setHours(UNLOCK_HOUR, 0, 0, 0)

  const daysSinceStart = Math.floor(
    (nowDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (dayIndex <= daysSinceStart) {
    return { unlocked: true, message: '' }
  }

  return {
    unlocked: false,
    message:
      "This day isn't ready yet. Good things take time. Including you. Come back tomorrow.",
  }
}

function findSeriesForDevotional(slug: string): string | null {
  const seriesSlugs = [
    'identity',
    'peace',
    'community',
    'kingdom',
    'provision',
    'truth',
    'hope',
  ]
  for (const s of seriesSlugs) {
    if (getSeriesDevotionals(s).includes(slug)) return s
  }
  return null
}

function getSeriesDevotionals(seriesSlug: string): string[] {
  const map: Record<string, string[]> = {
    identity: Array.from(
      { length: 5 },
      (_, i) => `identity-crisis-day-${i + 1}`,
    ),
    peace: Array.from({ length: 5 }, (_, i) => `peace-day-${i + 1}`),
    community: Array.from({ length: 5 }, (_, i) => `community-day-${i + 1}`),
    kingdom: Array.from({ length: 5 }, (_, i) => `kingdom-day-${i + 1}`),
    provision: Array.from({ length: 5 }, (_, i) => `provision-day-${i + 1}`),
    truth: Array.from({ length: 5 }, (_, i) => `truth-day-${i + 1}`),
    hope: Array.from({ length: 5 }, (_, i) => `hope-day-${i + 1}`),
  }
  return map[seriesSlug] || []
}
