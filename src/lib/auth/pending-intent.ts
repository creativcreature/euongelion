import type { LibraryIntent } from '@/stores/devotionalLibraryStore'

/**
 * The action a reader reached for while signed out, held across the sign-in
 * redirect so it can complete when they come back.
 *
 * "Locked, not hidden" (SA-062) is only honest if the lock actually opens. A
 * reader who highlights a line, signs in, and lands on an unmarked page has
 * been told their work was kept and then shown otherwise.
 *
 * Four rules, from the standard pending-intent hazards:
 *
 * 1. ONE SHOT. Reading consumes. An intent that can replay twice is a bug the
 *    second time — Android's `FLAG_ONE_SHOT` exists for exactly this, and the
 *    same reasoning applies to a redirect round-trip.
 * 2. EPHEMERAL. `sessionStorage`, not `localStorage`: the intent should die
 *    with the tab. Replaying something a reader reached for last Tuesday is
 *    surprising in a way that reads as a bug.
 * 3. EXPIRES. Ten minutes. Long enough to find an email and click a link;
 *    short enough that an abandoned tab does not act on its own later.
 * 4. CREATION ONLY. A redirect is an untrusted boundary — the app cannot know
 *    the reader completed it deliberately. Replaying `save` or `highlight`
 *    creates something they can undo. Replaying `unsave`, `restart_archive` or
 *    a delete destroys something they cannot. Only additive intents survive.
 *
 * Note what is deliberately NOT stored: the text of a journal entry. Religious
 * belief is special-category data under GDPR Art. 9, and the security guidance
 * on redirect flows is not to carry sensitive payloads through the front
 * channel. A `journal` intent therefore replays by REOPENING the field, not by
 * resending what was written.
 */

const KEY = 'euangelion:pending-intent'
const TTL_MS = 10 * 60_000

/** Additive only. See rule 4 — this list is a safety boundary, not a filter. */
const REPLAYABLE: ReadonlyArray<LibraryIntent['kind']> = [
  'save',
  'start',
  'highlight',
  'journal',
]

export interface PendingIntent {
  intent: LibraryIntent
  /** Where it was captured. Replay only happens back on the same page. */
  path: string
  at: number
}

export function isReplayable(intent: LibraryIntent): boolean {
  return REPLAYABLE.includes(intent.kind)
}

/** Remember an intent across the sign-in round trip. */
export function capturePendingIntent(
  intent: LibraryIntent,
  path: string,
): void {
  if (typeof window === 'undefined') return
  if (!isReplayable(intent)) return
  try {
    const payload: PendingIntent = { intent, path, at: Date.now() }
    window.sessionStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    // Storage blocked (private mode). The reader still signs in; they just
    // repeat the gesture, which is the pre-SA-062 behaviour and not a failure.
  }
}

/**
 * Take the pending intent, if one is due on this path.
 *
 * ALWAYS clears, even when it declines to return the intent — a stale or
 * mismatched entry left behind would fire on some later page.
 */
export function consumePendingIntent(path: string): LibraryIntent | null {
  if (typeof window === 'undefined') return null
  let raw: string | null = null
  try {
    raw = window.sessionStorage.getItem(KEY)
    if (raw) window.sessionStorage.removeItem(KEY)
  } catch {
    return null
  }
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as PendingIntent
    if (!parsed?.intent || typeof parsed.at !== 'number') return null
    if (Date.now() - parsed.at > TTL_MS) return null
    if (parsed.path !== path) return null
    if (!isReplayable(parsed.intent)) return null
    return parsed.intent
  } catch {
    return null
  }
}

/** Drop any pending intent — used when the reader cancels sign-in. */
export function clearPendingIntent(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    // nothing to do
  }
}
