'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useProgressStore } from '@/stores/progressStore'
import { SERIES_DATA } from '@/data/series'

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
    const completedDays = series.days.filter((d) => completedSlugs.has(d.slug))
    if (completedDays.length === 0) return null
    if (completedDays.length >= series.days.length) return null
    const lastDoneDayNum = Math.max(...completedDays.map((d) => d.day))
    const nextDay = series.days.find((d) => d.day === lastDoneDayNum + 1)
    if (!nextDay) return null
    return nextDay
  }, [series, completions])

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
