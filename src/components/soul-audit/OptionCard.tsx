'use client'

import Image from 'next/image'
import { typographer } from '@/lib/typographer'
import { SERIES_DATA } from '@/data/series'
import { SERIES_HERO } from '@/data/artwork-manifest'
import { clampScriptureSnippet } from '@/lib/scripture-reference'
import type { AuditOptionPreview } from '@/types/soul-audit'

interface OptionCardProps {
  option: AuditOptionPreview & {
    title: string
    question: string
    reasoning: string
    preview?: { verse: string; verseText?: string; paragraph: string } | null
  }
  isSelecting: boolean
  disabled: boolean
  expandedReasoning: boolean
  onSelect: (optionId: string) => void
  onSave: (option: AuditOptionPreview) => void
  onToggleReasoning: (optionId: string) => void
}

export default function OptionCard({
  option,
  isSelecting,
  disabled,
  expandedReasoning,
  onSelect,
  onSave,
  onToggleReasoning,
}: OptionCardProps) {
  const hero = SERIES_HERO[option.slug]
  const series = SERIES_DATA[option.slug]
  const keywords = (series?.keywords ?? []).slice(0, 3)
  const dayCount = series?.days.length ?? 0
  const scriptureReference = option.preview?.verse?.trim() || 'Scripture'
  const scriptureSnippet = clampScriptureSnippet(
    option.preview?.verseText?.trim() || '',
    220,
  )

  return (
    <article className={`group relative${isSelecting ? ' animate-pulse' : ''}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(option.id)}
        className={`mock-featured-card w-full text-left ${disabled ? 'is-disabled' : 'cursor-pointer'}`}
        data-variant="large"
        aria-disabled={disabled}
      >
        <h3>{option.title}</h3>
        <p className="audit-option-question">{typographer(option.question)}</p>
        {keywords.length > 0 && (
          <p className="series-card-keywords">{keywords.join(' \u2022 ')}</p>
        )}
        {hero && (
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
        <div className="mock-scripture-lead">
          <p className="mock-scripture-lead-reference">
            {typographer(scriptureReference)}
          </p>
          {scriptureSnippet && (
            <p className="mock-scripture-lead-snippet">
              {typographer(scriptureSnippet)}
            </p>
          )}
          {!scriptureSnippet && option.preview?.paragraph && (
            <p className="mock-scripture-lead-snippet">
              {typographer(option.preview.paragraph)}
            </p>
          )}
        </div>
        <div className="mock-featured-actions">
          <span className="mock-series-start text-label">
            {isSelecting
              ? 'BUILDING\u2026'
              : disabled
                ? 'PLEASE WAIT'
                : 'BUILD THIS PATH'}
          </span>
          {dayCount > 0 && (
            <span className="mock-featured-days text-label">
              {dayCount} {dayCount === 1 ? 'DAY' : 'DAYS'}
            </span>
          )}
        </div>
      </button>
      <div
        className="audit-option-meta px-5 py-3"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
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
    </article>
  )
}
