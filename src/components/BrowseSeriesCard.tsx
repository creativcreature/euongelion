'use client'

import Link from 'next/link'
import { SERIES_DATA } from '@/data/series'
import { scriptureLeadPartsFromFramework } from '@/lib/scripture-reference'
import { typographer } from '@/lib/typographer'

interface BrowseSeriesCardProps {
  slug: string
  progress?: {
    completed: boolean
    inProgress: boolean
    currentDay?: number
    total?: number
  }
}

function formatSeriesPreview(introduction: string): string {
  const combined = typographer(introduction).replace(/\s+/g, ' ').trim()
  const words = combined.split(' ').filter(Boolean)
  if (words.length <= 30) return combined
  return `${words.slice(0, 28).join(' ')}...`
}

export default function BrowseSeriesCard({
  slug,
  progress,
}: BrowseSeriesCardProps) {
  const series = SERIES_DATA[slug]
  if (!series) return null

  const dayCount = series.days.length
  const scripture = scriptureLeadPartsFromFramework(series.framework)

  // Progress bar: percentage of days completed
  const total = progress?.total ?? dayCount
  const completedDays = progress?.currentDay
    ? progress.currentDay - 1
    : progress?.completed
      ? total
      : 0
  const progressPercent =
    total > 0 && completedDays > 0
      ? Math.round((completedDays / total) * 100)
      : 0

  const actionLabel = progress?.completed
    ? 'COMPLETED'
    : progress?.inProgress
      ? 'CONTINUE'
      : 'START SERIES'

  return (
    <Link
      href={`/series/${slug}`}
      className="mock-featured-card"
      aria-label={`${series.title}: ${series.question}`}
    >
      <div className="mock-scripture-lead">
        <p className="mock-scripture-lead-reference">
          {typographer(scripture.reference || 'Scripture')}
        </p>
        {scripture.snippet && (
          <p className="mock-scripture-lead-snippet">
            {typographer(scripture.snippet)}
          </p>
        )}
      </div>
      <h3>{series.title}.</h3>
      <p>{series.question}</p>
      <p className="mock-featured-preview">
        {formatSeriesPreview(series.introduction)}
      </p>
      <div className="mock-featured-actions">
        <span className="mock-series-start text-label">{actionLabel}</span>
        <span className="mock-featured-days text-label">
          {dayCount} {dayCount === 1 ? 'DAY' : 'DAYS'}
        </span>
      </div>

      {/* Apple TV-style progress bar */}
      {progressPercent > 0 && (
        <div
          className="series-progress-bar"
          style={{ '--progress': `${progressPercent}%` } as React.CSSProperties}
          aria-label={`${completedDays} of ${total} days completed`}
        />
      )}
    </Link>
  )
}
