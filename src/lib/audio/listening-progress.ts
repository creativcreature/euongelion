/**
 * Where the reader stopped — on this device, and on their account.
 *
 * Two stores, deliberately. `localStorage` is the fast local cache: it answers
 * instantly, works offline, and is the only store a signed-out reader has
 * (SA-060 makes device preferences the one thing kept without an account —
 * a position is not authored content). `listening_progress` (migration 018) is
 * the shared truth that lets a reading started on a phone finish on a laptop.
 *
 * The write cadence matters more than it looks. The previous implementation
 * wrote every 5s, which is fine for localStorage and punishing for a database
 * on Cloudflare Workers, where each request gets 10ms of CPU. Server writes are
 * throttled to one per 30s while playing and flushed on the events that
 * actually matter — pause, seek, end, and the page going away.
 */

const RESUME_KEY = 'euangelion:narration-position'
/** At most one server write per this interval while playing. */
const THROTTLE_MS = 30_000

export interface PositionRow {
  seconds: number
  /** Epoch ms of the write. This is what resolves cross-device conflicts. */
  at: number
}

type StoredPositions = Record<string, PositionRow | number>

function readAll(): StoredPositions {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(RESUME_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as StoredPositions
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    // Corrupt or unavailable storage. A lost position is a lost convenience,
    // never an error worth surfacing to someone mid-reading.
    return {}
  }
}

/**
 * This device's stored position for a devotional.
 *
 * Handles the legacy shape — `{ slug: seconds }`, written before timestamps
 * existed — by reporting it with `at: 0`, i.e. the oldest possible write. A
 * reader upgrading mid-devotional keeps their place, and any timestamped write
 * from any device correctly wins over it.
 */
export function readLocalPosition(slug: string): PositionRow | null {
  const row = readAll()[slug]
  if (typeof row === 'number') {
    return Number.isFinite(row) ? { seconds: row, at: 0 } : null
  }
  if (row && typeof row.seconds === 'number' && Number.isFinite(row.seconds)) {
    return { seconds: row.seconds, at: typeof row.at === 'number' ? row.at : 0 }
  }
  return null
}

export function writeLocalPosition(slug: string, seconds: number): void {
  if (typeof window === 'undefined') return
  try {
    const all = readAll()
    all[slug] = { seconds, at: Date.now() }
    window.localStorage.setItem(RESUME_KEY, JSON.stringify(all))
  } catch {
    // Storage full or blocked (private mode). Playback is unaffected.
  }
}

/**
 * Decide between this device's position and the account's.
 *
 * NEWEST WINS, never furthest. Taking `max(seconds)` is the obvious
 * implementation and it is wrong: a reader who deliberately restarts a reading
 * on their phone would be yanked back to wherever their laptop stopped, with
 * no way to tell why. A tie goes to the server, which is the shared truth.
 */
export function resolvePosition(
  local: PositionRow | null,
  server: PositionRow | null,
): number | null {
  if (!local && !server) return null
  if (!local) return server!.seconds
  if (!server) return local.seconds
  return server.at >= local.at ? server.seconds : local.seconds
}

/**
 * The account's position, or null.
 *
 * Null covers three cases on purpose — signed out, never played, and migration
 * 018 not yet applied. None of them is an error: each means "nothing to resume
 * from the account", and resume falls back to this device.
 */
export async function fetchServerPosition(
  slug: string,
): Promise<PositionRow | null> {
  try {
    const response = await fetch(
      `/api/listening-progress?devotionalSlug=${encodeURIComponent(slug)}`,
      { cache: 'no-store' },
    )
    if (!response.ok) return null
    const payload = (await response.json()) as {
      progress?: { positionSeconds?: number; lastPlayedAt?: string } | null
    }
    const row = payload.progress
    if (!row || typeof row.positionSeconds !== 'number') return null
    const at = row.lastPlayedAt ? Date.parse(row.lastPlayedAt) : 0
    return {
      seconds: row.positionSeconds,
      at: Number.isFinite(at) ? at : 0,
    }
  } catch {
    // Offline, or the route is unreachable. The local cache still resumes.
    return null
  }
}

/**
 * Last server write per slug.
 *
 * Keyed by slug, not module-global. A single shared timestamp meant the
 * throttle leaked across readings: finish one devotional and open another
 * inside 30s, and the new one's first write was swallowed by the previous
 * one's window — so the position a reader most expects to be kept, the one
 * they just moved to, was the one most likely to be dropped. Queues make this
 * worse rather than better, because they move between slugs constantly.
 */
const lastPushAt = new Map<string, number>()

/** Reset between tests. Not used in the app. */
export function __resetThrottle(): void {
  lastPushAt.clear()
}

/**
 * Record progress. Always writes locally; writes to the account at most once
 * per 30s unless `flush` is set.
 */
export function pushPosition(params: {
  slug: string
  seconds: number
  duration: number
  /** Seconds of real playback since the last push, for `seconds_listened`. */
  listenedDelta: number
  ended?: boolean
  flush?: boolean
}): void {
  writeLocalPosition(params.slug, params.seconds)

  const now = Date.now()
  const since = now - (lastPushAt.get(params.slug) ?? 0)
  if (!params.flush && since < THROTTLE_MS) return
  lastPushAt.set(params.slug, now)

  const payload = JSON.stringify({
    devotionalSlug: params.slug,
    positionSeconds: params.seconds,
    durationSeconds: params.duration,
    listenedDelta: Math.max(0, params.listenedDelta),
    ended: params.ended ?? false,
  })

  // On unload only sendBeacon survives — a fetch is cancelled along with the
  // page, which is exactly the moment the position matters most.
  if (
    params.flush &&
    typeof navigator !== 'undefined' &&
    typeof navigator.sendBeacon === 'function'
  ) {
    try {
      navigator.sendBeacon(
        '/api/listening-progress',
        new Blob([payload], { type: 'application/json' }),
      )
      return
    } catch {
      // fall through to fetch
    }
  }

  void fetch('/api/listening-progress', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // The local cache already holds it, so this device still resumes. A failed
    // sync is not worth interrupting a reading to report.
  })
}
