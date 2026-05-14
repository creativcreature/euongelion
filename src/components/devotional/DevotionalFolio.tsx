'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import ChurchYearOverline from './ChurchYearOverline'

/**
 * Page furniture for the devotional reader (audit batch 2026-05-13).
 *
 * Renders the editorial-broadsheet folio strip above the devotional
 * title: "EUANGELION · VOL I · DAY 047 · 13 MAY 2026". Real small
 * caps (font-variant-caps via .smcp), not text-transform. Mirrors
 * the 2026 NYT Magazine redesign which moved publication furniture
 * to the TOP of the article.
 *
 * 2026-05-14 hydration fix: the date used to come from `new Date()`
 * inline, which renders different values on the server vs. the
 * client (different timestamps → different strings → React #418
 * hydration mismatch killed the whole reader tree). The date is now
 * computed in a useEffect so it only renders client-side after
 * mount. The HTML the server sends contains an empty placeholder
 * that the client fills in on hydration — no mismatch.
 *
 * Scale-back path: remove the <DevotionalFolio/> element from
 * DevotionalPageClient.
 */

interface DevotionalFolioProps {
  /** Series title, e.g. "Too Busy for God" */
  seriesTitle?: string
  /** 1-indexed day within the series */
  dayNumber: number
  /** Total days in the series (e.g. 5) */
  totalDays?: number
  /** Publish or render date — when omitted, computed client-side after mount */
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
  // Client-mount-only date. If a date prop is explicitly passed,
  // use it directly (caller takes responsibility for SSR stability).
  // Otherwise we set state from an effect — the canonical React 19
  // escape hatch for "render this only after mount so SSR/CSR HTML
  // match." The lint rule is correct that this pattern is suboptimal
  // in general, but disallowing it forces a hydration mismatch here.
  const [renderedDate, setRenderedDate] = useState<Date | null>(date ?? null)
  useEffect(() => {
    if (date) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: client-only date after hydration
    setRenderedDate(new Date())
  }, [date])

  const dayLabel = `Day ${String(dayNumber).padStart(2, '0')}`
  const ofLabel =
    totalDays && totalDays > 0 ? ` / ${String(totalDays).padStart(2, '0')}` : ''
  const editionLabel = seriesTitle ? `· ${seriesTitle}` : '· Vol I'

  return (
    <header
      className={`devotional-folio devotional-folio--with-overline ${className ?? ''}`}
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
        {renderedDate ? (
          <time dateTime={renderedDate.toISOString().slice(0, 10)}>
            {formatDate(renderedDate)}
          </time>
        ) : (
          // Empty placeholder during SSR / pre-mount. Same DOM shape
          // (a <time> element) so the hydration boundary is stable.
          <time aria-hidden="true">&nbsp;</time>
        )}
      </span>
      <span className="devotional-folio-overline">
        <ChurchYearOverline />
      </span>
    </header>
  )
}
