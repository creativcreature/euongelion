import { type CSSProperties } from 'react'

/**
 * Page furniture for the devotional reader (audit batch 2026-05-13).
 *
 * Renders the editorial-broadsheet folio strip above the devotional
 * title: "EUANGELION · VOL I · DAY 047 · 13 MAY 2026". Real small
 * caps (font-variant-caps via .smcp), not text-transform. Mirrors
 * the 2026 NYT Magazine redesign which moved publication furniture
 * to the TOP of the article (audit §03 winners' playbook).
 *
 * Scale-back path: remove the <DevotionalFolio/> element from
 * DevotionalPageClient — purely additive component, no other side
 * effects.
 */

interface DevotionalFolioProps {
  /** Series title, e.g. "Too Busy for God" */
  seriesTitle?: string
  /** 1-indexed day within the series */
  dayNumber: number
  /** Total days in the series (e.g. 5) */
  totalDays?: number
  /** Publish or render date — defaults to today */
  date?: Date
  className?: string
  style?: CSSProperties
}

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
]

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export default function DevotionalFolio({
  seriesTitle,
  dayNumber,
  totalDays,
  date,
  className,
  style,
}: DevotionalFolioProps) {
  const today = date ?? new Date()
  const dayLabel = `Day ${String(dayNumber).padStart(2, '0')}`
  const ofLabel =
    totalDays && totalDays > 0 ? ` / ${String(totalDays).padStart(2, '0')}` : ''
  const editionLabel = seriesTitle ? `· ${seriesTitle}` : '· Vol I'

  return (
    <header
      className={`devotional-folio ${className ?? ''}`}
      style={style}
      aria-label="Devotional edition"
    >
      <span className="devotional-folio-left">
        Euangelion{' '}
        <span className="devotional-folio-edition">{editionLabel}</span>
      </span>
      <span className="devotional-folio-center">
        {dayLabel}
        {ofLabel}
      </span>
      <span className="devotional-folio-right">
        <time dateTime={today.toISOString().slice(0, 10)}>
          {formatDate(today)}
        </time>
      </span>
    </header>
  )
}
