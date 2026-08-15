'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useProgressStore } from '@/stores/progressStore'
import { SERIES_DATA } from '@/data/series'
import { nextUnreadDay } from '@/lib/reading/active-day'

/**
 * Audit H7 (HOMEPAGE-AUDIT-2026-05-11): surfaces "Continue day N of this
 * series" anywhere a user lands on a series-related surface. Reads
 * useProgressStore for completions in this series and points to the next
 * day. Renders nothing when the user hasn't started or has fully
 * finished the series.
 */
export default function ResumeSeriesPill({
  seriesSlug,
  variant = 'inline',
}: {
  seriesSlug: string
  variant?: 'inline' | 'compact'
}) {
  const completions = useProgressStore((s) => s.completions)
  const series = SERIES_DATA[seriesSlug]
  const dayRoutePrefix = '/devotional'

  const next = useMemo(() => {
    if (!series) return null
    const completedSlugs = new Set(completions.map((c) => c.slug))
    // Nothing started yet — "continue" would be a lie.
    if (!series.days.some((d) => completedSlugs.has(d.slug))) return null
    // nextUnreadDay returns the first INCOMPLETE day, not last-completed + 1.
    // Those differ the moment someone reads out of order, and the old form
    // skipped straight past unread days. Returns null when the series is done.
    return nextUnreadDay(seriesSlug, completedSlugs)
  }, [series, seriesSlug, completions])

  if (!next || !series) return null

  return (
    <Link
      href={`${dayRoutePrefix}/${next.slug}`}
      className={`resume-series-pill resume-series-pill--${variant}`}
      aria-label={`Continue ${series.title}: day ${next.day}`}
    >
      <span className="text-label vw-small text-gold">
        CONTINUE · DAY {next.day} OF {series.days.length}
      </span>
      <span className="vw-small text-secondary">{series.title} →</span>
    </Link>
  )
}
