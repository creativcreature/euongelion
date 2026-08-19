import type { DevotionalProgress } from '@/types'
import { completionsMissingFrom, unionCompletions } from './completion-merge'

/**
 * Reading progress that follows the reader instead of the browser.
 *
 * Until this existed, finishing a devotional wrote to `localStorage` and
 * nowhere else: a new phone, a cleared cache, or a second browser started the
 * reader back at zero with no way to recover what they had read. It was the
 * largest single answer to "why would I sign in?" that the product did not
 * have. `user_progress` (migration 004, made slug-keyed by 019) is the shared
 * copy; this module reconciles it with the device.
 *
 * WHAT LIVES WHERE, deliberately:
 *   - the DEVICE stores are still the fast path and the only store a
 *     signed-out reader has. Nothing here replaces them, and nothing here runs
 *     for a signed-out reader.
 *   - this module is transport plus policy. It does not own either local
 *     store, which is why it takes local completions as an argument and hands
 *     merged ones back through the caller's callbacks rather than importing
 *     `lib/progress.ts` — that module imports THIS one to push a completion,
 *     and a cycle between them would be a real hazard for a browser-only pair
 *     like this.
 *
 * FAILURES ARE SURFACED, never swallowed. A failed push logs a structured line
 * and announces `READING_PROGRESS_SYNC_FAILED` on the window, exactly as
 * `advanceActiveDayAfterCompletion` does for the active day. The local
 * completion still stands, so nothing the reader did is lost — but the app can
 * tell them their progress did not reach their account rather than pretending
 * it did.
 */

/** Dispatched when progress could not be synced. Surfaced, never swallowed. */
export const READING_PROGRESS_SYNC_FAILED = 'readingProgressSyncFailed'

/**
 * Dispatched after account progress is merged into this device, so open
 * surfaces can refresh.
 *
 * NOT `progressUpdated`: that event means "you just finished something" and
 * CompletionBeat answers it with a benediction. Firing it for a background
 * reconcile would congratulate the reader on app load for a devotional they
 * finished last week on another device.
 */
export const READING_PROGRESS_MERGED = 'readingProgressMerged'

/**
 * What the last account read learned. Both false means "not asked yet", and
 * every write path FAILS CLOSED on that: a POST that goes out before auth is
 * known would 401 for most readers, and the reconcile on the next app load
 * picks up anything a skipped push left behind.
 */
let accountKnown = false
let hasAccount = false

/** Test seam — module-level state outlives a render, as in ReaderContext. */
export function __resetReadingProgressSync(): void {
  accountKnown = false
  hasAccount = false
}

interface AccountPayload {
  signedIn?: boolean
  pendingMigration?: boolean
  /** Which account this progress belongs to — the owner check needs it. */
  userId?: string
  progress?: Array<{
    devotionalSlug?: string
    completedAt?: string
    timeSpentSeconds?: number | null
  }> | null
}

export type AccountFetch =
  | { status: 'signed-out' }
  /** Signed in, but migration 019 is not applied. Nothing can be stored yet. */
  | { status: 'pending-migration' }
  | { status: 'ok'; userId: string; completions: DevotionalProgress[] }
  | { status: 'failed'; error: unknown }

export type SyncOutcome =
  | { status: 'signed-out' }
  | { status: 'pending-migration' }
  | { status: 'synced'; completions: DevotionalProgress[]; pushed: number }
  /** A different account signed in. Local was replaced; nothing was pushed. */
  | { status: 'replaced'; completions: DevotionalProgress[] }
  /** The account merged down and STAYS merged; the backfill up failed. */
  | {
      status: 'push-failed'
      completions: DevotionalProgress[]
      pushed: number
      error: unknown
    }
  | { status: 'failed'; error: unknown }

export type PushOutcome =
  | { status: 'saved' }
  | { status: 'not-applicable'; reason: string }
  | { status: 'failed'; error: unknown }

/**
 * How `reconcileReadingProgress` hands device state back to its owner. The
 * callbacks run inside the reconcile — merged state is applied BEFORE the
 * backfill pushes go out, so a failed push can never take the merge with it.
 */
export interface ReconcileOptions {
  /**
   * The account this device's completions last synced with, from the persisted
   * owner stamp. Null means the device has never synced — the first signed-in
   * reconcile claims ownership and backfills.
   */
  ownerId: string | null
  /** Apply the merged union to the device stores and re-stamp the owner. */
  onMerged: (completions: DevotionalProgress[], userId: string) => void
  /**
   * A DIFFERENT account signed in on this device. Replace local state with the
   * account's — no union, the previous reader's history must not leak — and
   * re-stamp the owner.
   */
  onReplaced: (completions: DevotionalProgress[], userId: string) => void
}

function report(evt: string, detail: Record<string, unknown>, error: unknown) {
  console.error(
    JSON.stringify({
      evt,
      ...detail,
      message: error instanceof Error ? error.message : String(error),
    }),
  )
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(READING_PROGRESS_SYNC_FAILED, { detail }),
    )
  }
}

function toCompletions(payload: AccountPayload): DevotionalProgress[] {
  const rows = payload.progress ?? []
  const completions: DevotionalProgress[] = []
  for (const row of rows) {
    if (!row?.devotionalSlug || !row.completedAt) continue
    completions.push({
      slug: row.devotionalSlug,
      completedAt: row.completedAt,
      timeSpent:
        typeof row.timeSpentSeconds === 'number'
          ? row.timeSpentSeconds
          : undefined,
    })
  }
  return completions
}

/**
 * Everything the account has recorded.
 *
 * The GET answers 200 for a signed-out reader, so this one request settles
 * both questions the module needs — is there an account, and what does it
 * know — without a second auth probe.
 */
export async function fetchAccountCompletions(): Promise<AccountFetch> {
  try {
    const response = await fetch('/api/reading-progress', {
      cache: 'no-store',
      credentials: 'same-origin',
    })
    if (response.status === 401 || response.status === 403) {
      accountKnown = true
      hasAccount = false
      return { status: 'signed-out' }
    }
    if (!response.ok) {
      throw new Error(`GET /api/reading-progress ${response.status}`)
    }

    const payload = (await response.json()) as AccountPayload
    if (payload.signedIn === false) {
      accountKnown = true
      hasAccount = false
      return { status: 'signed-out' }
    }

    accountKnown = true
    hasAccount = true

    if (payload.pendingMigration) {
      return { status: 'pending-migration' }
    }
    if (typeof payload.userId !== 'string' || !payload.userId) {
      // The signed-in contract carries the account id; without it the owner
      // check in `reconcileReadingProgress` cannot run, and merging or
      // backfilling blind is exactly the cross-account hazard it prevents.
      throw new Error(
        'GET /api/reading-progress answered signed-in without a userId',
      )
    }
    return {
      status: 'ok',
      userId: payload.userId,
      completions: toCompletions(payload),
    }
  } catch (error) {
    // On a transport failure auth stays UNKNOWN, so nothing is pushed blind.
    // (A malformed signed-in payload lands here too — the session itself is
    // real, so single-completion pushes may still go out, but the reconcile's
    // merge and owner check refuse to run without the account id.)
    report('reading_progress.fetch_failed', {}, error)
    return { status: 'failed', error }
  }
}

/**
 * Record one finished devotional against the account.
 *
 * Fire-and-forget from the caller's point of view — `markDevotionalComplete`
 * does not await it, because a reader who has just finished a reading should
 * not wait on a network round trip to see it marked. The failure is still
 * reported.
 */
export async function pushReadingCompletion(
  entry: DevotionalProgress,
): Promise<PushOutcome> {
  if (typeof window === 'undefined') {
    return { status: 'not-applicable', reason: 'server' }
  }
  if (!accountKnown) {
    // Fails closed. The reconcile on the next load pushes this.
    return { status: 'not-applicable', reason: 'auth-unknown' }
  }
  if (!hasAccount) {
    return { status: 'not-applicable', reason: 'signed-out' }
  }

  try {
    const response = await fetch('/api/reading-progress', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        devotionalSlug: entry.slug,
        completedAt: entry.completedAt,
        timeSpentSeconds: entry.timeSpent,
      }),
      keepalive: true,
    })
    if (response.status === 401 || response.status === 403) {
      // The session ended mid-visit. Stop pushing rather than repeating a
      // request that cannot succeed; the next load re-establishes the truth.
      hasAccount = false
      return { status: 'not-applicable', reason: 'signed-out' }
    }
    if (!response.ok) {
      throw new Error(`POST /api/reading-progress ${response.status}`)
    }
    // A 2xx is not proof of storage. The route answers 200 with
    // `progress: null` when migration 019 is pending and nothing was written;
    // trusting the status line alone would report "saved" for a write that
    // never happened — the exact silent fallback this module exists to avoid.
    const payload = (await response.json()) as {
      progress?: unknown
      pendingMigration?: boolean
    }
    if (payload.pendingMigration || !payload.progress) {
      throw new Error(
        payload.pendingMigration
          ? 'POST /api/reading-progress stored nothing (migration 019 pending)'
          : 'POST /api/reading-progress answered 200 without a stored row',
      )
    }
    return { status: 'saved' }
  } catch (error) {
    report('reading_progress.push_failed', { slug: entry.slug }, error)
    return { status: 'failed', error }
  }
}

/**
 * Reconcile this device against the account, in both directions.
 *
 * THE OWNER CHECK COMES FIRST. `ownerId` is the account these local
 * completions last synced with. When a DIFFERENT account signs in on this
 * device — a shared computer, a household tablet — backfilling the local
 * history would write the previous reader's completions into the new reader's
 * account. So an owner mismatch pushes nothing: the device adopts the
 * account's state via `onReplaced` and the caller re-stamps. A null owner is a
 * device that has never synced; it claims ownership and backfills, which is
 * the ordinary first-sign-in path.
 *
 * THE READ DIRECTION COMES BEFORE THE WRITE DIRECTION. The merged server
 * state is handed to `onMerged` before any backfill push goes out: the merge
 * has already succeeded, and a later push failure is reported as its own
 * outcome (`push-failed`) with the merge left standing rather than discarded.
 *
 * The push loop is sequential and stops at the first failure: a device holding
 * a long history should not fire a hundred parallel writes at a Worker with
 * 10ms of CPU per request, and once one write is failing the rest will too.
 * What did not get pushed is still local, and the next load tries again.
 */
export async function reconcileReadingProgress(
  local: readonly DevotionalProgress[],
  options: ReconcileOptions,
): Promise<SyncOutcome> {
  const fetched = await fetchAccountCompletions()
  if (fetched.status === 'signed-out') return { status: 'signed-out' }
  if (fetched.status === 'failed') {
    return { status: 'failed', error: fetched.error }
  }
  if (fetched.status === 'pending-migration') {
    // Nothing can be stored until migration 019 is applied. Pushing anyway
    // would re-send the reader's whole history on every load for nothing.
    return { status: 'pending-migration' }
  }

  if (options.ownerId !== null && options.ownerId !== fetched.userId) {
    options.onReplaced(fetched.completions, fetched.userId)
    return { status: 'replaced', completions: fetched.completions }
  }

  const merged = unionCompletions(local, fetched.completions)
  const missing = completionsMissingFrom(local, fetched.completions)

  options.onMerged(merged, fetched.userId)

  let pushed = 0
  for (const entry of missing) {
    const outcome = await pushReadingCompletion(entry)
    if (outcome.status === 'saved') {
      pushed += 1
      continue
    }
    if (outcome.status === 'failed') {
      return {
        status: 'push-failed',
        completions: merged,
        pushed,
        error: outcome.error,
      }
    }
    // not-applicable — the session ended mid-backfill. Stop here.
    break
  }

  return { status: 'synced', completions: merged, pushed }
}
