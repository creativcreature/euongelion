'use client'

import Image from 'next/image'
import { typographer } from '@/lib/typographer'
import { SERIES_DATA } from '@/data/series'
import { SERIES_HERO } from '@/data/artwork-manifest'
import type { AuditOptionPreview } from '@/types/soul-audit'

type AuditOptionCardProps = {
  option: AuditOptionPreview & {
    title: string
    question: string
    reasoning: string
    preview?: { verse?: string; verseText?: string; paragraph?: string } | null
  }
  variant: 'large' | 'small'
  disabled: boolean
  loading: boolean
  submitting: boolean
  expandedReasoning: boolean
  onSelect: (optionId: string) => void
  onSave: (option: AuditOptionPreview) => void
  onToggleReasoning: (optionId: string) => void
}

export default function AuditOptionCard({
  option,
  variant,
  disabled,
  loading,
  submitting,
  expandedReasoning,
  onSelect,
  onSave,
  onToggleReasoning,
}: AuditOptionCardProps) {
  const hero = SERIES_HERO[option.slug]
  const series = SERIES_DATA[option.slug]
  const keywords = (series?.keywords ?? []).slice(0, 3)
  const dayCount = series?.days.length ?? 0
  const isLarge = variant === 'large'

  const ctaLabel = loading
    ? isLarge
      ? 'BUILDING\u2026'
      : 'LOADING\u2026'
    : !disabled
      ? isLarge
        ? 'BUILD THIS PATH'
        : 'OPEN SERIES'
      : submitting
        ? 'PLEASE WAIT'
        : 'UNAVAILABLE'

  return (
    <article
      className={`audit-option-card ${isLarge ? 'audit-option-card-large' : 'audit-option-card-small'} group relative overflow-hidden text-left${loading ? ' animate-pulse' : ''}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(option.id)}
        className={`w-full text-left ${!disabled ? 'cursor-pointer' : 'is-disabled'}`}
        aria-disabled={disabled}
      >
        {isLarge && option.preview?.verse && (
          <div className="mock-scripture-lead audit-option-pad">
            <p className="mock-scripture-lead-reference">
              {typographer(option.preview.verse)}
            </p>
          </div>
        )}
        <h3
          className={`audit-option-title${isLarge ? ' audit-option-pad' : ''}`}
        >
          {option.title}.
        </h3>
        {isLarge && hero && (
          <div className="series-card-thumbnail" aria-hidden="true">
            <Image
              src={hero.rawSrc}
              alt=""
              width={600}
              height={450}
              className="series-card-thumbnail-img"
              loading="lazy"
              sizes="(max-width: 767px) 84vw, 33vw"
            />
          </div>
        )}
        {keywords.length > 0 && (
          <p
            className={`series-card-keywords${isLarge ? ' audit-option-pad' : ''}`}
          >
            {keywords.join(' \u2022 ')}
          </p>
        )}
        <div
          className={`mock-featured-actions${isLarge ? ' audit-option-pad' : ''}`}
        >
          <span className="mock-series-start text-label">{ctaLabel}</span>
          {dayCount > 0 && (
            <span className="mock-featured-days text-label">
              {dayCount} {dayCount === 1 ? 'DAY' : 'DAYS'}
            </span>
          )}
        </div>
      </button>
      <div className={`audit-option-meta${isLarge ? ' audit-option-pad' : ''}`}>
        <button
          type="button"
          className="audit-option-meta-link link-highlight mr-4"
          onClick={() => onSave(option)}
        >
          Save for later
        </button>
        <button
          type="button"
          className="audit-option-meta-link link-highlight"
          onClick={() => onToggleReasoning(option.id)}
        >
          {expandedReasoning ? 'Hide reasoning' : 'Why this path?'}
        </button>
        {expandedReasoning && (
          <p className="audit-option-support mt-2 text-secondary">
            {typographer(option.reasoning)}
          </p>
        )}
      </div>
      <span className="audit-option-underline" />
    </article>
  )
}
