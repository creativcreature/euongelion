'use client'

import type { DevotionalProgress } from '@/types'

const PROGRESS_KEY = 'wakeup_progress'

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
  const allDevotionals = getAllDevotionalsInOrder()
  const currentIndex = allDevotionals.indexOf(slug)

  if (currentIndex === -1) return { canRead: false, reason: 'Not found' }
  if (currentIndex === 0) return { canRead: true }

  const previous = allDevotionals.slice(0, currentIndex)
  const unread = previous.filter((d) => !isDevotionalRead(d))

  if (unread.length > 0) {
    return {
      canRead: false,
      reason: 'Complete previous devotionals first',
      nextToRead: unread[0],
    }
  }
  return { canRead: true }
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

function getAllDevotionalsInOrder(): string[] {
  return [
    'identity',
    'peace',
    'community',
    'kingdom',
    'provision',
    'truth',
    'hope',
  ].flatMap(getSeriesDevotionals)
}
