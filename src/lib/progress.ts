'use client'

import type { DevotionalProgress } from '@/types'
import { SERIES_DATA } from '@/data/series'

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
