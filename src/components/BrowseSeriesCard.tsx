'use client'

import Image from 'next/image'
import Link from 'next/link'
import { SERIES_DATA } from '@/data/series'
import { SERIES_HERO } from '@/data/artwork-manifest'
import {
  scriptureLeadPartsFromFramework,
  clampScriptureSnippet,
} from '@/lib/scripture-reference'
import { typographer } from '@/lib/typographer'

/** Max snippet length for card scripture preview (~2 visual lines) */
const CARD_SNIPPET_MAX = 220

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
  /** Optional badge label (e.g. "SUGGESTED") shown above card title */
  badge?: string
}

export default function BrowseSeriesCard({
  slug,
  progress,
  variant = 'medium',
  badge,
}: BrowseSeriesCardProps) {
  const series = SERIES_DATA[slug]
  if (!series) return null

  const hero = variant !== 'small' ? SERIES_HERO[slug] : undefined
  const dayCount = series.days.length
  const scripture = scriptureLeadPartsFromFramework(series.framework, {
    maxSnippetLength: CARD_SNIPPET_MAX,
  })
  // Build a 2-line preview: scripture snippet + series question (with ellipsis)
  const scripturePreviewText = (() => {
    const parts: string[] = []
    if (scripture.snippet) parts.push(scripture.snippet)
    if (series.question) parts.push(series.question)
    const joined = parts.join(' ')
    return joined ? clampScriptureSnippet(joined, CARD_SNIPPET_MAX) : ''
  })()
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
      {scripturePreviewText && (
        <p className="mock-scripture-lead-snippet">
          {typographer(scripturePreviewText)}
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
      {/* Large: Badge → Title → Keywords → Image → Scripture → Action */}
      {variant === 'large' && (
        <>
          {badge && (
            <span className="series-card-badge text-label">{badge}</span>
          )}
          <h3>{series.title}.</h3>
          {keywordPills}
          {thumbnail}
          {scriptureBlock}
          <div className="mock-featured-actions">
            <span className="mock-series-start text-label">{actionLabel}</span>
            <span className="mock-featured-days text-label">
              {dayCount} {dayCount === 1 ? 'DAY' : 'DAYS'}
            </span>
          </div>
        </>
      )}

      {/* Medium: Badge → Title → Keywords → Image → Scripture → Action */}
      {variant === 'medium' && (
        <>
          {badge && (
            <span className="series-card-badge text-label">{badge}</span>
          )}
          <h3>{series.title}.</h3>
          {keywordPills}
          {thumbnail}
          {scriptureBlock}
          <div className="mock-featured-actions">
            <span className="mock-series-start text-label">{actionLabel}</span>
            <span className="mock-featured-days text-label">
              {dayCount} {dayCount === 1 ? 'DAY' : 'DAYS'}
            </span>
          </div>
        </>
      )}

      {/* Small: Badge → Title → Keywords → Action (no image) */}
      {variant === 'small' && (
        <>
          {badge && (
            <span className="series-card-badge text-label">{badge}</span>
          )}
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
