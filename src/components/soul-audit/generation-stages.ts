/**
 * generation-stages — the honest stage mapping for the held-moment
 * generation interstitial (pattern doc §6/§7, SA-024/SA-025).
 *
 * The approved narration — "Reading what you wrote… composing your arc…
 * selecting passages… setting the type" — is bound to REAL job
 * transitions reported by /api/soul-audit/select/status. A row checks
 * ONLY when the underlying server state proves its stage completed
 * (Dev Rule #1 applied to motion). Nothing here is timer-driven.
 *
 * The real, observable pipeline events (see select/status/route.ts and
 * generation-runner.ts):
 *
 *  E1  first 200 poll — the job record exists. It already carries the
 *      theme + Scripture anchor DERIVED FROM the reader's words at
 *      submit/select time, so "Reading what you wrote" has provably
 *      completed.
 *  E2  the runner writes progress "Composing day N of 7..." — the
 *      seven-day arc is fixed (plan skeleton, theme, anchor, day count)
 *      and drafting has begun: "Composing your arc" is done.
 *  E3  current_day >= 1 — Day 1 is SAVED, its Scripture locked in:
 *      "Selecting passages" is done.
 *  E4  the poll returns a route — Day 1 is typeset and readable:
 *      "Setting the type" is done. Arrival.
 *
 * If a poll lands after several events (e.g. resuming a mid-flight job),
 * every earlier row checks at once — they really did complete. Rows
 * never check ahead of the server, and never un-check (the component
 * ratchets the count).
 */

export type GenerationJobStatus =
  | 'pending'
  | 'generating'
  | 'complete'
  | 'error'
  | 'stalled'

export interface GenerationStatusSnapshot {
  status: GenerationJobStatus
  progress: string | null
  currentDay: number | null
  totalDays: number
  route: string | null
}

export const GENERATION_STAGES = [
  { key: 'reading', label: 'Reading what you wrote' },
  { key: 'arc', label: 'Composing your arc' },
  { key: 'passages', label: 'Selecting passages' },
  { key: 'type', label: 'Setting the type' },
] as const

export type GenerationStageKey = (typeof GENERATION_STAGES)[number]['key']

/** Secondary sub-lines the ACTIVE stage may cycle (explicitly allowed by
 *  §6: "long stages may cycle secondary sub-lines"). Flavor only — they
 *  never claim completion. */
export const STAGE_SUBLINES: Record<GenerationStageKey, readonly string[]> = {
  reading: ['Weighing every word you gave us…'],
  arc: [
    'Searching the Scriptures for your situation…',
    'Reading the commentaries…',
    'Consulting the older voices — Augustine, à Kempis, Spurgeon…',
  ],
  passages: [
    'Laying the day’s passage in place…',
    'Reading it back, line by line…',
  ],
  type: ['Inking the first page…', 'Checking the registration…'],
}

/** True when the runner has reported that day composition began/advanced. */
function hasCompositionSignal(snapshot: GenerationStatusSnapshot): boolean {
  const progress = snapshot.progress ?? ''
  return (
    /composing day\s+\d+/i.test(progress) ||
    /day\s+\d+\s+of\s+\d+\s+complete/i.test(progress) ||
    /all\s+\d+\s+days generated/i.test(progress) ||
    (snapshot.currentDay ?? 0) >= 1
  )
}

/**
 * How many stages have COMPLETED, per the real server snapshot.
 * `null` = no successful poll yet — nothing may check.
 */
export function completedStageCount(
  snapshot: GenerationStatusSnapshot | null,
): number {
  if (!snapshot) return 0

  // E4 — route open (or job complete): everything is done.
  if (snapshot.route || snapshot.status === 'complete') {
    return GENERATION_STAGES.length
  }

  // E1 — the job exists (this snapshot is proof).
  let count = 1

  // E2 — composition signal from the runner.
  if (hasCompositionSignal(snapshot)) count = 2

  // E3 — Day 1 saved.
  if ((snapshot.currentDay ?? 0) >= 1) count = 3

  return count
}

/** The index of the stage in progress (== first unchecked row). */
export function activeStageIndex(completedCount: number): number {
  return Math.min(Math.max(completedCount, 0), GENERATION_STAGES.length - 1)
}

// ---------------------------------------------------------------------------
// Arrival echo — quote with consent cue (§7.6, founder-resolved)
// ---------------------------------------------------------------------------

export interface ArrivalEchoInput {
  /**
   * The reader's own words — ONLY when they typed them in THIS tab
   * session (the sessionStorage marker written at submit). Resumed /
   * fresh-tab arrivals must pass null.
   */
  typedThisSession: string | null
  /** The chosen direction's title (theme). */
  theme: string | null
  /** The chosen direction's Scripture anchor (e.g. "Matthew 11:28"). */
  scriptureAnchor: string | null
}

export interface ArrivalEcho {
  kind: 'quote' | 'abstract'
  /** Clamped quote of the reader's words — null unless kind === 'quote'. */
  quote: string | null
  statement: string
}

const QUOTE_MAX_CHARS = 140

/** Clamp on a word boundary; append an ellipsis only when truncated. */
export function clampQuote(text: string, maxChars = QUOTE_MAX_CHARS): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxChars) return normalized
  const cut = normalized.slice(0, maxChars + 1)
  const lastSpace = cut.lastIndexOf(' ')
  const clamped = (
    lastSpace > maxChars * 0.6
      ? cut.slice(0, lastSpace)
      : cut.slice(0, maxChars)
  ).trimEnd()
  return `${clamped}…`
}

/**
 * The consent-cue echo rule:
 *  - words typed THIS session → quote them back, verbatim (clamped).
 *  - otherwise → abstract but SPECIFIC: name the theme and the Scripture
 *    anchor. Never the generic "based on your input".
 */
export function resolveArrivalEcho(input: ArrivalEchoInput): ArrivalEcho {
  const typed = input.typedThisSession?.trim() || null
  const theme = input.theme?.trim() || null
  const anchor = input.scriptureAnchor?.trim() || null

  if (typed) {
    return {
      kind: 'quote',
      quote: clampQuote(typed),
      statement: 'Your seven days were composed for this.',
    }
  }

  if (theme && anchor) {
    return {
      kind: 'abstract',
      quote: null,
      statement: `Composed for what you named — ${theme}, anchored in ${anchor}.`,
    }
  }
  if (theme) {
    return {
      kind: 'abstract',
      quote: null,
      statement: `Composed for what you named — ${theme}.`,
    }
  }
  if (anchor) {
    return {
      kind: 'abstract',
      quote: null,
      statement: `Composed for you, anchored in ${anchor}.`,
    }
  }
  // No stored theme or anchor survived the round trip (should not happen —
  // the hold carries both). Still honest, still specific about WHAT this
  // is; never "based on your input".
  return {
    kind: 'abstract',
    quote: null,
    statement: 'Composed for you today — written fresh, not fetched.',
  }
}
