'use client'

import { useEffect, useState } from 'react'
import { liturgicalDay, type LiturgicalDay } from '@/lib/liturgical'

/**
 * Small overline strip showing the current liturgical day —
 * "Sixth Sunday of Easter · Easter Season" or, when a fixed feast
 * applies, "Today: Conversion of Paul · Epiphany Season".
 *
 * Renders inside the DevotionalFolio strip so it sits at the top of
 * the reader, in the same publication-furniture register.
 *
 * Hydration-safe: computes the liturgical day in useEffect after
 * mount (same pattern as DevotionalFolio's date). SSR renders a
 * non-breaking-space placeholder.
 */

export default function ChurchYearOverline({
  className,
}: {
  className?: string
}) {
  const [day, setDay] = useState<LiturgicalDay | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only initial date to avoid React #418
    setDay(liturgicalDay(new Date()))
  }, [])

  return (
    <span className={`church-year-overline ${className ?? ''}`}>
      {day ? (
        <>
          {day.feast ? `Today: ${day.feast}` : day.dayLabel}
          {' · '}
          <span className="church-year-season">{day.seasonLabel}</span>
        </>
      ) : (
        <span aria-hidden="true">&nbsp;</span>
      )}
    </span>
  )
}
