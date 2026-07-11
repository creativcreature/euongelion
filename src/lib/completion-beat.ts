'use client'

/**
 * Completion beat — F-066 (SA-025, guilt-free momentum hybrid, surface A).
 *
 * One reverent end-of-session moment after a reader marks a day complete:
 * a short benediction line, a breath, an implicit "come back tomorrow."
 * Anchor: Headspace's restrained post-session quote — explicitly NOT
 * confetti, NOT a counter, NOT praise-for-performance.
 *
 * The trigger is an event so the beat decouples from either reader's
 * completion mechanics:
 *  - the wake-up/catalog reader already dispatches `progressUpdated`
 *    (markDevotionalComplete in src/lib/progress.ts) — CompletionBeat
 *    listens for it directly;
 *  - the Daily Bread plan reader completes server-side with no window
 *    event, so it calls signalCompletionBeat() at its completion point,
 *    passing the day's scripture reference when it has one.
 *
 * Brand-voice contract for the lines (docs/PUBLIC-FACING-LANGUAGE.md):
 * plain, warm, honest; no exclamation marks, no gamified praise, no
 * counts, no streak framing. Enforced by tests.
 */

export const COMPLETION_BEAT_EVENT = 'euangelion:completion-beat'

export interface CompletionBeatDetail {
  /** The day's scripture reference, when cheaply available at the trigger. */
  scriptureReference?: string
}

export const BENEDICTION_LINES: readonly string[] = [
  'It is enough for today.',
  'Go gently. Come back tomorrow.',
  'Nothing more is asked of you today.',
  'Let it settle. Tomorrow will keep.',
  'You came. That was the practice.',
  'The word keeps working after the page is closed.',
  'Rest now. The bread will be here in the morning.',
]

/**
 * Rotate the benediction by day-of-year: stable within a day (a reader who
 * completes two readings hears the same word, not a slot machine), and it
 * quietly turns over each morning.
 */
export function benedictionForDate(date: Date = new Date()): string {
  const startOfYear = Date.UTC(date.getFullYear(), 0, 1)
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const dayOfYear = Math.floor((today - startOfYear) / 86_400_000)
  return BENEDICTION_LINES[dayOfYear % BENEDICTION_LINES.length]
}

/** Announce a completion so a mounted CompletionBeat can offer the moment. */
export function signalCompletionBeat(detail: CompletionBeatDetail = {}): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(COMPLETION_BEAT_EVENT, { detail }))
}
