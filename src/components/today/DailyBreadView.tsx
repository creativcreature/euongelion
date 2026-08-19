'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { renderMarkdownSafe } from '@/lib/markdown-safe'
import AudioPlayer from '@/components/AudioPlayer'
import DevotionalHeadline from '@/components/devotional/DevotionalHeadline'
import { getSeriesHero } from '@/lib/series-hero'
import ClipButton from '@/components/ClipButton'
import PushOptIn from '@/components/PushOptIn'
import MarkdownWithWordNotes from '@/components/daily-bread/MarkdownWithWordNotes'
import ModuleRenderer from '@/components/ModuleRenderer'
import CompletionBeat from '@/components/CompletionBeat'
import { signalCompletionBeat } from '@/lib/completion-beat'
import { recordPresenceToday } from '@/lib/presence'
import { buildDayContentSegments } from '@/lib/audio/segments'
import { hapticTick } from '@/lib/haptics'
import { onboardingDayContentToModules } from '@/lib/soul-audit/onboarding-day-to-reader'
import { isUnlocked } from '@/lib/soul-audit/plan-utils'
import { loadSelectedAuditReason } from '@/components/soul-audit/helpers'
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

// Model-authored markdown renders with raw HTML DISABLED (brief §12.3 /
// OWASP M-1) — a prompt injection in the user's reflection can never
// smuggle executable HTML into the reader.
function renderMarkdown(md: string): string {
  return renderMarkdownSafe(md)
}

function getDayRecord(
  plan: PlanWithDays,
  dayNumber: number,
): PlanDayRecord | undefined {
  return plan.devotional_plan_days.find((d) => d.day_number === dayNumber)
}

// ─── Sub-Components ─────────────────────────────────────────────────

// F-031: a day's status relative to where the reader actually is in the plan
// (`planCurrentDay`), so the chip always answers "where am I?" — past, now,
// next, locked, rest, or the onboarding start. This is independent of which
// day is being *viewed* (the viewed day gets a ring; the status comes from
// real unlock + completion state, never bypassing gating).
type DayChipStatus =
  | 'start'
  | 'past'
  | 'now'
  | 'next'
  | 'upcoming'
  | 'locked'
  | 'rest'

function chipStatusLabel(status: DayChipStatus): string {
  switch (status) {
    case 'start':
      return 'START'
    case 'past':
      return 'DONE'
    case 'now':
      return 'NOW'
    case 'next':
      return 'NEXT'
    case 'upcoming':
      return 'OPEN'
    case 'locked':
      return 'LOCKED'
    case 'rest':
      return 'REST'
  }
}

// Tone is expressed with the existing gold / border / muted tokens only —
// no new colors. Gold marks the live "now"/"start"; completed reads gold-dim;
// locked is muted + dashed; the rest sit quiet.
function chipStyle(status: DayChipStatus, isViewing: boolean) {
  const isLive = status === 'now' || status === 'start'
  return {
    borderColor: isViewing
      ? 'var(--color-gold)'
      : isLive
        ? 'var(--color-gold)'
        : 'var(--color-border)',
    borderStyle: status === 'locked' ? ('dashed' as const) : ('solid' as const),
    background: isViewing ? 'var(--color-active)' : 'transparent',
    opacity: status === 'locked' ? 0.55 : 1,
    cursor:
      status === 'locked' ? ('not-allowed' as const) : ('pointer' as const),
  }
}

function chipLabelColor(status: DayChipStatus): string {
  if (status === 'now' || status === 'start' || status === 'next') {
    return 'var(--color-gold)'
  }
  if (status === 'past') return 'var(--color-text-secondary)'
  return 'var(--color-muted)'
}

function DaySelector({
  schedule,
  selectedDay,
  planCurrentDay,
  plan,
  onSelect,
}: {
  schedule: DayScheduleEntry[]
  selectedDay: number
  planCurrentDay: number
  plan: PlanWithDays
  onSelect: (day: number) => void
}) {
  // The first unlocked, non-sabbath, not-yet-completed day AFTER the current
  // day is the explicit "next" step — the one we nudge toward.
  const nextDay = schedule
    .filter((e) => {
      if (e.status === 'sabbath' || !isUnlocked(e)) return false
      if (e.day <= planCurrentDay) return false
      const record = getDayRecord(plan, e.day)
      return !record?.completed_at
    })
    .map((e) => e.day)
    .sort((a, b) => a - b)[0]

  function resolveStatus(entry: DayScheduleEntry): DayChipStatus {
    const unlocked = isUnlocked(entry)
    const completed = !!getDayRecord(plan, entry.day)?.completed_at
    if (entry.status === 'sabbath') return 'rest'
    if (entry.day === 0) return completed ? 'past' : 'start'
    if (!unlocked) return 'locked'
    if (entry.day === planCurrentDay) return 'now'
    if (completed) return 'past'
    if (entry.day === nextDay) return 'next'
    return 'upcoming'
  }

  return (
    <nav
      className="mb-3 flex flex-wrap gap-2"
      aria-label="Plan day progression"
    >
      {schedule.map((entry) => {
        const unlocked = isUnlocked(entry)
        const status = resolveStatus(entry)
        const isViewing = entry.day === selectedDay
        const stateLabel = chipStatusLabel(status)
        const dayLabel = entry.day === 0 ? 'Onboarding' : `Day ${entry.day}`

        return (
          <button
            key={`day-nav-${entry.day}`}
            type="button"
            disabled={!unlocked}
            onClick={() => onSelect(entry.day)}
            className="relative min-w-[3rem] border px-3 py-2 text-center transition-colors affordance"
            style={{ ...chipStyle(status, isViewing), minHeight: '44px' }}
            aria-current={isViewing ? 'step' : undefined}
            aria-disabled={!unlocked}
            aria-label={`${dayLabel} — ${stateLabel}${
              isViewing ? ' — now viewing' : ''
            }`}
          >
            <span className="text-label block text-xs">
              {entry.day === 0 ? '0' : entry.day}
            </span>
            <span
              className="block text-[0.6rem] uppercase"
              style={{ color: chipLabelColor(status) }}
            >
              {stateLabel}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

// A compact legend so the chip vocabulary (NOW / NEXT / DONE / LOCKED / REST)
// is self-explanatory — the user never has to guess what a state means.
function ProgressionLegend() {
  const items: Array<[string, string]> = [
    ['NOW', 'where you are'],
    ['NEXT', 'your next step'],
    ['DONE', 'completed'],
    ['LOCKED', 'unlocks 7am'],
    ['REST', 'sabbath'],
  ]
  return (
    <ul
      className="mb-8 flex flex-wrap gap-x-4 gap-y-1 list-none"
      aria-label="What the day labels mean"
    >
      {items.map(([key, meaning]) => (
        <li key={key} className="flex items-baseline gap-1">
          <span className="text-label text-[0.6rem] uppercase text-gold">
            {key}
          </span>
          <span className="vw-small text-muted">{meaning}</span>
        </li>
      ))}
    </ul>
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
      <h1 className="vw-heading-md mb-4">Rest</h1>
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
        <h2 className="text-label vw-small mb-2 text-gold">SCRIPTURE</h2>
        <p className="vw-small mb-1 text-muted">{content.scriptureReference}</p>
        <div
          className="vw-body text-secondary type-prose"
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(content.scriptureText),
          }}
        />
      </section>

      {/* The woven reading (grounded body). Legacy days used hookA; the
          grounded weave puts the full flowing reading in textB and may embed
          inline {{wn:id|surface}} WordNote markers, rendered here as interactive
          lexicon notes. */}
      <section>
        <MarkdownWithWordNotes
          className="vw-body text-secondary type-prose"
          markdown={content.textB || content.hookA}
        />
      </section>

      {/* Grounded word study (lexicon-backed) */}
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
          <h2 className="text-label vw-small mb-2 text-gold">REFLECT</h2>
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
        <h2 className="text-label vw-small mb-2 text-gold">PRAYER</h2>
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
        <h2 className="text-label vw-small mb-2 text-gold">SCRIPTURE</h2>
        <p className="vw-small mb-1 text-muted">{content.scriptureReference}</p>
        <div
          className="vw-body text-secondary type-prose"
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(content.scriptureText),
          }}
        />
      </section>

      {/* Legacy days used the chiastic A-B-C-B'-A' fields; the grounded weave
          puts one flowing reading in textB. Render whichever a day has, and
          never show an empty labelled section. */}
      {content.hookA && (
        <section>
          <h2 className="text-label vw-small mb-2 text-gold">OPENING</h2>
          <div
            className="vw-body text-secondary type-prose"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content.hookA) }}
          />
        </section>
      )}

      {content.textB && (
        <section>
          <p className="text-label vw-small mb-2 text-gold">
            {content.hookA ? 'TEACHING' : 'THE READING'}
          </p>
          <MarkdownWithWordNotes
            className="vw-body text-secondary type-prose"
            markdown={content.textB}
          />
        </section>
      )}

      {content.centerC && (
        <section>
          <p className="text-label vw-small mb-2 text-gold">CENTER</p>
          <div
            className="vw-body text-secondary type-prose"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(content.centerC),
            }}
          />
        </section>
      )}

      {content.christConnectionBPrime && (
        <section>
          <p className="text-label vw-small mb-2 text-gold">
            CHRIST CONNECTION
          </p>
          <div
            className="vw-body text-secondary type-prose"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(content.christConnectionBPrime),
            }}
          />
        </section>
      )}

      {content.returnAPrime && (
        <section>
          <p className="text-label vw-small mb-2 text-gold">RETURN</p>
          <div
            className="vw-body text-secondary type-prose"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(content.returnAPrime),
            }}
          />
        </section>
      )}

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
          <h2 className="text-label vw-small mb-2 text-gold">REFLECT</h2>
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
        <h2 className="text-label vw-small mb-2 text-gold">PRAYER</h2>
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

const DEEPEN_POLL_MS = 6000
const DEEPEN_MAX_POLLS = 40 // ~4 min ceiling for the ~2 min generation

function DeepDive({
  content,
  planToken,
  dayNumber,
  onDeepDiveReady,
}: {
  content: DayContent
  planToken: string
  dayNumber: number
  onDeepDiveReady: (dayNumber: number, content: DayContent) => void
}) {
  const tier3 = content.tier3Extended
  const [deepening, setDeepening] = useState(false)
  const [deepenError, setDeepenError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCountRef = useRef(0)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const requestDeepDive = useCallback(async () => {
    if (deepening) return
    setDeepening(true)
    setDeepenError(null)
    pollCountRef.current = 0
    try {
      const res = await fetch(
        `/api/devotional-plan/${planToken}/day/${dayNumber}/deepen`,
        { method: 'POST' },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          data.error || `The press could not start (HTTP ${res.status}).`,
        )
      }
      // Poll until the merged Deep Dive lands.
      pollRef.current = setInterval(() => {
        void (async () => {
          pollCountRef.current += 1
          try {
            const poll = await fetch(
              `/api/devotional-plan/${planToken}/day/${dayNumber}/deepen`,
            )
            if (poll.ok) {
              const data = (await poll.json()) as {
                ready: boolean
                content?: DayContent
              }
              if (data.ready && data.content) {
                if (pollRef.current) clearInterval(pollRef.current)
                setDeepening(false)
                onDeepDiveReady(dayNumber, data.content)
                return
              }
            }
          } catch {
            // transient network hiccup — keep polling
          }
          if (pollCountRef.current >= DEEPEN_MAX_POLLS) {
            if (pollRef.current) clearInterval(pollRef.current)
            setDeepening(false)
            setDeepenError(
              'The Deep Dive is taking longer than usual. It keeps setting in the background — check back in a minute.',
            )
          }
        })()
      }, DEEPEN_POLL_MS)
    } catch (err) {
      setDeepening(false)
      setDeepenError(
        err instanceof Error ? err.message : 'Could not start the Deep Dive.',
      )
    }
  }, [deepening, planToken, dayNumber, onDeepDiveReady])

  return (
    <div className="space-y-6">
      {/* Full Go Deeper content first */}
      <GoDeeper content={content} />

      {/* The long-form Deep Dive reading (on-demand grounded weave) */}
      {tier3?.deepDiveBody ? (
        <section
          className="border-t pt-6"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-label vw-small mb-3 text-gold">THE DEEP DIVE</p>
          <MarkdownWithWordNotes
            className="vw-body text-secondary type-prose"
            markdown={tier3.deepDiveBody}
          />
        </section>
      ) : (
        <section
          className="border-t pt-6 text-center"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-label vw-small mb-2 text-gold">THE DEEP DIVE</p>
          <p className="vw-body mb-1 text-secondary">
            A long-form study of this day — the Hebrew and Greek opened from the
            lexicons, the four levels of reading, the historic voices in full.
          </p>
          <p className="vw-small mb-4 text-muted">
            Written fresh for this day when you ask — about two minutes.
          </p>
          {deepening ? (
            <p role="status" aria-live="polite" className="vw-body text-gold">
              Setting the Deep Dive… stay on this page or come back — it keeps
              writing either way.
            </p>
          ) : (
            <button
              type="button"
              className="cta-major"
              onClick={() => void requestDeepDive()}
            >
              SET THE DEEP DIVE
            </button>
          )}
          {deepenError && (
            <p
              className="vw-small mt-3"
              style={{ color: 'var(--color-crimson, #c4192e)' }}
            >
              {deepenError}
            </p>
          )}
        </section>
      )}

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

// ─── Onboarding (day 0) — full editorial module layout ──────────────

// Day 0 is the "Before You Begin" orientation. It is NOT a tiered teaching
// (no chiastic Go-Deeper / on-demand Deep Dive), so instead of the flat
// DayContent prose path we render its grounded content through the same
// ModuleRenderer pipeline the catalog reader uses — drop-cap Scripture,
// editorial teaching sections, reflection, and prayer. Cycle days 1+ are
// untouched and keep the tier prose path exactly as before.
function OnboardingEditorial({ content }: { content: DayContent }) {
  const modules = useMemo(
    () => onboardingDayContentToModules(content),
    [content],
  )

  if (modules.length === 0) {
    // No grounded content to shape — fall back to the flat reader rather than
    // render an empty editorial shell.
    return <DailyBreadTier content={content} />
  }

  return (
    <div className="devotional-shell">
      {modules.map((module, index) => (
        <article
          key={index}
          className="devotional-shell-panel border px-6 py-6"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {/* DevotionalModule's nested `content` object is flattened by
              ModuleRenderer.normalizeModule — same cast the AI-plan reader
              (PlanDayContent.tsx) uses to feed the dispatch. */}
          <ModuleRenderer
            module={module as unknown as Record<string, unknown>}
            moduleIndex={index}
          />
        </article>
      ))}
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
  // Deep Dives generated this session — overrides the server-provided day
  // content so the new long-form lands without a reload.
  const [deepDives, setDeepDives] = useState<Record<number, DayContent>>({})

  // D-22 (F-074): the audit's real stored reason this plan was matched.
  // Read in an effect (sessionStorage is client-only) so SSR/hydration
  // render identically; stays null — and the why-row absent — whenever the
  // session's audit payloads don't provably point at this plan.
  const [whyThis, setWhyThis] = useState<string | null>(null)
  useEffect(() => {
    setWhyThis(
      loadSelectedAuditReason({
        planToken: plan.plan_token,
        seriesSlug: plan.series_slug,
      }),
    )
  }, [plan.plan_token, plan.series_slug])

  const selectedEntry = useMemo(
    () => schedule.find((e) => e.day === selectedDay),
    [schedule, selectedDay],
  )

  // F-031: the reader's true position in the plan — the earliest unlocked,
  // non-sabbath day that has not been completed (session-local completions
  // counted so the chip advances immediately on "Mark complete"). Falls back
  // to the server-provided currentDay, then the first unlocked day. This drives
  // the NOW / NEXT / PAST chip semantics; it never overrides real gating.
  const planCurrentDay = useMemo(() => {
    const unlockedDays = schedule
      .filter((e) => e.status !== 'sabbath' && isUnlocked(e))
      .map((e) => e.day)
      .sort((a, b) => a - b)
    const firstIncomplete = unlockedDays.find((day) => {
      const record = getDayRecord(plan, day)
      return !record?.completed_at && !localCompleted.has(day)
    })
    if (firstIncomplete !== undefined) return firstIncomplete
    if (unlockedDays.includes(currentDay)) return currentDay
    return unlockedDays.length > 0
      ? unlockedDays[unlockedDays.length - 1]
      : currentDay
  }, [schedule, plan, currentDay, localCompleted])

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
  const content: DayContent | null =
    deepDives[selectedDay] ?? dayRecord?.content ?? null

  // Audio Edition: read this day's real woven content aloud, one section
  // at a time. Free, on-device (Web Speech). Built from the same content
  // object the tiers render.
  const audioSegments = useMemo(
    () => (content ? buildDayContentSegments(content) : []),
    [content],
  )

  const handleDeepDiveReady = useCallback(
    (day: number, updated: DayContent) => {
      setDeepDives((prev) => ({ ...prev, [day]: updated }))
    },
    [],
  )

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

      // Mark complete in-session only — no full page reload (which lost scroll
      // + motion) and no auto-advance into the next day. The reader chooses to
      // continue via the "Continue to Day N" affordance; we don't push more
      // reading on them. Server state reconciles on the next natural load.
      setLocalCompleted((prev) => new Set(prev).add(selectedDay))
      // F-066 (SA-025): mark today as a present day (local, ambient — plan
      // completion is server-side and leaves no wakeup_progress entry) and
      // offer the quiet completion beat with this day's scripture reference.
      recordPresenceToday()
      // D-23 (F-074): one subtle haptic tick on completing a day — no-op on
      // iOS web / unsupported browsers / reduced motion.
      hapticTick()
      signalCompletionBeat({
        scriptureReference: dayRecord.content?.scriptureReference,
      })
      // Signal the post-read push opt-in (inert until VAPID is configured).
      try {
        window.localStorage.setItem('euangelion:just-finished-reading', '1')
      } catch {
        // Storage unavailable (private mode) — no opt-in surfaced.
      }
    } catch (err) {
      setCompleteError(
        err instanceof Error ? err.message : 'Failed to mark day complete.',
      )
    } finally {
      setCompleting(false)
    }
  }, [completing, isCompleted, dayRecord, plan.plan_token, selectedDay])

  // Two-step arm/confirm instead of a native confirm() dialog.
  const [clearPlanArmed, setClearPlanArmed] = useState(false)
  const [clearingPlan, setClearingPlan] = useState(false)
  const handleClearPlan = useCallback(async () => {
    if (clearingPlan) return
    if (!clearPlanArmed) {
      setClearPlanArmed(true)
      return
    }
    setClearingPlan(true)
    try {
      const res = await fetch('/api/soul-audit/manage', { method: 'POST' })
      if (res.ok) {
        window.location.assign('/today')
        return
      }
    } catch {
      // fall through to re-enable the button
    }
    setClearingPlan(false)
    setClearPlanArmed(false)
  }, [clearingPlan, clearPlanArmed])

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
        {/* D-22 (F-074, Headspace why-row): the audit's real stored reason
            this plan was matched — one quiet line, rendered only when this
            session's audit payloads provably point at this plan. */}
        {whyThis && (
          <p
            className="vw-small mt-2 text-secondary"
            data-testid="daily-bread-why-this"
          >
            <span className="text-label text-gold">WHY THIS</span>
            <span aria-hidden="true"> · </span>
            {whyThis}
          </p>
        )}
        {/* F-083 (2026-07-27): stale-plan escape hatch. A Soul Audit
            plan rides a long-lived session cookie, so a months-old plan
            can keep resurfacing here with no way to dismiss it. This
            clears the session's audit state (POST /api/soul-audit/manage
            with action:reset) and reloads. */}
        <p className="vw-small mt-3">
          <button
            type="button"
            className="link-highlight text-label vw-small"
            disabled={clearingPlan}
            onClick={handleClearPlan}
            data-testid="daily-bread-clear-plan"
          >
            {clearingPlan
              ? 'CLEARING…'
              : clearPlanArmed
                ? 'SURE? TAP AGAIN TO CLEAR'
                : 'NOT READING THIS? CLEAR IT'}
          </button>
          <span aria-hidden="true"> · </span>
          <Link href="/library" className="link-highlight text-label vw-small">
            PICK A DEVOTIONAL IN THE LIBRARY
          </Link>
        </p>
      </header>

      {/* Day selector — explicit past/now/next/locked/rest progression chips */}
      <DaySelector
        schedule={schedule}
        selectedDay={selectedDay}
        planCurrentDay={planCurrentDay}
        plan={plan}
        onSelect={setSelectedDay}
      />
      <ProgressionLegend />

      {/* Locked state */}
      {!isCurrentDayUnlocked && selectedEntry && (
        <LockedDayView entry={selectedEntry} />
      )}

      {/* Sabbath state */}
      {isCurrentDayUnlocked && isSabbath && <SabbathView />}

      {/* Content state */}
      {isCurrentDayUnlocked && !isSabbath && content && (
        <>
          {/* Founder direction 2026-08-15: a plan day is a devotional and must
              read like one. This was a bare kicker + h1 with no artwork, so the
              soul-audit reading looked like a different product from
              /devotional/[slug]. Same headline component, same source for the
              plate. The plan payload carries no teaser, so the standfirst slot
              is left empty rather than filled with something invented. */}
          <DevotionalHeadline
            imageSrc={getSeriesHero(plan.series_slug)?.src}
            imageAlt={`Illustration accompanying ${content.title}`}
            title={content.title}
            scripture={content.scriptureReference ?? undefined}
          />
          <p className="text-label vw-small mb-6 mt-3 text-gold">
            {selectedDay === 0 ? 'ONBOARDING' : `DAY ${selectedDay}`}
            {isCompleted ? ' -- COMPLETED' : ''}
          </p>

          {/* Phase 2.1: Audio Edition — free, on-device read-aloud of this
              day's real woven content. */}
          {audioSegments.length > 0 && (
            <AudioPlayer
              title={content.title}
              segments={audioSegments}
              artworkSrc="/icons/icon-512.png"
              className="mb-8"
            />
          )}

          {/* Tier selector */}
          <TierSelector activeTier={activeTier} onSelect={setActiveTier} />

          {/* Tier content. Day 0 (onboarding) renders through the editorial
              module layout — the same ModuleRenderer pipeline as the catalog
              reader — regardless of tier; it is a single grounded orientation,
              not a tiered teaching. Cycle days 1+ keep the tier prose path
              exactly as before. */}
          <article className="mb-8">
            {selectedDay === 0 ? (
              <OnboardingEditorial content={content} />
            ) : (
              <>
                {activeTier === 'daily-bread' && (
                  <DailyBreadTier content={content} />
                )}
                {activeTier === 'go-deeper' && <GoDeeper content={content} />}
                {activeTier === 'deep-dive' && (
                  <DeepDive
                    content={content}
                    planToken={plan.plan_token}
                    dayNumber={selectedDay}
                    onDeepDiveReady={handleDeepDiveReady}
                  />
                )}
              </>
            )}
          </article>

          {/* Phase 2.4: clip the current text selection to the local
              commonplace book (device-only). */}
          <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2">
            <ClipButton
              sourceTitle={content.title}
              planToken={plan.plan_token}
              day={selectedDay}
              sourceHref="/daily-bread"
            />
            <Link
              href="/library?tab=clippings"
              className="text-label vw-small link-highlight leading-none"
            >
              CLIPPINGS
            </Link>
          </div>

          {/* Phase 2.2: calm post-read push opt-in (inert until VAPID is set). */}
          <PushOptIn />

          {/* F-066 (SA-025): quiet completion beat — renders nothing until
              handleComplete signals it, then one benediction line inline at
              the completion point. Dismiss by tapping anywhere; auto-fades. */}
          <CompletionBeat />

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
                  Well done. Sit with this — it’s here whenever you return.
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

      {/* No content available — never a dead-end: always offer a next action. */}
      {isCurrentDayUnlocked && !isSabbath && !content && (
        <div className="py-16 text-center">
          <p className="vw-body mb-6 text-secondary">
            This day isn’t ready just yet. Give it a moment and try again.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              className="cta-major"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.reload()
              }}
            >
              TRY AGAIN
            </button>
            {prevDay !== null && (
              <button
                type="button"
                className="link-highlight text-label vw-small"
                onClick={() => goToDay(prevDay)}
              >
                &larr; BACK TO DAY {prevDay}
              </button>
            )}
            <Link href="/series" className="link-highlight text-label vw-small">
              BROWSE SERIES
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
