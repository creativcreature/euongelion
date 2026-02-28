'use client'

import { typographer } from '@/lib/typographer'
import type { CustomPlanDay } from '@/types/soul-audit'

type PlanDayContentProps = {
  day: CustomPlanDay
  bookmarkingDay: number | null
  savedDay: number | null
  onBookmark: (day: CustomPlanDay) => void
}

function extractModuleText(content: Record<string, unknown>): string {
  if (typeof content.text === 'string') return content.text
  if (typeof content.prompt === 'string') return content.prompt
  if (typeof content.passage === 'string') return content.passage
  if (typeof content.body === 'string') return content.body
  const parts = Object.values(content).filter(
    (v): v is string => typeof v === 'string',
  )
  return parts.join('\n\n')
}

export default function PlanDayContent({
  day,
  bookmarkingDay,
  savedDay,
  onBookmark,
}: PlanDayContentProps) {
  return (
    <article
      key={`plan-day-${day.day}`}
      style={{
        border: '1px solid var(--color-border)',
        padding: '1.5rem',
      }}
    >
      <p className="text-label vw-small mb-2 text-gold">
        DAY {day.day}
        {day.dayType === 'sabbath'
          ? ' \u00B7 SABBATH'
          : day.dayType === 'review'
            ? ' \u00B7 REVIEW'
            : ''}
      </p>
      <h2 className="vw-heading-md mb-2">{typographer(day.title)}</h2>
      <p className="vw-small mb-4 text-muted">{day.scriptureReference}</p>

      {/* Render modules if present */}
      {day.modules && day.modules.length > 0 ? (
        <div className="space-y-4">
          {day.modules.map((mod, idx) => (
            <div
              key={`mod-${day.day}-${mod.type}-${idx}`}
              id={
                mod.type === 'scripture'
                  ? `day-${day.day}-scripture`
                  : mod.type === 'reflection'
                    ? `day-${day.day}-reflection`
                    : mod.type === 'prayer'
                      ? `day-${day.day}-prayer`
                      : undefined
              }
            >
              {mod.heading && (
                <p className="text-label vw-small mb-1 text-gold">
                  {mod.heading.toUpperCase()}
                </p>
              )}
              <div className="vw-body text-secondary type-prose">
                {typographer(extractModuleText(mod.content))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <p
            id={`day-${day.day}-scripture`}
            className="scripture-block vw-body mb-4 text-secondary"
          >
            {typographer(day.scriptureText)}
          </p>
          <p
            id={`day-${day.day}-reflection`}
            className="vw-body mb-4 text-secondary type-prose"
          >
            {typographer(day.reflection)}
          </p>
          <p
            id={`day-${day.day}-prayer`}
            className="text-serif-italic vw-body mb-4 text-secondary type-prose"
          >
            {typographer(day.prayer)}
          </p>
        </>
      )}

      <div
        id={`day-${day.day}-practice`}
        className="mt-4 grid gap-4 md:grid-cols-2"
      >
        {day.nextStep && (
          <p className="vw-small text-secondary">
            <strong className="text-gold">NEXT STEP: </strong>
            {typographer(day.nextStep)}
          </p>
        )}
        {day.journalPrompt && (
          <p id={`day-${day.day}-journal`} className="vw-small text-secondary">
            <strong className="text-gold">JOURNAL: </strong>
            {typographer(day.journalPrompt)}
          </p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="text-label vw-small link-highlight"
          disabled={bookmarkingDay === day.day}
          onClick={() => onBookmark(day)}
        >
          {savedDay === day.day
            ? 'BOOKMARK SAVED'
            : bookmarkingDay === day.day
              ? 'SAVING...'
              : 'SAVE BOOKMARK'}
        </button>
        <span className="vw-small text-muted">
          Highlight any line to save a favorite verse.
        </span>
      </div>
      {(day.endnotes?.length ?? 0) > 0 && (
        <div className="mt-5 border-t pt-4">
          <p className="text-label vw-small mb-2 text-gold">ENDNOTES</p>
          {day.endnotes?.map((note) => (
            <p
              key={`${day.day}-endnote-${note.id}`}
              className="vw-small text-muted"
            >
              [{note.id}] {note.source} — {note.note}
            </p>
          ))}
        </div>
      )}
    </article>
  )
}
