'use client'

import Link from 'next/link'
import ReaderTimeline, {
  type ReaderSectionAnchor,
} from '@/components/ReaderTimeline'
import { typographer } from '@/lib/typographer'

type RailDay = {
  day: number
  title: string
  scriptureReference?: string
  locked: boolean
}

type ArchivePlan = {
  planToken: string
  createdAt: string
  route: string
}

type PlanDayRailProps = {
  railDays: RailDay[]
  selectedDayNumber: number | null
  daySectionAnchors: ReaderSectionAnchor[]
  archivePlans: ArchivePlan[]
  onSwitchDay: (dayNumber: number) => void
}

function formatShortDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

export default function PlanDayRail({
  railDays,
  selectedDayNumber,
  daySectionAnchors,
  archivePlans,
  onSwitchDay,
}: PlanDayRailProps) {
  return (
    <aside className="mb-6 md:mb-0">
      <div
        className="shell-sticky-panel border-subtle bg-surface-raised p-4 md:h-fit"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <p className="text-label vw-small mb-3 text-gold">
          DEVOTIONAL TIMELINE
        </p>
        <div className="grid gap-2">
          {railDays.map((day) => {
            const isSelected = day.day === selectedDayNumber
            return (
              <button
                key={`rail-day-${day.day}`}
                type="button"
                className="border px-3 py-2 text-left"
                style={{
                  borderColor: isSelected
                    ? 'var(--color-border-strong)'
                    : 'var(--color-border)',
                  background: isSelected
                    ? 'var(--color-active)'
                    : 'transparent',
                  opacity: day.locked ? 0.72 : 1,
                }}
                onClick={() => onSwitchDay(day.day)}
              >
                <p className="text-label vw-small text-gold">
                  DAY {day.day}
                  {day.locked ? ' \u00B7 LOCKED' : ''}
                </p>
                <p className="vw-small text-secondary">
                  {typographer(day.title)}
                </p>
                {day.scriptureReference && (
                  <p className="vw-small text-muted">
                    {day.scriptureReference}
                  </p>
                )}
              </button>
            )
          })}
        </div>

        {daySectionAnchors.length > 0 && (
          <div
            className="mt-5 border-t pt-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p className="text-label vw-small mb-3 text-gold">
              SECTION TIMELINE
            </p>
            <ReaderTimeline anchors={daySectionAnchors} />
          </div>
        )}

        <div
          className="mt-5 border-t pt-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-label vw-small mb-3 text-gold">ARCHIVE</p>
          {archivePlans.length === 0 ? (
            <p className="vw-small text-muted">
              No previous AI devotional plans yet.
            </p>
          ) : (
            <div className="grid gap-2">
              {archivePlans.slice(0, 6).map((plan) => (
                <Link
                  key={`archive-${plan.planToken}`}
                  href={plan.route}
                  className="block border px-3 py-2 text-secondary"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <p className="text-label vw-small text-gold">PLAN</p>
                  <p className="vw-small">{formatShortDate(plan.createdAt)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
