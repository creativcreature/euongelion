'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  COMPLETION_BEAT_EVENT,
  type CompletionBeatDetail,
  benedictionForDate,
} from '@/lib/completion-beat'

/**
 * CompletionBeat — F-066 (SA-025), surface A: the quiet end-of-session
 * moment. Replaces the deleted DevotionalMilestoneReveal (which was an
 * orphaned FadeIn pass-through with no milestone semantics).
 *
 * Behavior contract:
 *  - Renders nothing until a completion event arrives (`progressUpdated`
 *    from markDevotionalComplete, or COMPLETION_BEAT_EVENT from the Daily
 *    Bread reader). Shows once per completion — repeat events while the
 *    beat is visible are ignored.
 *  - Inline, in the reading flow, near the completion point. NOT a modal
 *    wall: focus is never stolen, the page stays fully usable.
 *  - Dismissible by tapping/clicking anywhere or pressing Escape, and it
 *    auto-dismisses after a short while. No dismissal chrome — restraint.
 *  - Reduced-motion safe: the entrance fade is skipped when the OS
 *    preference or the in-app toggle (html.reduce-motion) asks for it,
 *    and the CSS animation carries its own prefers-reduced-motion guard.
 *  - Content is one benediction line (day-of-year rotation, brand voice)
 *    optionally paired with the day's scripture reference. NO counts,
 *    NO streaks, NO gamified praise.
 */

const AUTO_DISMISS_MS = 12_000

function prefersReducedMotion(): boolean {
  if (typeof document !== 'undefined') {
    if (document.documentElement.classList.contains('reduce-motion')) {
      return true
    }
  }
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
  ) {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
  return false
}

interface BeatState {
  line: string
  reference: string | null
  animate: boolean
}

export default function CompletionBeat({
  scriptureReference,
  className = '',
}: {
  /** Fallback pairing when the triggering event carries no reference. */
  scriptureReference?: string | null
  className?: string
}) {
  const [beat, setBeat] = useState<BeatState | null>(null)
  const visibleRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  const dismiss = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    visibleRef.current = false
    setBeat(null)
  }, [])

  useEffect(() => {
    const show = (event: Event) => {
      // Once per completion: a beat already on screen absorbs repeats.
      if (visibleRef.current) return
      visibleRef.current = true

      const detail = (event as CustomEvent<CompletionBeatDetail>).detail
      const reference =
        typeof detail?.scriptureReference === 'string' &&
        detail.scriptureReference.trim() !== ''
          ? detail.scriptureReference.trim()
          : (scriptureReference ?? null)

      setBeat({
        line: benedictionForDate(),
        reference,
        animate: !prefersReducedMotion(),
      })
      timerRef.current = window.setTimeout(() => {
        visibleRef.current = false
        timerRef.current = null
        setBeat(null)
      }, AUTO_DISMISS_MS)
    }

    window.addEventListener(COMPLETION_BEAT_EVENT, show)
    window.addEventListener('progressUpdated', show)
    return () => {
      window.removeEventListener(COMPLETION_BEAT_EVENT, show)
      window.removeEventListener('progressUpdated', show)
    }
  }, [scriptureReference])

  // Timer teardown belongs to unmount only — a scriptureReference change
  // re-binding the listeners above must not cancel a beat mid-breath.
  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    },
    [],
  )

  // "Tap anywhere to continue" — attached only while visible, and attached
  // in an effect so the click that triggered the completion (already past
  // by the time effects run) can never self-dismiss the beat.
  useEffect(() => {
    if (!beat) return
    const onAnyPointer = () => dismiss()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }
    document.addEventListener('click', onAnyPointer)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('click', onAnyPointer)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [beat, dismiss])

  if (!beat) return null

  return (
    <div
      className={`completion-beat${beat.animate ? ' completion-beat-enter' : ''}${
        className ? ` ${className}` : ''
      }`}
      role="status"
      aria-live="polite"
      data-testid="completion-beat"
    >
      <p className="completion-beat-line">{beat.line}</p>
      {beat.reference && (
        <p className="completion-beat-reference text-label">{beat.reference}</p>
      )}
    </div>
  )
}
