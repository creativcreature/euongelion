'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

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
}

const POLL_INTERVAL_MS = 2500
const MAX_POLLS = 180 // ~7.5 min hard ceiling
const MAX_AUTO_RETRIES = 2 // silently re-kick a stalled/errored job before surfacing anything
const CRAFT_ROTATE_MS = 2600
const TOTAL_DAYS = 7

/**
 * The seven-day edition, written one day at a time — and shown that way.
 *
 * Composing a bespoke edition genuinely takes ~30–90s, so we don't hide the
 * wait behind a spinner. We make it a presentation: the reader watches their
 * seven-day arc being set day by day, each day with its own line about what is
 * being written, and underneath it the craft of that day cycles — searching the
 * Scriptures, reading the commentaries, consulting the older voices. The stage
 * advances on the SERVER's real progress, never a fake timer.
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

const CRAFT_LINES = [
  'Searching the Scriptures for your situation…',
  'Reading the commentaries…',
  'Consulting the voices — Augustine, à Kempis, Spurgeon…',
  'Setting the type…',
  'Reading it back, line by line…',
]

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

export default function GenerationProgress({
  jobId,
  pollUrl,
  onRestart,
}: GenerationProgressProps) {
  const router = useRouter()
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [stalledOut, setStalledOut] = useState(false)
  const [craftIndex, setCraftIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const craftRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCountRef = useRef(0)
  const autoRetriesRef = useRef(0)
  const stoppedRef = useRef(false)

  const poll = useCallback(async () => {
    if (stoppedRef.current) return
    try {
      const separator = pollUrl.includes('?') ? '&' : '?'
      const res = await fetch(`${pollUrl}${separator}jobId=${jobId}`)
      if (!res.ok) return // transient; keep the presses running, poll again
      const data: StatusResponse = await res.json()
      setStatus(data)

      // Navigate the moment the server sends a route. With the self-chaining
      // executor that's as soon as DAY 1 is saved (Day-1-first): the reader
      // starts reading while days 2-7 keep setting in the background — they're
      // date-gated anyway, so nothing the reader can reach is missing.
      if (
        data.route &&
        (data.status === 'complete' ||
          data.status === 'generating' ||
          data.status === 'pending')
      ) {
        stoppedRef.current = true
        if (intervalRef.current) clearInterval(intervalRef.current)
        router.push(data.route)
        return
      }

      if (data.status === 'error' || data.status === 'stalled') {
        // Embrace the wait, don't punish it: silently re-kick a fresh job a few
        // times before ever surfacing a problem. The reader keeps watching the
        // press; they never see "took too long."
        if (onRestart && autoRetriesRef.current < MAX_AUTO_RETRIES) {
          autoRetriesRef.current += 1
          stoppedRef.current = true
          if (intervalRef.current) clearInterval(intervalRef.current)
          onRestart()
          return
        }
        stoppedRef.current = true
        if (intervalRef.current) clearInterval(intervalRef.current)
        setStalledOut(true)
        return
      }

      pollCountRef.current += 1
      if (pollCountRef.current >= MAX_POLLS) {
        stoppedRef.current = true
        if (intervalRef.current) clearInterval(intervalRef.current)
        setStalledOut(true)
      }
    } catch {
      // network hiccup — keep polling; the loader stays calm
    }
  }, [jobId, pollUrl, router, onRestart])

  useEffect(() => {
    stoppedRef.current = false
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fire-and-poll; setState lands after the async fetch, not synchronously
    void poll()
    intervalRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS)
    craftRef.current = setInterval(
      () => setCraftIndex((i) => (i + 1) % CRAFT_LINES.length),
      CRAFT_ROTATE_MS,
    )
    return () => {
      stoppedRef.current = true
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (craftRef.current) clearInterval(craftRef.current)
    }
  }, [poll])

  const completed = Math.min(status?.currentDay ?? 0, TOTAL_DAYS)
  const activeDay = deriveActiveDay(status)
  const pct = Math.round((completed / TOTAL_DAYS) * 100)
  const dayTheme = DAY_THEMES[Math.min(activeDay - 1, DAY_THEMES.length - 1)]
  const craftLine = CRAFT_LINES[craftIndex]

  if (stalledOut) {
    return (
      <div className="edition-press mx-auto max-w-xl px-5 py-16 text-center">
        <p className="text-label vw-small mb-3 text-gold">THE PRESS IS SLOW</p>
        <p className="vw-body mb-2 text-secondary">
          Your edition is taking longer than usual to set — the words are still
          being written for you, not pulled from a shelf.
        </p>
        <p className="vw-small mb-6 text-muted">Give it another moment.</p>
        <button
          type="button"
          className="cta-major"
          onClick={() => {
            autoRetriesRef.current = 0
            setStalledOut(false)
            if (onRestart) onRestart()
          }}
        >
          KEEP SETTING
        </button>
      </div>
    )
  }

  return (
    <div className="edition-press mx-auto max-w-xl px-5 py-12 text-center">
      <p className="text-label vw-small mb-1 text-secondary">EUANGELION</p>
      <div className="edition-press-rule mx-auto mb-5" aria-hidden="true" />
      <p className="text-label vw-small mb-8 edition-press-kicker">
        SETTING YOUR EDITION
      </p>

      {/* The seven-day spread — one tile per day, set in sequence. */}
      <ol
        className="edition-press-days mx-auto mb-9"
        aria-hidden="true"
        role="presentation"
      >
        {Array.from({ length: TOTAL_DAYS }, (_, i) => {
          const day = i + 1
          const state =
            day < activeDay ? 'done' : day === activeDay ? 'active' : 'todo'
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

      {/* The active day — its number, its theme, and the craft of writing it. */}
      <p className="vw-small text-label mb-1 text-muted">
        DAY {activeDay} OF {TOTAL_DAYS}
      </p>
      <p className="vw-heading-sm text-serif-italic mb-5">{dayTheme}</p>

      <p
        role="status"
        aria-live="polite"
        className="edition-press-craft vw-body mb-6 text-gold"
      >
        {craftLine}
      </p>

      <div
        className="edition-press-bar mx-auto mb-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={TOTAL_DAYS}
        aria-valuenow={completed}
        aria-label="Edition progress"
      >
        <span className="edition-press-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="vw-small mb-7 text-muted">
        {completed > 0
          ? `${completed} of ${TOTAL_DAYS} days set`
          : 'Warming the press…'}
      </p>

      <p className="vw-small text-muted">
        Written for you, today — about a minute. Stay with it; nothing here is
        recycled.
      </p>

      <style>{`
        .edition-press-rule {
          width: 56px; height: 2px; background: var(--color-crimson, #c4192e);
        }
        .edition-press-kicker { color: var(--color-crimson, #c4192e); letter-spacing: 0.18em; }

        .edition-press-days {
          display: flex; gap: 8px; justify-content: center; align-items: flex-end;
          list-style: none; padding: 0; margin-inline: auto;
        }
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
        }
      `}</style>
    </div>
  )
}
