'use client'

import Image from 'next/image'
import Link from 'next/link'
import { SERIES_DATA } from '@/data/series'
import { SERIES_HERO } from '@/data/artwork-manifest'
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

  const hero = SERIES_HERO[slug]
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
      className={`mock-featured-card${hero ? ' series-card-hero' : ''}`}
      aria-label={`${series.title}: ${series.question}`}
    >
      {/* Full-bleed hero image layer */}
      {hero && (
        <div className="series-card-hero-image" aria-hidden="true">
          <Image
            src={hero.darkSrc}
            alt=""
            fill
            sizes="(max-width: 767px) 84vw, 33vw"
            className="series-card-img series-card-img-dark"
            loading="lazy"
          />
          <Image
            src={hero.lightSrc}
            alt=""
            fill
            sizes="(max-width: 767px) 84vw, 33vw"
            className="series-card-img series-card-img-light"
            loading="lazy"
          />
          <div className="series-card-scrim" />
        </div>
      )}

      {/* Card content — above the image */}
      <div className={hero ? 'series-card-content' : undefined}>
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
