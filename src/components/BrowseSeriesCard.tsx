'use client'

import Link from 'next/link'
import SeriesHero from '@/components/SeriesHero'
import { SERIES_DATA } from '@/data/series'

type CardVariant = 'spotlight' | 'featured' | 'standard'

interface BrowseSeriesCardProps {
  slug: string
  variant?: CardVariant
  progress?: { completed: boolean; inProgress: boolean; currentDay?: number }
}

export default function BrowseSeriesCard({
  slug,
  variant = 'standard',
  progress,
}: BrowseSeriesCardProps) {
  const series = SERIES_DATA[slug]
  if (!series) return null

  const dayCount = series.days.length
  const introSnippet =
    series.introduction.split(' ').slice(0, 30).join(' ') +
    (series.introduction.split(' ').length > 30 ? '…' : '')

  return (
    <Link
      href={`/series/${slug}`}
      className={`browse-card browse-card--${variant} newspaper-card group`}
      aria-label={`${series.title}: ${series.question}`}
    >
      <div className="browse-card-hero">
        <SeriesHero
          seriesSlug={slug}
          size={variant === 'spotlight' ? 'hero' : 'card'}
          overlay
        />
      </div>

      <div className="browse-card-overlay">
        {/* Progress indicator */}
        {progress?.inProgress && !progress?.completed && (
          <span className="browse-card-progress" aria-label="In progress">
            <span className="browse-card-progress-dot" />
          </span>
        )}
        {progress?.completed && (
          <span className="browse-card-progress" aria-label="Completed">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7l3 3 5-5" />
            </svg>
          </span>
        )}

        <h3 className="browse-card-title">{series.title}</h3>
        <p className="browse-card-question">{series.question}</p>

        {variant === 'spotlight' && (
          <p className="browse-card-intro">{introSnippet}</p>
        )}

        <span className="browse-card-meta">
          <span className="oldstyle-nums">{dayCount}</span>{' '}
          {dayCount === 1 ? 'day' : 'days'}
        </span>
      </div>
    </Link>
  )
}
