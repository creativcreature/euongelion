'use client'

import Image from 'next/image'
import Link from 'next/link'
import { SERIES_DATA } from '@/data/series'
import { SERIES_HERO } from '@/data/artwork-manifest'
import { scriptureLeadPartsFromFramework } from '@/lib/scripture-reference'
import { typographer } from '@/lib/typographer'

export type CardVariant = 'large' | 'medium' | 'small'

interface BrowseSeriesCardProps {
  slug: string
  progress?: {
    completed: boolean
    inProgress: boolean
    currentDay?: number
    total?: number
  }
  variant?: CardVariant
}

export default function BrowseSeriesCard({
  slug,
  progress,
  variant = 'medium',
}: BrowseSeriesCardProps) {
  const series = SERIES_DATA[slug]
  if (!series) return null

  const hero = variant !== 'small' ? SERIES_HERO[slug] : undefined
  const dayCount = series.days.length
  const scripture = scriptureLeadPartsFromFramework(series.framework)
  const keywords = (series.keywords ?? []).slice(0, 3)

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

  const thumbnail = hero && (
    <div className="series-card-thumbnail" aria-hidden="true">
      <Image
        src={hero.src}
        alt=""
        width={600}
        height={450}
        className="series-card-thumbnail-img"
        loading="lazy"
        sizes="(max-width: 767px) 84vw, 33vw"
      />
    </div>
  )

  const scriptureBlock = (
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
  )

  const keywordPills = keywords.length > 0 && (
    <p className="series-card-keywords">{keywords.join(' \u2022 ')}</p>
  )

  return (
    <Link
      href={`/series/${slug}`}
      className="mock-featured-card"
      data-variant={variant}
      aria-label={`${series.title}: ${series.question}`}
    >
      {/* Large: Ref → Title → Image → Keywords → Action */}
      {variant === 'large' && (
        <>
          {scriptureBlock}
          <h3>{series.title}.</h3>
          {thumbnail}
          {keywordPills}
          <div className="mock-featured-actions">
            <span className="mock-series-start text-label">{actionLabel}</span>
            <span className="mock-featured-days text-label">
              {dayCount} {dayCount === 1 ? 'DAY' : 'DAYS'}
            </span>
          </div>
        </>
      )}

      {/* Medium: Image → Ref → Title → Keywords → Action */}
      {variant === 'medium' && (
        <>
          {thumbnail}
          {scriptureBlock}
          <h3>{series.title}.</h3>
          {keywordPills}
          <div className="mock-featured-actions">
            <span className="mock-series-start text-label">{actionLabel}</span>
            <span className="mock-featured-days text-label">
              {dayCount} {dayCount === 1 ? 'DAY' : 'DAYS'}
            </span>
          </div>
        </>
      )}

      {/* Small: Title → Keywords → Action (no image) */}
      {variant === 'small' && (
        <>
          <h3>{series.title}.</h3>
          {keywordPills}
          <div className="mock-featured-actions">
            <span className="mock-series-start text-label">{actionLabel}</span>
            <span className="mock-featured-days text-label">
              {dayCount} {dayCount === 1 ? 'DAY' : 'DAYS'}
            </span>
          </div>
        </>
      )}

      {/* Progress bar */}
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
