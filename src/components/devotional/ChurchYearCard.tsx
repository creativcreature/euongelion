'use client'

import { useEffect, useState } from 'react'
import { liturgicalDay, type LiturgicalDay } from '@/lib/liturgical'

/**
 * "Today in the church year" card. Compact summary of the season +
 * (when applicable) the feast / saint observed today.
 *
 * Placement: top of /daily-bread, above the active reader. Quiet,
 * editorial; no decoration besides a hairline rule.
 *
 * Pure-content, no infra. Recomputes on mount only — accurate to
 * the local day. (Liturgical season changes are slow enough that
 * the user does not need a live update during a session.)
 */

const COLOR_HEX: Record<LiturgicalDay['color'], string> = {
  purple: '#5b3a8e',
  white: '#efe5d8',
  green: '#3a6b4a',
  red: '#a8252a',
  rose: '#c4192e',
  gold: '#c8a56a',
  black: '#171b69',
}

export default function ChurchYearCard({ className }: { className?: string }) {
  const [day, setDay] = useState<LiturgicalDay | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only date to avoid React #418
    setDay(liturgicalDay(new Date()))
  }, [])

  if (!day) {
    return (
      <aside
        className={`church-year-card ${className ?? ''}`}
        aria-label="Today in the church year"
      >
        <p className="church-year-card-kicker">&nbsp;</p>
      </aside>
    )
  }

  const swatch = COLOR_HEX[day.color]
  return (
    <aside
      className={`church-year-card ${className ?? ''}`}
      aria-label="Today in the church year"
    >
      <p className="church-year-card-kicker">
        <span
          className="church-year-swatch"
          aria-hidden="true"
          style={{ background: swatch }}
        />
        Today in the church year
      </p>
      <p className="church-year-card-day">{day.dayLabel}</p>
      {day.feast && <p className="church-year-card-feast">{day.feast}</p>}
      <p className="church-year-card-season">
        <span>{day.seasonLabel}</span>
        <span className="church-year-card-color-name">{day.color}</span>
      </p>
    </aside>
  )
}
