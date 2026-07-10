'use client'

import { typographer } from '@/lib/typographer'
import { TOTAL_PLAN_DAYS } from '@/lib/soul-audit/constants'
import type { AuditOptionPreview } from '@/types/soul-audit'

interface OptionCardProps {
  option: AuditOptionPreview & {
    title: string
    question: string
    reasoning: string
    /**
     * Keywords the audit matched between the user's reflection and this
     * direction (from the submit payload's option evidence). Real matches
     * only — never fabricated client-side.
     */
    matchedKeywords?: string[]
    preview?: { verse: string; verseText?: string; paragraph: string } | null
  }
  isSelecting: boolean
  disabled: boolean
  expandedReasoning: boolean
  onSelect: (optionId: string) => void
  onSave: (option: AuditOptionPreview) => void
  onToggleReasoning: (optionId: string) => void
}

/**
 * Text-first result card for an AI-composed reading path.
 *
 * These options are composed per-audit (option.slug is a slugified AI title,
 * NOT a series slug), so there is no curated series record — and therefore no
 * series hero image — to resolve. The card leads with the words instead:
 * title, question, matched keywords, and the weekly Scripture focus. The day
 * count is the real plan length (TOTAL_PLAN_DAYS drives the schedule that
 * /api/soul-audit/select builds).
 */
export default function OptionCard({
  option,
  isSelecting,
  disabled,
  expandedReasoning,
  onSelect,
  onSave,
  onToggleReasoning,
}: OptionCardProps) {
  const keywords = (option.matchedKeywords ?? [])
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 3)
  const scriptureReference = option.preview?.verse?.trim() || 'Scripture'
  const scriptureSnippet = option.preview?.verseText?.trim() || ''

  return (
    <article className={`group relative${isSelecting ? ' animate-pulse' : ''}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(option.id)}
        className={`mock-featured-card audit-option-card w-full text-left ${disabled ? 'is-disabled' : 'cursor-pointer'}`}
        data-variant="large"
        aria-disabled={disabled}
        aria-label={`Build this reading path: ${option.title}`}
      >
        <h3>{option.title}</h3>
        <p className="audit-option-question">{typographer(option.question)}</p>
        {keywords.length > 0 && (
          <span className="audit-option-keywords">
            {keywords.map((keyword) => (
              <span key={keyword} className="audit-option-keyword">
                {keyword}
              </span>
            ))}
          </span>
        )}
        <div className="mock-scripture-lead">
          <p className="audit-option-support text-secondary">
            WEEKLY SCRIPTURE FOCUS
          </p>
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
              ? 'BUILDING…'
              : disabled
                ? 'PLEASE WAIT'
                : 'BUILD THIS PATH'}
          </span>
          <span className="mock-featured-days text-label">
            {TOTAL_PLAN_DAYS} DAYS
          </span>
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
          aria-label={`Save "${option.title}" for later`}
        >
          Save for later
        </button>
        <button
          type="button"
          className="audit-option-meta-link link-highlight"
          onClick={() => onToggleReasoning(option.id)}
          aria-expanded={expandedReasoning}
          aria-controls={`option-reasoning-${option.id}`}
        >
          {expandedReasoning ? 'Hide reasoning' : 'Why this path?'}
        </button>
        {expandedReasoning && (
          <p
            id={`option-reasoning-${option.id}`}
            className="audit-option-support mt-2 text-secondary"
          >
            {typographer(option.reasoning)}
          </p>
        )}
      </div>
    </article>
  )
}
