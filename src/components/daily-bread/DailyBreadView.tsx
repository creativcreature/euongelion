'use client'

import { useState, useCallback, useMemo } from 'react'
import { marked } from 'marked'
import { isUnlocked } from '@/lib/soul-audit/plan-utils'
import type {
  PlanWithDays,
  DayScheduleEntry,
  DayContent,
  PlanDayRecord,
} from '@/types/soul-audit-plan'

// ─── Types ──────────────────────────────────────────────────────────

type Tier = 'daily-bread' | 'go-deeper' | 'deep-dive'

interface DailyBreadViewProps {
  plan: PlanWithDays
  currentDay: number
  schedule: DayScheduleEntry[]
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatUnlockTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string
}

function getDayRecord(
  plan: PlanWithDays,
  dayNumber: number,
): PlanDayRecord | undefined {
  return plan.devotional_plan_days.find((d) => d.day_number === dayNumber)
}

// ─── Sub-Components ─────────────────────────────────────────────────

function DaySelector({
  schedule,
  selectedDay,
  plan,
  onSelect,
}: {
  schedule: DayScheduleEntry[]
  selectedDay: number
  plan: PlanWithDays
  onSelect: (day: number) => void
}) {
  return (
    <nav className="mb-8 flex flex-wrap gap-2" aria-label="Day navigation">
      {schedule.map((entry) => {
        const unlocked = isUnlocked(entry)
        const record = getDayRecord(plan, entry.day)
        const completed = !!record?.completed_at
        const isSabbath = entry.status === 'sabbath'
        const isActive = entry.day === selectedDay

        let stateLabel = ''
        if (isSabbath) stateLabel = 'REST'
        else if (completed) stateLabel = 'DONE'
        else if (!unlocked) stateLabel = 'LOCKED'

        return (
          <button
            key={`day-nav-${entry.day}`}
            type="button"
            disabled={!unlocked}
            onClick={() => onSelect(entry.day)}
            className="relative min-w-[3rem] border px-3 py-2 text-center transition-colors"
            style={{
              borderColor: isActive
                ? 'var(--color-gold)'
                : 'var(--color-border)',
              background: isActive ? 'var(--color-active)' : 'transparent',
              opacity: unlocked ? 1 : 0.5,
              cursor: unlocked ? 'pointer' : 'not-allowed',
            }}
            aria-current={isActive ? 'step' : undefined}
            aria-disabled={!unlocked}
          >
            <span className="text-label block text-xs">{entry.day}</span>
            {stateLabel && (
              <span
                className="block text-[0.6rem] uppercase"
                style={{
                  color: completed ? 'var(--color-gold)' : 'var(--color-muted)',
                }}
              >
                {stateLabel}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

function TierSelector({
  activeTier,
  onSelect,
}: {
  activeTier: Tier
  onSelect: (tier: Tier) => void
}) {
  const tiers: { id: Tier; label: string; time: string }[] = [
    { id: 'daily-bread', label: 'Daily Bread', time: '5 min' },
    { id: 'go-deeper', label: 'Go Deeper', time: '15 min' },
    { id: 'deep-dive', label: 'Deep Dive', time: '45+ min' },
  ]

  return (
    <div className="mb-8 flex flex-wrap gap-2">
      {tiers.map((tier) => {
        const isActive = tier.id === activeTier
        return (
          <button
            key={tier.id}
            type="button"
            onClick={() => onSelect(tier.id)}
            className="border px-4 py-2 transition-colors"
            style={{
              borderColor: isActive
                ? 'var(--color-gold)'
                : 'var(--color-border)',
              background: isActive ? 'var(--color-active)' : 'transparent',
            }}
          >
            <span
              className="text-label block text-xs"
              style={{
                color: isActive ? 'var(--color-gold)' : 'var(--color-primary)',
              }}
            >
              {tier.label.toUpperCase()}
            </span>
            <span className="block text-[0.6rem] text-muted">{tier.time}</span>
          </button>
        )
      })}
    </div>
  )
}

function LockedDayView({ entry }: { entry: DayScheduleEntry }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-label vw-small mb-3 text-gold">DAY {entry.day}</p>
      <p className="vw-body mb-4 text-secondary">
        This day is not yet available.
      </p>
      {entry.unlock_at && (
        <p className="vw-small text-muted">
          Unlocks {formatDate(entry.unlock_at)} at{' '}
          {formatUnlockTime(entry.unlock_at)}
        </p>
      )}
    </div>
  )
}

function SabbathView() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-label vw-small mb-3 text-gold">DAY 7 -- SABBATH</p>
      <p className="vw-heading-md mb-4">Rest</p>
      <p className="vw-body text-secondary">
        Today is a day of rest. No reading, no striving. Sit with what you have
        received this week. Let silence do its work.
      </p>
      <p
        className="vw-body mt-6 text-secondary"
        style={{ fontStyle: 'italic' }}
      >
        Be still, and know that I am God.
      </p>
      <p className="vw-small mt-2 text-muted">Psalm 46:10</p>
    </div>
  )
}

function DailyBreadTier({ content }: { content: DayContent }) {
  return (
    <div className="space-y-6">
      {/* Scripture */}
      <section>
        <p className="text-label vw-small mb-2 text-gold">SCRIPTURE</p>
        <p className="vw-small mb-1 text-muted">{content.scriptureReference}</p>
        <div
          className="vw-body text-secondary type-prose"
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(content.scriptureText),
          }}
        />
      </section>

      {/* Hook */}
      <section>
        <div
          className="vw-body text-secondary type-prose"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content.hookA) }}
        />
      </section>

      {/* Reflection */}
      {content.reflectionQuestions.length > 0 && (
        <section>
          <p className="text-label vw-small mb-2 text-gold">REFLECT</p>
          <ul className="list-none space-y-2">
            {content.reflectionQuestions.map((q, i) => (
              <li key={`reflect-${i}`} className="vw-body text-secondary">
                {q}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Prayer */}
      <section>
        <p className="text-label vw-small mb-2 text-gold">PRAYER</p>
        <div
          className="vw-body text-secondary type-prose"
          style={{ fontStyle: 'italic' }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content.prayer) }}
        />
      </section>

      {/* Interactive element */}
      {content.interactiveElement?.content && (
        <section
          className="border-t pt-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-label vw-small mb-2 text-gold">
            {content.interactiveElement.type.replace(/_/g, ' ').toUpperCase()}
          </p>
          <div
            className="vw-body text-secondary type-prose"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(content.interactiveElement.content),
            }}
          />
        </section>
      )}
    </div>
  )
}

function GoDeeper({ content }: { content: DayContent }) {
  return (
    <div className="space-y-6">
      {/* Scripture */}
      <section>
        <p className="text-label vw-small mb-2 text-gold">SCRIPTURE</p>
        <p className="vw-small mb-1 text-muted">{content.scriptureReference}</p>
        <div
          className="vw-body text-secondary type-prose"
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(content.scriptureText),
          }}
        />
      </section>

      {/* Full chiastic structure: A - B - C - B' - A' */}
      <section>
        <p className="text-label vw-small mb-2 text-gold">OPENING</p>
        <div
          className="vw-body text-secondary type-prose"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content.hookA) }}
        />
      </section>

      <section>
        <p className="text-label vw-small mb-2 text-gold">TEACHING</p>
        <div
          className="vw-body text-secondary type-prose"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content.textB) }}
        />
      </section>

      <section>
        <p className="text-label vw-small mb-2 text-gold">CENTER</p>
        <div
          className="vw-body text-secondary type-prose"
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(content.centerC),
          }}
        />
      </section>

      <section>
        <p className="text-label vw-small mb-2 text-gold">CHRIST CONNECTION</p>
        <div
          className="vw-body text-secondary type-prose"
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(content.christConnectionBPrime),
          }}
        />
      </section>

      <section>
        <p className="text-label vw-small mb-2 text-gold">RETURN</p>
        <div
          className="vw-body text-secondary type-prose"
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(content.returnAPrime),
          }}
        />
      </section>

      {/* Hebrew/Greek study */}
      {content.hebrewGreekStudy && (
        <section
          className="border-t pt-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-label vw-small mb-2 text-gold">
            WORD STUDY ({content.hebrewGreekStudy.language.toUpperCase()})
          </p>
          <p className="vw-body text-secondary">
            <strong>{content.hebrewGreekStudy.word}</strong>{' '}
            <span className="text-muted">
              ({content.hebrewGreekStudy.transliteration})
            </span>
          </p>
          <p className="vw-small mt-1 text-secondary">
            {content.hebrewGreekStudy.meaning}
          </p>
          <p className="vw-small mt-1 text-muted">
            {content.hebrewGreekStudy.etymology}
          </p>
        </section>
      )}

      {/* Reflection */}
      {content.reflectionQuestions.length > 0 && (
        <section>
          <p className="text-label vw-small mb-2 text-gold">REFLECT</p>
          <ul className="list-none space-y-2">
            {content.reflectionQuestions.map((q, i) => (
              <li key={`reflect-${i}`} className="vw-body text-secondary">
                {q}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Prayer */}
      <section>
        <p className="text-label vw-small mb-2 text-gold">PRAYER</p>
        <div
          className="vw-body text-secondary type-prose"
          style={{ fontStyle: 'italic' }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content.prayer) }}
        />
      </section>

      {/* Interactive element */}
      {content.interactiveElement?.content && (
        <section
          className="border-t pt-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-label vw-small mb-2 text-gold">
            {content.interactiveElement.type.replace(/_/g, ' ').toUpperCase()}
          </p>
          <div
            className="vw-body text-secondary type-prose"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(content.interactiveElement.content),
            }}
          />
        </section>
      )}

      {/* Meta story */}
      {content.metaStoryPlacement && (
        <p className="vw-small text-muted">
          Biblical narrative arc: {content.metaStoryPlacement}
        </p>
      )}
    </div>
  )
}

function DeepDive({ content }: { content: DayContent }) {
  const tier3 = content.tier3Extended

  return (
    <div className="space-y-6">
      {/* Full Go Deeper content first */}
      <GoDeeper content={content} />

      {/* Extended tier-3 content */}
      {tier3 && (
        <>
          {/* Extended etymology */}
          {tier3.extendedEtymology && (
            <section
              className="border-t pt-4"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <p className="text-label vw-small mb-2 text-gold">
                EXTENDED ETYMOLOGY
              </p>
              <div
                className="vw-body text-secondary type-prose"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(tier3.extendedEtymology),
                }}
              />
            </section>
          )}

          {/* Cross references */}
          {tier3.crossReferences.length > 0 && (
            <section>
              <p className="text-label vw-small mb-2 text-gold">
                CROSS REFERENCES
              </p>
              <ul className="list-none space-y-2">
                {tier3.crossReferences.map((ref, i) => (
                  <li key={`xref-${i}`} className="vw-body text-secondary">
                    <strong className="text-gold">{ref.reference}</strong>
                    <span className="ml-2">{ref.connection}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Character profile */}
          {tier3.characterProfile && (
            <section
              className="border-t pt-4"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <p className="text-label vw-small mb-2 text-gold">
                CHARACTER STUDY
              </p>
              <p className="vw-body text-secondary">
                <strong>{tier3.characterProfile.name}</strong>
                {tier3.characterProfile.title &&
                  ` -- ${tier3.characterProfile.title}`}
              </p>
              <div
                className="vw-body mt-2 text-secondary type-prose"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(tier3.characterProfile.description),
                }}
              />
              {tier3.characterProfile.lessonForUs && (
                <p className="vw-small mt-2 text-muted">
                  Lesson: {tier3.characterProfile.lessonForUs}
                </p>
              )}
            </section>
          )}

          {/* Journaling prompts */}
          {tier3.journalingPrompts.length > 0 && (
            <section>
              <p className="text-label vw-small mb-2 text-gold">
                JOURNALING PROMPTS
              </p>
              <ul className="list-none space-y-2">
                {tier3.journalingPrompts.map((prompt, i) => (
                  <li key={`journal-${i}`} className="vw-body text-secondary">
                    {prompt}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Comprehension questions */}
          {tier3.comprehensionQuestions.length > 0 && (
            <section>
              <p className="text-label vw-small mb-2 text-gold">
                COMPREHENSION
              </p>
              <ol className="list-decimal space-y-2 pl-5">
                {tier3.comprehensionQuestions.map((q, i) => (
                  <li key={`comp-${i}`} className="vw-body text-secondary">
                    {q}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Further resources */}
          {tier3.furtherResources.length > 0 && (
            <section
              className="border-t pt-4"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <p className="text-label vw-small mb-2 text-gold">
                FURTHER READING
              </p>
              <ul className="list-none space-y-3">
                {tier3.furtherResources.map((res, i) => (
                  <li key={`resource-${i}`}>
                    <p className="vw-body text-secondary">
                      <strong>{res.title}</strong> by {res.author}
                    </p>
                    <p className="vw-small text-muted">
                      {res.type.toUpperCase()} -- {res.note}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* Endnotes */}
      {content.endnotes.length > 0 && (
        <section
          className="border-t pt-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-label vw-small mb-2 text-gold">ENDNOTES</p>
          {content.endnotes.map((note) => (
            <p key={`endnote-${note.id}`} className="vw-small text-muted">
              [{note.id}] {note.source} -- {note.note}
            </p>
          ))}
        </section>
      )}

      {/* Backward/forward links */}
      <div className="flex flex-wrap gap-4">
        {content.backwardLink && (
          <p className="vw-small text-muted">
            Previously: {content.backwardLink}
          </p>
        )}
        {content.forwardLink && (
          <p className="vw-small text-muted">
            Coming next: {content.forwardLink}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────

export default function DailyBreadView({
  plan,
  currentDay,
  schedule,
}: DailyBreadViewProps) {
  const [selectedDay, setSelectedDay] = useState(currentDay)
  const [activeTier, setActiveTier] = useState<Tier>('daily-bread')
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)
  // Track days completed in this session so the reader can advance without a
  // full page reload (server state remains authoritative on next load).
  const [localCompleted, setLocalCompleted] = useState<Set<number>>(new Set())

  const selectedEntry = useMemo(
    () => schedule.find((e) => e.day === selectedDay),
    [schedule, selectedDay],
  )

  const dayRecord = useMemo(
    () => getDayRecord(plan, selectedDay),
    [plan, selectedDay],
  )

  // Adjacent unlocked, non-sabbath days for real in-reader navigation
  // (replaces the previous non-clickable "Previously / Coming next" text).
  const { prevDay, nextDay } = useMemo(() => {
    const days = schedule
      .filter((e) => e.status !== 'sabbath' && isUnlocked(e))
      .map((e) => e.day)
      .sort((a, b) => a - b)
    const idx = days.indexOf(selectedDay)
    return {
      prevDay: idx > 0 ? days[idx - 1] : null,
      nextDay: idx >= 0 && idx < days.length - 1 ? days[idx + 1] : null,
    }
  }, [schedule, selectedDay])

  const isCurrentDayUnlocked = selectedEntry ? isUnlocked(selectedEntry) : false
  const isSabbath = selectedEntry?.status === 'sabbath'
  const isCompleted =
    !!dayRecord?.completed_at || localCompleted.has(selectedDay)
  const content: DayContent | null = dayRecord?.content ?? null

  const goToDay = useCallback((day: number) => {
    setSelectedDay(day)
    setCompleteError(null)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  const handleComplete = useCallback(async () => {
    if (completing || isCompleted || !dayRecord) return
    setCompleting(true)
    setCompleteError(null)

    try {
      const res = await fetch('/api/soul-audit/complete-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.plan_token,
          dayNumber: selectedDay,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Server returned ${res.status}`)
      }

      // Mark complete in-session and advance to the next unlocked day if one
      // is available — no full page reload (which previously lost scroll +
      // motion state). Server state is reconciled on the next natural load.
      setLocalCompleted((prev) => new Set(prev).add(selectedDay))
      if (nextDay !== null) {
        goToDay(nextDay)
      }
    } catch (err) {
      setCompleteError(
        err instanceof Error ? err.message : 'Failed to mark day complete.',
      )
    } finally {
      setCompleting(false)
    }
  }, [
    completing,
    isCompleted,
    dayRecord,
    plan.plan_token,
    selectedDay,
    nextDay,
    goToDay,
  ])

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      {/* Plan header */}
      <header className="mb-6">
        {plan.theme && (
          <p className="text-label vw-small mb-1 text-gold">
            {plan.theme.toUpperCase()}
          </p>
        )}
        {plan.scripture_anchor && (
          <p className="vw-small text-muted">{plan.scripture_anchor}</p>
        )}
      </header>

      {/* Day selector */}
      <DaySelector
        schedule={schedule}
        selectedDay={selectedDay}
        plan={plan}
        onSelect={setSelectedDay}
      />

      {/* Locked state */}
      {!isCurrentDayUnlocked && selectedEntry && (
        <LockedDayView entry={selectedEntry} />
      )}

      {/* Sabbath state */}
      {isCurrentDayUnlocked && isSabbath && <SabbathView />}

      {/* Content state */}
      {isCurrentDayUnlocked && !isSabbath && content && (
        <>
          {/* Day title */}
          <header className="mb-6">
            <p className="text-label vw-small mb-1 text-gold">
              DAY {selectedDay}
              {isCompleted ? ' -- COMPLETED' : ''}
            </p>
            <h1 className="vw-heading-md mb-2">{content.title}</h1>
          </header>

          {/* Tier selector */}
          <TierSelector activeTier={activeTier} onSelect={setActiveTier} />

          {/* Tier content */}
          <article className="mb-8">
            {activeTier === 'daily-bread' && (
              <DailyBreadTier content={content} />
            )}
            {activeTier === 'go-deeper' && <GoDeeper content={content} />}
            {activeTier === 'deep-dive' && <DeepDive content={content} />}
          </article>

          {/* Mark complete button */}
          {!isCompleted && !isSabbath && (
            <div
              className="border-t pt-6"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <button
                type="button"
                className="cta-major w-full"
                disabled={completing}
                onClick={handleComplete}
              >
                {completing ? 'MARKING COMPLETE...' : 'MARK DAY COMPLETE'}
              </button>
              {completeError && (
                <p
                  className="vw-small mt-2 text-center"
                  style={{ color: 'var(--color-error, #ef4444)' }}
                >
                  {completeError}
                </p>
              )}
            </div>
          )}

          {isCompleted && (
            <div
              className="border-t pt-6 text-center"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <p className="text-label vw-small text-gold">
                DAY {selectedDay} COMPLETE
              </p>
              {nextDay !== null ? (
                <>
                  <p className="vw-small mt-1 text-muted">
                    Well done. Continue when you&rsquo;re ready.
                  </p>
                  <button
                    type="button"
                    className="cta-major mt-4"
                    onClick={() => goToDay(nextDay)}
                  >
                    CONTINUE TO DAY {nextDay}
                  </button>
                </>
              ) : (
                <p className="vw-small mt-1 text-muted">
                  Well done. Return tomorrow for the next day.
                </p>
              )}
            </div>
          )}

          {/* Real day-to-day navigation (replaces dead text links) */}
          {(prevDay !== null || nextDay !== null) && (
            <nav
              className="mt-8 flex items-center justify-between gap-4 border-t pt-6"
              style={{ borderColor: 'var(--color-border)' }}
              aria-label="Day navigation"
            >
              {prevDay !== null ? (
                <button
                  type="button"
                  className="link-highlight text-label vw-small"
                  onClick={() => goToDay(prevDay)}
                >
                  &larr; DAY {prevDay}
                </button>
              ) : (
                <span />
              )}
              {nextDay !== null ? (
                <button
                  type="button"
                  className="link-highlight text-label vw-small"
                  onClick={() => goToDay(nextDay)}
                >
                  DAY {nextDay} &rarr;
                </button>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}

      {/* No content available */}
      {isCurrentDayUnlocked && !isSabbath && !content && (
        <div className="py-16 text-center">
          <p className="vw-body text-secondary">
            Content for this day is still being prepared.
          </p>
        </div>
      )}
    </div>
  )
}
