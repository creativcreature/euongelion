'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  GENERATION_STAGES,
  STAGE_SUBLINES,
  activeStageIndex,
  completedStageCount,
  resolveArrivalEcho,
  type ArrivalEchoInput,
  type GenerationStatusSnapshot,
} from './generation-stages'

interface StatusResponse {
  jobId: string
  status: 'pending' | 'generating' | 'complete' | 'error' | 'stalled'
  progress: string | null
  currentDay: number | null
  totalDays: number
  planId: string | null
  route: string | null
  error: string | null
}

interface GenerationProgressProps {
  jobId: string
  pollUrl: string
  /**
   * Re-kicks a FRESH generation (re-select) — used both for the user-facing
   * "try again" and for transparent auto-retry when a unit stalls. Re-polling a
   * dead job just returns the same error, so recovery means a new job.
   */
  onRestart?: () => void
  /** Quiet secondary on failure — abandons the held request entirely. */
  onStartOver?: () => void
  /** Arrival echo inputs (consent-cue rule — see generation-stages.ts). */
  echo?: ArrivalEchoInput
  /**
   * Silent auto-retry budget, OWNED BY THE PARENT. Each onRestart
   * remounts this component (the parent clears generationJob and
   * re-selects), so a local counter would reset every cycle and a
   * persistently failing job would silently retry-loop forever — under
   * the HELD MOMENT that is a trap, and the honest failure state must
   * surface instead. TRY AGAIN (a real user action) refills the budget.
   */
  autoRetryBudgetRef?: React.MutableRefObject<number>
}

const POLL_INTERVAL_MS = 2500
const MAX_POLLS = 180 // ~7.5 min hard ceiling
const MAX_AUTO_RETRIES = 2 // silently re-kick a stalled/errored job before surfacing anything
const SUBLINE_ROTATE_MS = 2600
/** The beat of stillness between the final check and the arrival statement. */
const ARRIVAL_STILLNESS_MS = 1400
const TOTAL_DAYS = 7

/**
 * The HELD MOMENT (pattern doc §7.1/§7.2 — "Press room meets Upper Room").
 *
 * Composing a bespoke edition genuinely takes ~30–90s. We don't hide the
 * wait and we don't allow browsing away from it: while the presses run,
 * this surface owns the screen. What makes an undismissable wait honest:
 *
 *  - a staged checklist whose rows bind STRICTLY to real job status
 *    (see generation-stages.ts — Dev Rule #1 applied to motion);
 *  - the duration expectation set once, up front;
 *  - the edition-press emblem showing the seven days being set — driven
 *    by the SERVER's real progress, never a fake timer;
 *  - failure that never traps: the checklist freezes at the failed stage
 *    and TRY AGAIN / Start over are always presented.
 *
 * Arrival: the final row checks, a beat of stillness, one arrival
 * statement (quote-with-consent-cue echo), a single CTA into Day 1.
 * No confetti (SA-025).
 */
const DAY_THEMES = [
  'Meeting you where you actually are.',
  'Naming the thing, without flinching.',
  'Bringing Scripture in close.',
  'Listening for the older voices.',
  'Where the light starts to break in.',
  'Turning the ache into prayer.',
  'What you carry forward.',
]

/** Real Scripture — the Upper Room register: waiting as expectancy. */
const WAITING_VERSE = {
  text: 'I wait for the LORD, my soul doth wait, and in his word do I hope.',
  reference: 'PSALM 130:5',
}

/** Derive the day currently being WRITTEN from real server state. */
function deriveActiveDay(status: StatusResponse | null): number {
  // The progress string ("Composing day N of 7…") names the day in progress.
  const fromProgress = status?.progress?.match(/day\s+(\d+)/i)
  if (fromProgress) {
    return Math.min(Math.max(parseInt(fromProgress[1], 10), 1), TOTAL_DAYS)
  }
  // Otherwise current_day = completed days, so the next one is being written.
  const completed = status?.currentDay ?? 0
  return Math.min(completed + 1, TOTAL_DAYS)
}

function toSnapshot(
  status: StatusResponse | null,
): GenerationStatusSnapshot | null {
  if (!status) return null
  return {
    status: status.status,
    progress: status.progress,
    currentDay: status.currentDay,
    totalDays: status.totalDays,
    route: status.route,
  }
}

type Phase = 'composing' | 'stillness' | 'arrival' | 'failed'

export default function GenerationProgress({
  jobId,
  pollUrl,
  onRestart,
  onStartOver,
  echo,
  autoRetryBudgetRef,
}: GenerationProgressProps) {
  const router = useRouter()
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [phase, setPhase] = useState<Phase>('composing')
  const [sublineIndex, setSublineIndex] = useState(0)
  // Rows never un-check: ratchet the completed count across polls.
  const [stageCount, setStageCount] = useState(0)
  const stageCountRef = useRef(0)
  const [arrivalRoute, setArrivalRoute] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sublineRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stillnessRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollCountRef = useRef(0)
  // Fallback for callers that don't own the budget (parent ref preferred —
  // see the prop doc).
  const localRetriesRef = useRef(0)
  const stoppedRef = useRef(false)

  const readRetries = useCallback(
    () => (autoRetryBudgetRef ?? localRetriesRef).current,
    [autoRetryBudgetRef],
  )
  const bumpRetries = useCallback(() => {
    if (autoRetryBudgetRef) {
      autoRetryBudgetRef.current += 1
    } else {
      localRetriesRef.current += 1
    }
  }, [autoRetryBudgetRef])
  const resetRetries = useCallback(() => {
    if (autoRetryBudgetRef) {
      autoRetryBudgetRef.current = 0
    }
    localRetriesRef.current = 0
  }, [autoRetryBudgetRef])

  const ratchetStages = useCallback((next: StatusResponse | null) => {
    const count = completedStageCount(toSnapshot(next))
    if (count > stageCountRef.current) {
      stageCountRef.current = count
      setStageCount(count)
    }
  }, [])

  const poll = useCallback(async () => {
    if (stoppedRef.current) return
    try {
      const separator = pollUrl.includes('?') ? '&' : '?'
      const res = await fetch(`${pollUrl}${separator}jobId=${jobId}`)
      if (!res.ok) return // transient; keep the presses running, poll again
      const data: StatusResponse = await res.json()
      setStatus(data)
      ratchetStages(data)

      // ARRIVAL — the server opened the route. With the self-chaining
      // executor that's as soon as DAY 1 is saved (Day-1-first): days 2–7
      // keep setting in the background and are date-gated anyway. We hold
      // for a beat of stillness, then present the arrival statement and a
      // single CTA into Day 1 — never an auto-redirect mid-breath.
      if (
        data.route &&
        (data.status === 'complete' ||
          data.status === 'generating' ||
          data.status === 'pending')
      ) {
        stoppedRef.current = true
        if (intervalRef.current) clearInterval(intervalRef.current)
        setArrivalRoute(data.route)
        setPhase('stillness')
        stillnessRef.current = setTimeout(
          () => setPhase('arrival'),
          ARRIVAL_STILLNESS_MS,
        )
        return
      }

      if (data.status === 'error' || data.status === 'stalled') {
        // Embrace the wait, don't punish it: silently re-kick a fresh job a few
        // times before ever surfacing a problem. The reader keeps watching the
        // press; they never see "took too long."
        if (onRestart && readRetries() < MAX_AUTO_RETRIES) {
          bumpRetries()
          stoppedRef.current = true
          if (intervalRef.current) clearInterval(intervalRef.current)
          onRestart()
          return
        }
        stoppedRef.current = true
        if (intervalRef.current) clearInterval(intervalRef.current)
        setPhase('failed')
        return
      }

      pollCountRef.current += 1
      if (pollCountRef.current >= MAX_POLLS) {
        stoppedRef.current = true
        if (intervalRef.current) clearInterval(intervalRef.current)
        setPhase('failed')
      }
    } catch {
      // network hiccup — keep polling; the press room stays calm
    }
  }, [jobId, pollUrl, onRestart, ratchetStages, readRetries, bumpRetries])

  useEffect(() => {
    stoppedRef.current = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fire-and-poll; setState lands after the async fetch, not synchronously
    void poll()
    intervalRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS)
    sublineRef.current = setInterval(
      () => setSublineIndex((i) => i + 1),
      SUBLINE_ROTATE_MS,
    )
    return () => {
      stoppedRef.current = true
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (sublineRef.current) clearInterval(sublineRef.current)
      if (stillnessRef.current) clearTimeout(stillnessRef.current)
    }
  }, [poll])

  // HELD MOMENT (§7.2): while this surface is mounted, global nav chrome
  // (the mobile tab bar in the root layout) is hidden — no browse-away
  // during composition. The attribute is removed the moment the reader
  // leaves (arrival CTA, Start over, or any unmount), so the hold ends
  // exactly when the moment does.
  useEffect(() => {
    document.documentElement.setAttribute('data-held-moment', '')
    return () => {
      document.documentElement.removeAttribute('data-held-moment')
    }
  }, [])

  const completedDays = Math.min(status?.currentDay ?? 0, TOTAL_DAYS)
  const activeDay = deriveActiveDay(status)
  const pct = Math.round((completedDays / TOTAL_DAYS) * 100)
  const dayTheme = DAY_THEMES[Math.min(activeDay - 1, DAY_THEMES.length - 1)]
  const activeIndex = activeStageIndex(stageCount)
  const activeStage = GENERATION_STAGES[activeIndex]
  const sublines = STAGE_SUBLINES[activeStage.key]
  const subline = sublines[sublineIndex % sublines.length]
  const allChecked = phase === 'stillness' || phase === 'arrival'

  // ── The seven-day emblem (the loved edition-press animation) ──────────
  const emblem = (
    <ol className="edition-press-days" aria-hidden="true" role="presentation">
      {Array.from({ length: TOTAL_DAYS }, (_, i) => {
        const day = i + 1
        const state = allChecked
          ? 'done'
          : day < activeDay
            ? 'done'
            : day === activeDay
              ? 'active'
              : 'todo'
        return (
          <li
            key={day}
            className={`edition-press-day edition-press-day--${state}`}
          >
            <span className="edition-press-day-num">{day}</span>
          </li>
        )
      })}
    </ol>
  )

  // ── The production-schedule checklist (real status only) ─────────────
  const checklist = (
    <ol className="edition-press-schedule" aria-label="Composition progress">
      {GENERATION_STAGES.map((stage, index) => {
        const done = allChecked || index < stageCount
        const failedHere = phase === 'failed' && index === activeIndex && !done
        const active =
          !done && !failedHere && phase === 'composing' && index === activeIndex
        return (
          <li
            key={stage.key}
            className={`edition-press-schedule-row${done ? ' is-done' : ''}${active ? ' is-active' : ''}${failedHere ? ' is-failed' : ''}`}
            aria-current={active ? 'step' : undefined}
          >
            <span className="edition-press-schedule-num" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="edition-press-schedule-label text-label">
              {stage.label}
            </span>
            <span className="edition-press-schedule-mark" aria-hidden="true">
              {done ? '✓' : failedHere ? '✕' : ''}
            </span>
            <span className="sr-only">
              {done
                ? ' — done'
                : failedHere
                  ? ' — could not finish'
                  : active
                    ? ' — in progress'
                    : ' — waiting'}
            </span>
          </li>
        )
      })}
    </ol>
  )

  // ── Failure — the hold never becomes a trap (§7.2) ────────────────────
  const failureBody = phase === 'failed' && (
    <div className="edition-press-failure" role="alert">
      <p className="vw-body mb-2 text-secondary">
        We couldn&rsquo;t finish composing your plan.
      </p>
      <p className="vw-small mb-6 text-muted">
        Nothing you wrote was lost. Trying again re-fires the same request — no
        re-typing.
      </p>
      <div className="flex flex-col items-center gap-4 lg:items-start">
        <button
          type="button"
          className="cta-major text-label vw-small px-6 py-3"
          onClick={() => {
            resetRetries()
            pollCountRef.current = 0
            setPhase('composing')
            if (onRestart) onRestart()
          }}
        >
          TRY AGAIN
        </button>
        {onStartOver && (
          <button
            type="button"
            className="text-label vw-small link-highlight"
            onClick={onStartOver}
          >
            Start over
          </button>
        )}
      </div>
    </div>
  )

  // ── Arrival — a held breath, then the content ────────────────────────
  if (phase === 'arrival' && arrivalRoute) {
    const arrivalEcho = resolveArrivalEcho(
      echo ?? { typedThisSession: null, theme: null, scriptureAnchor: null },
    )
    return (
      <div className="edition-press edition-press--arrival">
        <div className="edition-press-arrival-inner">
          <p className="text-label vw-small mb-1 text-secondary">EUANGELION</p>
          <div className="edition-press-rule mx-auto mb-6" aria-hidden="true" />
          <p className="text-label vw-small mb-8 edition-press-kicker">
            YOUR EDITION IS SET
          </p>
          {emblem}
          {arrivalEcho.kind === 'quote' && arrivalEcho.quote && (
            <blockquote className="edition-press-echo-quote text-serif-italic vw-heading-sm">
              &ldquo;{arrivalEcho.quote}&rdquo;
            </blockquote>
          )}
          <p
            className={
              arrivalEcho.kind === 'quote'
                ? 'vw-body mb-9 text-secondary'
                : 'edition-press-echo-abstract text-serif-italic vw-heading-sm mb-9'
            }
            role="status"
            aria-live="polite"
          >
            {arrivalEcho.statement}
          </p>
          <button
            type="button"
            className="cta-major text-label vw-small px-8 py-4"
            onClick={() => router.push(arrivalRoute)}
          >
            BEGIN DAY 1
          </button>
        </div>
        {pressStyles}
      </div>
    )
  }

  // ── The held moment — press room meets Upper Room ────────────────────
  return (
    <div className="edition-press edition-press--held">
      {/* Left column on desktop: the production schedule. */}
      <aside className="edition-press-schedule-col">
        <p className="text-label vw-small mb-1 text-secondary">EUANGELION</p>
        <div className="edition-press-rule mb-5" aria-hidden="true" />
        <p className="text-label vw-small mb-2 edition-press-kicker">
          {phase === 'failed' ? 'THE PRESS STOPPED' : 'SETTING YOUR EDITION'}
        </p>
        <p className="vw-small mb-7 text-muted">
          This takes about a minute. It is being written for you, not fetched.
        </p>
        {checklist}
        {phase === 'failed' ? (
          failureBody
        ) : (
          <p
            role="status"
            aria-live="polite"
            className="edition-press-craft vw-small mt-5 text-gold"
          >
            {phase === 'composing' ? subline : 'The last page is set.'}
          </p>
        )}
        <div className="edition-press-verse">
          <p className="text-serif-italic vw-small text-secondary">
            {WAITING_VERSE.text}
          </p>
          <p className="text-label vw-small mt-2 text-muted">
            {WAITING_VERSE.reference}
          </p>
        </div>
      </aside>

      {/* Right column on desktop: the press at broadsheet scale. */}
      <div className="edition-press-floor">
        {emblem}
        <p className="vw-small text-label mb-1 mt-8 text-muted">
          DAY {allChecked ? TOTAL_DAYS : activeDay} OF {TOTAL_DAYS}
        </p>
        <p className="vw-heading-sm text-serif-italic mb-6">
          {allChecked ? 'It is ready.' : dayTheme}
        </p>
        <div
          className="edition-press-bar mb-2"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={TOTAL_DAYS}
          aria-valuenow={allChecked ? TOTAL_DAYS : completedDays}
          aria-label="Edition progress"
        >
          <span
            className="edition-press-bar-fill"
            style={{ width: `${allChecked ? 100 : pct}%` }}
          />
        </div>
        <p className="vw-small text-muted">
          {allChecked
            ? 'Your first day is set.'
            : completedDays > 0
              ? `${completedDays} of ${TOTAL_DAYS} days set`
              : 'Warming the press…'}
        </p>
      </div>
      {pressStyles}
    </div>
  )
}

const pressStyles = (
  <style>{`
    /* ── Held-moment layout ─────────────────────────────────────────── */
    .edition-press--held {
      min-height: 100dvh;
      display: flex;
      flex-direction: column-reverse; /* mobile: emblem above, checklist in the lower two-thirds */
      justify-content: flex-end;
      gap: 2.5rem;
      padding: clamp(1.5rem, 5vw, 4rem) clamp(1.25rem, 6vw, 5rem);
      max-width: 100%;
    }
    .edition-press-schedule-col { text-align: left; }
    .edition-press-floor {
      text-align: center;
      display: flex; flex-direction: column; align-items: center;
      justify-content: center;
      padding-top: 2rem;
    }
    @media (min-width: 1024px) {
      .edition-press--held {
        flex-direction: row;
        align-items: stretch;
        gap: clamp(3rem, 6vw, 6rem);
      }
      .edition-press-schedule-col {
        flex: 0 0 clamp(240px, 26vw, 340px);
        border-right: 1px solid var(--color-border);
        padding-right: clamp(2rem, 3vw, 3rem);
        display: flex; flex-direction: column;
      }
      .edition-press-floor {
        flex: 1 1 auto;
        padding-top: 0;
      }
      /* broadsheet scale */
      .edition-press-floor .edition-press-days { gap: 14px; }
      .edition-press-floor .edition-press-day { width: 56px; height: 76px; }
      .edition-press-floor .edition-press-day-num { font-size: 1rem; }
      .edition-press-floor .edition-press-day--active::after {
        animation-name: edition-day-ink-lg;
      }
    }

    .edition-press--arrival {
      min-height: 100dvh;
      display: flex; align-items: center; justify-content: center;
      padding: clamp(1.5rem, 5vw, 4rem) clamp(1.25rem, 6vw, 5rem);
    }
    .edition-press-arrival-inner {
      max-width: 34rem; text-align: center;
      display: flex; flex-direction: column; align-items: center;
    }
    .edition-press-echo-quote {
      margin: 2.25rem 0 0.9rem;
      quotes: none;
    }
    .edition-press-echo-abstract { margin-top: 2.25rem; }
    .edition-press--arrival .edition-press-days { justify-content: center; }

    .edition-press-rule {
      width: 56px; height: 2px; background: var(--color-crimson, #c4192e);
    }
    .edition-press--arrival .edition-press-rule { margin-inline: auto; }
    .edition-press-kicker { color: var(--color-crimson, #c4192e); letter-spacing: 0.18em; }

    /* ── Production schedule (checklist) ────────────────────────────── */
    .edition-press-schedule {
      list-style: none; padding: 0; margin: 0;
      border-top: 1px solid var(--color-border);
    }
    .edition-press-schedule-row {
      display: flex; align-items: baseline; gap: 0.85rem;
      padding: 0.85rem 0;
      min-height: 44px;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text-muted);
      transition: color 400ms ease;
    }
    .edition-press-schedule-num {
      font-size: 0.68rem; letter-spacing: 0.12em;
      opacity: 0.6; min-width: 1.6em;
    }
    .edition-press-schedule-label {
      flex: 1 1 auto; font-size: 0.72rem; letter-spacing: 0.16em;
      text-transform: uppercase;
    }
    .edition-press-schedule-mark {
      min-width: 1.2em; text-align: right; font-size: 0.8rem;
    }
    .edition-press-schedule-row.is-done { color: var(--color-text-secondary); }
    .edition-press-schedule-row.is-done .edition-press-schedule-mark { color: var(--color-gold); }
    .edition-press-schedule-row.is-active { color: var(--color-text-primary); }
    .edition-press-schedule-row.is-active .edition-press-schedule-label {
      color: var(--color-gold);
    }
    .edition-press-schedule-row.is-active .edition-press-schedule-mark::before {
      content: ''; display: inline-block; width: 7px; height: 7px;
      background: var(--color-gold);
      animation: edition-schedule-pulse 2.2s ease-in-out infinite;
    }
    .edition-press-schedule-row.is-failed { color: var(--color-text-primary); }
    .edition-press-schedule-row.is-failed .edition-press-schedule-mark {
      color: var(--color-crimson, #c4192e);
    }
    @keyframes edition-schedule-pulse {
      0%, 100% { opacity: 0.35; }
      50% { opacity: 1; }
    }

    .edition-press-failure { margin-top: 1.75rem; }
    .edition-press-verse {
      margin-top: auto; padding-top: 2.5rem;
    }
    .edition-press--held .edition-press-schedule-col .edition-press-verse {
      max-width: 30ch;
    }

    /* ── The seven-day emblem ───────────────────────────────────────── */
    .edition-press-days {
      display: flex; gap: 8px; justify-content: center; align-items: flex-end;
      list-style: none; padding: 0; margin: 0;
    }
    .edition-press-schedule-col + .edition-press-floor .edition-press-days { margin-inline: auto; }
    .edition-press-day {
      position: relative; width: 34px; height: 46px;
      border: 1px solid var(--color-border);
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
      transition: border-color 500ms ease, transform 500ms ease;
    }
    .edition-press-day-num {
      font-size: 0.72rem; letter-spacing: 0.04em;
      color: var(--color-text-muted, currentColor); opacity: 0.5;
      transition: color 500ms ease, opacity 500ms ease;
      z-index: 1;
    }
    /* upcoming days: faint, waiting to be set */
    .edition-press-day--todo { opacity: 0.55; }
    /* completed days: inked and set */
    .edition-press-day--done {
      border-color: color-mix(in srgb, var(--color-gold) 55%, transparent);
      background: color-mix(in srgb, var(--color-gold) 12%, transparent);
    }
    .edition-press-day--done .edition-press-day-num {
      color: var(--color-gold); opacity: 1;
    }
    /* the day being written now: pulsing, with an ink sweep */
    .edition-press-day--active {
      border-color: var(--color-gold);
      transform: translateY(-3px);
      animation: edition-day-pulse 2.2s ease-in-out infinite;
    }
    .edition-press-day--active .edition-press-day-num {
      color: var(--color-gold); opacity: 1;
    }
    .edition-press-day--active::after {
      content: ''; position: absolute; left: 0; right: 0; top: 0; height: 60%;
      background: linear-gradient(180deg, color-mix(in srgb, var(--color-gold) 32%, transparent) 0%, transparent 100%);
      animation: edition-day-ink 2.2s ease-in-out infinite;
      pointer-events: none;
    }
    @keyframes edition-day-pulse {
      0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-gold) 0%, transparent); }
      50% { box-shadow: 0 0 14px 0 color-mix(in srgb, var(--color-gold) 32%, transparent); }
    }
    @keyframes edition-day-ink {
      0% { transform: translateY(-46px); opacity: 0; }
      50% { opacity: 1; }
      100% { transform: translateY(46px); opacity: 0; }
    }
    @keyframes edition-day-ink-lg {
      0% { transform: translateY(-76px); opacity: 0; }
      50% { opacity: 1; }
      100% { transform: translateY(76px); opacity: 0; }
    }

    .edition-press-craft { min-height: 1.5em; transition: opacity 300ms ease; }

    .edition-press-bar {
      width: min(260px, 70%); height: 2px; background: var(--color-border);
      overflow: hidden;
    }
    .edition-press-bar-fill {
      display: block; height: 100%; background: var(--color-gold);
      transition: width 700ms ease-out;
    }

    @media (prefers-reduced-motion: reduce) {
      .edition-press-day--active { animation: none; transform: none; }
      .edition-press-day--active::after { display: none; }
      .edition-press-schedule-row.is-active .edition-press-schedule-mark::before { animation: none; opacity: 1; }
    }
  `}</style>
)
