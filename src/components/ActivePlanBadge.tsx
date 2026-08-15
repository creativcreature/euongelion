'use client'

import Link from 'next/link'
import { useActivePlan } from '@/hooks/useActivePlan'

interface ActivePlanBadgeProps {
  /**
   * Visual variant.
   * - "header": compact, designed for the topbar actions row.
   * - "tile": larger, full-width, designed for surface page (e.g. /series).
   */
  variant?: 'header' | 'tile' | 'resume'
  /** Optional className applied to the root element. */
  className?: string
}

/**
 * ActivePlanBadge
 *
 * Renders a "Day N · [series title]" CTA when the user has an active plan.
 * Hides entirely when no active plan or while loading. Click resumes the
 * plan at its current day.
 */
export default function ActivePlanBadge({
  variant = 'header',
  className,
}: ActivePlanBadgeProps) {
  const { active, loading } = useActivePlan()

  if (loading || !active) return null

  const dayLabel =
    typeof active.dayNumber === 'number' ? `DAY ${active.dayNumber}` : 'RESUME'
  const titleLabel = active.seriesTitle?.trim() || 'YOUR PLAN'

  /**
   * Founder 2026-08-15: "the inprogress needs to be made much less prominent.
   * the series I see as more important and the continue as secondary to that
   * (still above fold)."
   *
   * So on /series it is one quiet line, not a bordered tile with a gold label
   * and a heading. It stays above the fold and above the search, but it is
   * plainly subordinate to the shelves — which are what the page is for.
   */
  if (variant === 'resume') {
    return (
      <Link
        href={active.route}
        className={`rr-resume ${className ?? ''}`}
        aria-label={`Resume ${titleLabel} at ${dayLabel}`}
        data-testid="active-plan-resume"
      >
        <span className="rr-resume-label">Continue</span>
        <span className="rr-resume-title">{titleLabel}</span>
        {typeof active.dayNumber === 'number' && (
          <span className="rr-resume-day">Day {active.dayNumber}</span>
        )}
        <span aria-hidden="true">&rarr;</span>
      </Link>
    )
  }

  if (variant === 'tile') {
    return (
      <Link
        href={active.route}
        className={`mock-active-plan-tile ${className ?? ''}`}
        aria-label={`Resume ${titleLabel} at ${dayLabel}`}
        data-testid="active-plan-tile"
        style={{
          display: 'block',
          padding: '1.25rem 1.5rem',
          border: '1px solid var(--color-border)',
          textDecoration: 'none',
        }}
      >
        <p
          className="text-label vw-small text-gold"
          style={{ marginBottom: 4 }}
        >
          {dayLabel} · IN PROGRESS
        </p>
        <p className="vw-heading-sm" style={{ margin: 0 }}>
          {titleLabel}
        </p>
        <p className="vw-small text-muted" style={{ marginTop: 6 }}>
          Continue reading
        </p>
      </Link>
    )
  }

  return (
    <Link
      href={active.route}
      className={`mock-active-plan-badge text-label ${className ?? ''}`}
      aria-label={`Resume ${titleLabel} at ${dayLabel}`}
      data-testid="active-plan-badge"
    >
      <span className="text-gold">{dayLabel}</span>
      <span className="text-muted" aria-hidden="true">
        ·
      </span>
      <span className="mock-active-plan-badge-title">{titleLabel}</span>
    </Link>
  )
}
