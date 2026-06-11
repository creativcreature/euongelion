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

/**
 * The "press room." Composing a bespoke edition genuinely takes ~30–90s — so
 * we don't hide that behind a spinner or race a deadline; we make the wait a
 * deliberate, on-brand moment: the reader watches their seven-day edition being
 * set like type and pressed, hot off the press, written only for them.
 */
const STAGES = [
  { at: 0, label: 'Reading what you wrote…' },
  { at: 0, label: 'Gathering Scripture for your situation…' },
  { at: 1, label: 'Consulting the voices — Augustine, à Kempis, Spurgeon…' },
  { at: 1, label: 'Setting the type…' },
  { at: 2, label: 'Weaving the seven-day arc…' },
  { at: 3, label: 'Inking the press…' },
  { at: 4, label: 'Pulling your edition…' },
]

export default function GenerationProgress({
  jobId,
  pollUrl,
  onRestart,
}: GenerationProgressProps) {
  const router = useRouter()
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [stalledOut, setStalledOut] = useState(false)
  const [stageIndex, setStageIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stageRef = useRef<ReturnType<typeof setInterval> | null>(null)
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

      if (data.status === 'complete' && data.route) {
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
    stageRef.current = setInterval(
      () => setStageIndex((i) => (i + 1) % STAGES.length),
      3200,
    )
    return () => {
      stoppedRef.current = true
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (stageRef.current) clearInterval(stageRef.current)
    }
  }, [poll])

  const totalDays = status?.totalDays ?? 7
  const currentDay = status?.currentDay ?? 0
  const pct = totalDays > 0 ? Math.round((currentDay / totalDays) * 100) : 0
  // Prefer the server's real progress line; otherwise rotate the press stages.
  const stageLine = status?.progress?.trim() || STAGES[stageIndex].label

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
    <div className="edition-press mx-auto max-w-xl px-5 py-14 text-center">
      <p className="text-label vw-small mb-1 text-secondary">EUANGELION</p>
      <div className="edition-press-rule mx-auto mb-5" aria-hidden="true" />
      <p className="text-label vw-small mb-7 edition-press-kicker">
        SETTING YOUR EDITION
      </p>

      {/* The galley proof — type being set, line by line, with an ink sweep. */}
      <div
        className="edition-press-galley mx-auto mb-8"
        aria-hidden="true"
        role="presentation"
      >
        <span className="edition-press-ink" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="edition-press-line"
            style={{ animationDelay: `${i * 0.45}s` }}
          />
        ))}
      </div>

      <p className="vw-heading-sm text-serif-italic mb-1">
        A seven-day edition,
      </p>
      <p className="vw-body mb-6 text-secondary">being set for you.</p>

      {/* Real, polite progress for assistive tech + sighted readers. */}
      <p role="status" aria-live="polite" className="vw-body mb-3 text-gold">
        {stageLine}
      </p>

      <div
        className="edition-press-bar mx-auto mb-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalDays}
        aria-valuenow={currentDay}
        aria-label="Edition progress"
      >
        <span className="edition-press-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      {currentDay > 0 && (
        <p className="vw-small mb-6 text-muted">
          Day {currentDay} of {totalDays} set
        </p>
      )}

      <p className="vw-small text-muted">
        Written for you, today — about a minute. Stay with it; nothing here is
        recycled.
      </p>

      <style>{`
        .edition-press-rule {
          width: 56px; height: 2px; background: var(--color-crimson, #c4192e);
        }
        .edition-press-kicker { color: var(--color-crimson, #c4192e); letter-spacing: 0.18em; }
        .edition-press-galley {
          position: relative; width: min(280px, 80%); padding: 18px 20px;
          border: 1px solid var(--color-border);
          display: flex; flex-direction: column; gap: 10px;
          overflow: hidden;
        }
        .edition-press-line {
          height: 7px; border-radius: 1px;
          background: var(--color-text-primary, currentColor);
          opacity: 0.16; transform-origin: left;
          animation: edition-set 2.7s ease-in-out infinite;
        }
        .edition-press-line:nth-child(2n) { width: 92%; }
        .edition-press-line:nth-child(3n) { width: 78%; }
        .edition-press-line:last-child { width: 54%; }
        @keyframes edition-set {
          0%   { transform: scaleX(0); opacity: 0.06; }
          45%  { transform: scaleX(1); opacity: 0.34; }
          100% { transform: scaleX(1); opacity: 0.16; }
        }
        .edition-press-ink {
          position: absolute; left: 0; right: 0; top: 0; height: 22px;
          background: linear-gradient(180deg, color-mix(in srgb, var(--color-gold) 28%, transparent) 0%, transparent 100%);
          animation: edition-ink 2.7s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes edition-ink {
          0%   { transform: translateY(-24px); opacity: 0; }
          50%  { opacity: 1; }
          100% { transform: translateY(150px); opacity: 0; }
        }
        .edition-press-bar {
          width: min(260px, 70%); height: 2px; background: var(--color-border);
          overflow: hidden;
        }
        .edition-press-bar-fill {
          display: block; height: 100%; background: var(--color-gold);
          transition: width 700ms ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .edition-press-line, .edition-press-ink { animation: none; }
          .edition-press-line { opacity: 0.24; transform: none; }
          .edition-press-ink { display: none; }
        }
      `}</style>
    </div>
  )
}
