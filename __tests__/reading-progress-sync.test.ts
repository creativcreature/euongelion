/**
 * Audit M5 — reading progress that follows the reader, not the browser.
 *
 * Finishing a devotional used to write to `localStorage` and nowhere else, so
 * a new phone or a cleared cache started someone back at zero. `user_progress`
 * has been in the schema since migration 004 and no code has ever touched it.
 *
 * Five things are worth pinning, because each is a place the obvious
 * implementation is wrong:
 *
 *  - READING is 200 with `progress: null` when signed out, not 401. Most page
 *    loads are signed out; answering 401 would log a failure on all of them.
 *    WRITING requires an account (SA-060), like every other save-state route.
 *  - the merge is a UNION IN BOTH DIRECTIONS. Completion is monotone — nobody
 *    un-finishes a devotional — so "latest wins" (right for an audio position)
 *    would silently delete history here.
 *  - a completion posts only when the account is KNOWN to exist. Failing open
 *    would fire a 401 on every reading for every signed-out reader.
 *  - a push trusts the response BODY, not the status line. The route answers
 *    200 with `progress: null` when migration 019 is pending, and calling
 *    that "saved" would be a silent fallback.
 *  - the OWNER STAMP guards a shared device. When a different account signs
 *    in, the previous reader's local history is replaced, never pushed.
 *
 * Handlers are exercised directly rather than over HTTP, matching
 * `listening-progress-route.test.ts`. That makes these a contract test, NOT a
 * substitute for the workerd run dev rule #9 requires before deploy.
 */
import { cleanup, render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DevotionalProgress } from '@/types'

const getUser = vi.fn()
const listReadingProgress = vi.fn()
const upsertReadingCompletion = vi.fn()
const logApiFailure = vi.fn()

vi.mock('@/lib/auth', () => ({ getUser: () => getUser() }))
vi.mock('@/lib/reading/reading-progress-repository', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/reading/reading-progress-repository')
  >('@/lib/reading/reading-progress-repository')
  return {
    isPendingReadingProgressMigration: actual.isPendingReadingProgressMigration,
    listReadingProgress: (...a: unknown[]) => listReadingProgress(...a),
    upsertReadingCompletion: (...a: unknown[]) => upsertReadingCompletion(...a),
  }
})
vi.mock('@/lib/observability/api-failure', () => ({
  logApiFailure: (...a: unknown[]) => logApiFailure(...a),
}))

const { GET, POST } = await import('@/app/api/reading-progress/route')
const { unionCompletions, completionsMissingFrom } =
  await import('@/lib/reading/completion-merge')
const {
  __resetReadingProgressSync,
  fetchAccountCompletions,
  pushReadingCompletion,
  reconcileReadingProgress,
} = await import('@/lib/reading/reading-progress-sync')
const {
  getProgress,
  markDevotionalComplete,
  mergeLocalCompletions,
  replaceLocalCompletions,
} = await import('@/lib/progress')
const { useProgressStore } = await import('@/stores/progressStore')
const { default: ReadingProgressSync } =
  await import('@/components/ReadingProgressSync')

/** Minimal stand-in for the NextRequest surface the handlers actually touch. */
const getRequest = () =>
  ({
    method: 'GET',
    nextUrl: new URL('http://localhost/api/reading-progress'),
    headers: new Headers(),
  }) as never

const postRequest = (body: unknown) =>
  ({
    method: 'POST',
    nextUrl: new URL('http://localhost/api/reading-progress'),
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as never

/** What the route's POST answers when the row genuinely landed. */
const storedRow = (slug: string) => ({
  ok: true,
  progress: {
    devotionalSlug: slug,
    completedAt: '2026-08-18T00:00:00.000Z',
    timeSpentSeconds: null,
  },
})

const postsOf = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.filter(
    ([, init]) => (init as RequestInit | undefined)?.method === 'POST',
  )

beforeEach(() => {
  getUser.mockReset()
  listReadingProgress.mockReset()
  upsertReadingCompletion.mockReset()
  logApiFailure.mockReset()
  localStorage.clear()
  __resetReadingProgressSync()
  useProgressStore.setState({
    completions: [],
    seriesStartDates: {},
    syncOwnerId: null,
  })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// The route contract
// ---------------------------------------------------------------------------

describe('GET /api/reading-progress', () => {
  it('answers 200 with progress:null when signed out', async () => {
    getUser.mockResolvedValue(null)
    const response = await GET(getRequest())
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      signedIn: false,
      progress: null,
    })
    expect(listReadingProgress).not.toHaveBeenCalled()
  })

  it('returns the account rows AND the account id for a signed-in reader', async () => {
    getUser.mockResolvedValue({ id: 'user-1' })
    listReadingProgress.mockResolvedValue([
      {
        devotionalSlug: 'jabez-day-1',
        completedAt: '2026-08-01T09:00:00.000Z',
        timeSpentSeconds: 240,
      },
    ])
    const response = await GET(getRequest())
    expect(response.status).toBe(200)
    // `userId` is load-bearing: the client's owner stamp compares against it
    // to notice a different account signing in on a shared device.
    await expect(response.json()).resolves.toMatchObject({
      signedIn: true,
      userId: 'user-1',
      progress: [{ devotionalSlug: 'jabez-day-1' }],
    })
  })

  it('degrades to on-device progress when migration 019 is pending', async () => {
    getUser.mockResolvedValue({ id: 'user-1' })
    listReadingProgress.mockRejectedValue({
      code: '42703',
      message: 'column user_progress.devotional_slug does not exist',
    })

    const response = await GET(getRequest())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      progress: null,
      pendingMigration: true,
    })
    // Degraded, but VISIBLE — the line between a documented fallback and a
    // silent one.
    expect(logApiFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'CONFIG_FEATURE_DISABLED',
        context: expect.objectContaining({
          migration: '019_user_progress_by_slug',
        }),
      }),
    )
  })
})

describe('POST /api/reading-progress', () => {
  it('requires an account', async () => {
    getUser.mockResolvedValue(null)
    const response = await POST(postRequest({ devotionalSlug: 'jabez-day-1' }))
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      code: 'AUTH_REQUIRED_SAVE_STATE',
    })
    expect(upsertReadingCompletion).not.toHaveBeenCalled()
  })

  it('rejects an unsafe slug', async () => {
    getUser.mockResolvedValue({ id: 'user-1' })
    const response = await POST(postRequest({ devotionalSlug: '../../etc/pw' }))
    expect(response.status).toBe(400)
    expect(upsertReadingCompletion).not.toHaveBeenCalled()
  })

  it('refuses a future completion date, so a wrong clock cannot pin one', async () => {
    getUser.mockResolvedValue({ id: 'user-1' })
    upsertReadingCompletion.mockResolvedValue({
      devotionalSlug: 'jabez-day-1',
      completedAt: '2026-08-18T00:00:00.000Z',
      timeSpentSeconds: null,
    })

    await POST(
      postRequest({
        devotionalSlug: 'jabez-day-1',
        completedAt: '2099-01-01T00:00:00.000Z',
      }),
    )

    const sent = upsertReadingCompletion.mock.calls[0][0] as {
      completedAt: string
    }
    expect(Date.parse(sent.completedAt)).toBeLessThanOrEqual(Date.now())
  })

  it('clamps an implausible reading time instead of losing the completion', async () => {
    getUser.mockResolvedValue({ id: 'user-1' })
    upsertReadingCompletion.mockResolvedValue({
      devotionalSlug: 'jabez-day-1',
      completedAt: '2026-08-18T00:00:00.000Z',
      timeSpentSeconds: 3600,
    })

    // A tab left open overnight, not eight hours of reading.
    await POST(
      postRequest({ devotionalSlug: 'jabez-day-1', timeSpentSeconds: 28_800 }),
    )

    expect(upsertReadingCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ timeSpentSeconds: 3600 }),
    )
  })
})

// ---------------------------------------------------------------------------
// The merge rule
// ---------------------------------------------------------------------------

describe('unionCompletions', () => {
  const device = [
    { slug: 'jabez-day-1', completedAt: '2026-08-01T09:00:00.000Z' },
    { slug: 'jabez-day-2', completedAt: '2026-08-02T09:00:00.000Z' },
  ]
  const account = [
    { slug: 'jabez-day-2', completedAt: '2026-08-02T21:00:00.000Z' },
    { slug: 'jabez-day-3', completedAt: '2026-08-03T09:00:00.000Z' },
  ]

  it('keeps everything both sides know, whichever way round', () => {
    const forward = unionCompletions(device, account).map((p) => p.slug)
    const backward = unionCompletions(account, device).map((p) => p.slug)
    expect(forward).toEqual(['jabez-day-1', 'jabez-day-2', 'jabez-day-3'])
    expect(backward).toEqual(forward)
  })

  it('keeps the earlier completion date for a day both sides know', () => {
    // A device syncing late must not rewrite Tuesday's finish to today.
    const merged = unionCompletions(device, account)
    expect(merged.find((p) => p.slug === 'jabez-day-2')?.completedAt).toBe(
      '2026-08-02T09:00:00.000Z',
    )
    const reversed = unionCompletions(account, device)
    expect(reversed.find((p) => p.slug === 'jabez-day-2')?.completedAt).toBe(
      '2026-08-02T09:00:00.000Z',
    )
  })

  it('keeps a recorded reading time from whichever side has one', () => {
    const merged = unionCompletions(
      [{ slug: 'jabez-day-1', completedAt: '2026-08-01T09:00:00.000Z' }],
      [
        {
          slug: 'jabez-day-1',
          completedAt: '2026-08-01T09:00:00.000Z',
          timeSpent: 300,
        },
      ],
    )
    expect(merged[0].timeSpent).toBe(300)
  })

  it('names exactly what one side is missing', () => {
    expect(completionsMissingFrom(device, account).map((p) => p.slug)).toEqual([
      'jabez-day-1',
    ])
    expect(completionsMissingFrom(account, device).map((p) => p.slug)).toEqual([
      'jabez-day-3',
    ])
  })
})

// ---------------------------------------------------------------------------
// The device stores' merge wiring
// ---------------------------------------------------------------------------

describe('mergeLocalCompletions (localStorage store)', () => {
  it('unions account rows into localStorage and announces the merge', () => {
    localStorage.setItem(
      'wakeup_progress',
      JSON.stringify([
        { slug: 'jabez-day-1', completedAt: '2026-08-01T09:00:00.000Z' },
      ]),
    )
    const heard: number[] = []
    const listener = (event: Event) =>
      heard.push((event as CustomEvent<{ count: number }>).detail.count)
    window.addEventListener('readingProgressMerged', listener)

    const merged = mergeLocalCompletions([
      { slug: 'jabez-day-3', completedAt: '2026-08-03T09:00:00.000Z' },
    ])

    window.removeEventListener('readingProgressMerged', listener)
    expect(merged.map((p) => p.slug)).toEqual(['jabez-day-1', 'jabez-day-3'])
    expect(getProgress().map((p) => p.slug)).toEqual([
      'jabez-day-1',
      'jabez-day-3',
    ])
    // READING_PROGRESS_MERGED, not progressUpdated — a background reconcile
    // must not trigger the completion benediction.
    expect(heard).toEqual([2])
  })

  it('replaceLocalCompletions swaps the history wholesale, no union', () => {
    localStorage.setItem(
      'wakeup_progress',
      JSON.stringify([
        {
          slug: 'previous-owner-day-1',
          completedAt: '2026-08-01T09:00:00.000Z',
        },
      ]),
    )

    const next = replaceLocalCompletions([
      { slug: 'new-owner-day-1', completedAt: '2026-08-10T09:00:00.000Z' },
    ])

    expect(next.map((p) => p.slug)).toEqual(['new-owner-day-1'])
    expect(getProgress().map((p) => p.slug)).toEqual(['new-owner-day-1'])
  })
})

describe('progressStore.mergeRemoteCompletions (zustand store)', () => {
  it('unions account rows into the store', () => {
    useProgressStore.setState({
      completions: [
        { slug: 'jabez-day-1', completedAt: '2026-08-01T09:00:00.000Z' },
      ],
    })

    useProgressStore
      .getState()
      .mergeRemoteCompletions([
        { slug: 'jabez-day-2', completedAt: '2026-08-02T09:00:00.000Z' },
      ])

    expect(useProgressStore.getState().completions.map((p) => p.slug)).toEqual([
      'jabez-day-1',
      'jabez-day-2',
    ])
  })

  it('keeps state identity when the account has nothing new', () => {
    useProgressStore.setState({
      completions: [
        { slug: 'jabez-day-1', completedAt: '2026-08-01T09:00:00.000Z' },
      ],
    })
    const before = useProgressStore.getState().completions

    useProgressStore
      .getState()
      .mergeRemoteCompletions([
        { slug: 'jabez-day-1', completedAt: '2026-08-01T09:00:00.000Z' },
      ])

    // Same reference — the rails that subscribe to `completions` must not
    // re-render on every app load.
    expect(useProgressStore.getState().completions).toBe(before)
  })

  it('replaceCompletions swaps the history and moves the owner stamp', () => {
    useProgressStore.setState({
      completions: [
        { slug: 'a-day-1', completedAt: '2026-08-01T09:00:00.000Z' },
      ],
      syncOwnerId: 'user-a',
    })

    useProgressStore
      .getState()
      .replaceCompletions(
        [{ slug: 'b-day-1', completedAt: '2026-08-10T09:00:00.000Z' }],
        'user-b',
      )

    const state = useProgressStore.getState()
    expect(state.completions.map((p) => p.slug)).toEqual(['b-day-1'])
    expect(state.syncOwnerId).toBe('user-b')
  })
})

// ---------------------------------------------------------------------------
// The reconcile
// ---------------------------------------------------------------------------

describe('reconcileReadingProgress', () => {
  it('merges the account down, claims ownership, and pushes what only this device has', async () => {
    const calls: Array<{ url: string; method: string; body?: string }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({
          url,
          method: init?.method ?? 'GET',
          body: init?.body as string | undefined,
        })
        if ((init?.method ?? 'GET') === 'GET') {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              signedIn: true,
              userId: 'user-1',
              progress: [
                {
                  devotionalSlug: 'jabez-day-3',
                  completedAt: '2026-08-03T09:00:00.000Z',
                  timeSpentSeconds: null,
                },
              ],
            }),
          }
        }
        return {
          ok: true,
          status: 200,
          json: async () => storedRow('jabez-day-1'),
        }
      }),
    )
    const onMerged = vi.fn()
    const onReplaced = vi.fn()

    const outcome = await reconcileReadingProgress(
      [{ slug: 'jabez-day-1', completedAt: '2026-08-01T09:00:00.000Z' }],
      // A device that has never synced (owner null) claims the account.
      { ownerId: null, onMerged, onReplaced },
    )

    expect(outcome.status).toBe('synced')
    if (outcome.status !== 'synced') throw new Error('unreachable')
    expect(outcome.completions.map((p) => p.slug)).toEqual([
      'jabez-day-1',
      'jabez-day-3',
    ])
    expect(outcome.pushed).toBe(1)
    expect(onMerged).toHaveBeenCalledTimes(1)
    expect(
      (onMerged.mock.calls[0][0] as DevotionalProgress[]).map((p) => p.slug),
    ).toEqual(['jabez-day-1', 'jabez-day-3'])
    expect(onMerged.mock.calls[0][1]).toBe('user-1')
    expect(onReplaced).not.toHaveBeenCalled()

    const posts = calls.filter((c) => c.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(JSON.parse(posts[0].body ?? '{}')).toMatchObject({
      devotionalSlug: 'jabez-day-1',
    })
  })

  it('does nothing at all for a signed-out reader', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, signedIn: false, progress: null }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const onMerged = vi.fn()
    const onReplaced = vi.fn()

    const outcome = await reconcileReadingProgress(
      [{ slug: 'jabez-day-1', completedAt: '2026-08-01T09:00:00.000Z' }],
      { ownerId: null, onMerged, onReplaced },
    )

    expect(outcome).toEqual({ status: 'signed-out' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(onMerged).not.toHaveBeenCalled()
    expect(onReplaced).not.toHaveBeenCalled()
  })

  it('does not re-push the whole history while migration 019 is pending', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        signedIn: true,
        progress: null,
        pendingMigration: true,
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const onMerged = vi.fn()
    const onReplaced = vi.fn()

    const outcome = await reconcileReadingProgress(
      [
        { slug: 'jabez-day-1', completedAt: '2026-08-01T09:00:00.000Z' },
        { slug: 'jabez-day-2', completedAt: '2026-08-02T09:00:00.000Z' },
      ],
      { ownerId: null, onMerged, onReplaced },
    )

    expect(outcome).toEqual({ status: 'pending-migration' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(onMerged).not.toHaveBeenCalled()
    expect(onReplaced).not.toHaveBeenCalled()
  })

  it('applies the server merge BEFORE the backfill, and keeps it when a push fails', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failed = vi.fn()
    window.addEventListener('readingProgressSyncFailed', failed)
    const sequence: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        if ((init?.method ?? 'GET') === 'GET') {
          sequence.push('get')
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              signedIn: true,
              userId: 'user-1',
              progress: [
                {
                  devotionalSlug: 'jabez-day-3',
                  completedAt: '2026-08-03T09:00:00.000Z',
                  timeSpentSeconds: null,
                },
              ],
            }),
          }
        }
        sequence.push('post')
        return { ok: false, status: 500, json: async () => ({}) }
      }),
    )
    const onMerged = vi.fn(() => sequence.push('merged'))
    const onReplaced = vi.fn()

    const outcome = await reconcileReadingProgress(
      [{ slug: 'jabez-day-1', completedAt: '2026-08-01T09:00:00.000Z' }],
      { ownerId: 'user-1', onMerged, onReplaced },
    )

    // The read direction succeeded and STAYS applied; the push failure is its
    // own outcome, not a reason to discard the merge.
    expect(outcome.status).toBe('push-failed')
    if (outcome.status !== 'push-failed') throw new Error('unreachable')
    expect(outcome.completions.map((p) => p.slug)).toEqual([
      'jabez-day-1',
      'jabez-day-3',
    ])
    expect(outcome.pushed).toBe(0)
    expect(sequence).toEqual(['get', 'merged', 'post'])
    expect(failed).toHaveBeenCalled()
    window.removeEventListener('readingProgressSyncFailed', failed)
    errors.mockRestore()
  })

  it('a different signed-in account is replaced into, never pushed into', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            signedIn: true,
            userId: 'user-b',
            progress: [
              {
                devotionalSlug: 'b-day-1',
                completedAt: '2026-08-10T09:00:00.000Z',
                timeSpentSeconds: null,
              },
            ],
          }),
        }
      }
      return { ok: true, status: 200, json: async () => storedRow('b-day-1') }
    })
    vi.stubGlobal('fetch', fetchMock)
    const onMerged = vi.fn()
    const onReplaced = vi.fn()

    const outcome = await reconcileReadingProgress(
      // User A's history, still on the device after A signed out.
      [{ slug: 'a-day-1', completedAt: '2026-08-01T09:00:00.000Z' }],
      { ownerId: 'user-a', onMerged, onReplaced },
    )

    expect(outcome.status).toBe('replaced')
    if (outcome.status !== 'replaced') throw new Error('unreachable')
    expect(outcome.completions.map((p) => p.slug)).toEqual(['b-day-1'])
    // Not one POST: A's completions must never land in B's account.
    expect(postsOf(fetchMock)).toHaveLength(0)
    expect(onMerged).not.toHaveBeenCalled()
    expect(onReplaced).toHaveBeenCalledTimes(1)
    expect(
      (onReplaced.mock.calls[0][0] as DevotionalProgress[]).map((p) => p.slug),
    ).toEqual(['b-day-1'])
    expect(onReplaced.mock.calls[0][1]).toBe('user-b')
  })
})

// ---------------------------------------------------------------------------
// The completion push
// ---------------------------------------------------------------------------

/** A slug in no series, so `advanceActiveDayAfterCompletion` stays out of it. */
const ORPHAN_SLUG = 'not-a-real-series-day-1'

async function settle() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('marking a devotional complete', () => {
  it('posts the completion once the account is known', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            signedIn: true,
            userId: 'user-1',
            progress: [],
          }),
        }
      }
      return { ok: true, status: 200, json: async () => storedRow(ORPHAN_SLUG) }
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchAccountCompletions()
    markDevotionalComplete(ORPHAN_SLUG, 240)
    await settle()

    const posts = postsOf(fetchMock)
    expect(posts).toHaveLength(1)
    expect(
      JSON.parse((posts[0][1] as RequestInit).body as string),
    ).toMatchObject({ devotionalSlug: ORPHAN_SLUG, timeSpentSeconds: 240 })
    // The local write still happened — the account is a second home for it,
    // never a precondition.
    expect(getProgress().map((p) => p.slug)).toContain(ORPHAN_SLUG)
  })

  it('does not post for a signed-out reader', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, signedIn: false, progress: null }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchAccountCompletions()
    markDevotionalComplete(ORPHAN_SLUG)
    await settle()

    expect(fetchMock).toHaveBeenCalledTimes(1) // the GET, and nothing else
    expect(getProgress().map((p) => p.slug)).toContain(ORPHAN_SLUG)
  })

  it('does not post before auth is known, and says why', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const outcome = await pushReadingCompletion({
      slug: ORPHAN_SLUG,
      completedAt: '2026-08-18T00:00:00.000Z',
    })

    // Fails CLOSED. The reconcile on the next load picks this up.
    expect(outcome).toEqual({
      status: 'not-applicable',
      reason: 'auth-unknown',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('treats a 200 that stored nothing as a failure, not a save', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failed = vi.fn()
    window.addEventListener('readingProgressSyncFailed', failed)
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            signedIn: true,
            userId: 'user-1',
            progress: [],
          }),
        }
      }
      // The route's shape while migration 019 is pending: 200, nothing stored.
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          progress: null,
          pendingMigration: true,
        }),
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchAccountCompletions()
    const outcome = await pushReadingCompletion({
      slug: ORPHAN_SLUG,
      completedAt: '2026-08-18T00:00:00.000Z',
    })

    // "Saved" would be a silent fallback: the status line said 200 but the
    // body says the row never landed.
    expect(outcome.status).toBe('failed')
    expect(failed).toHaveBeenCalled()
    window.removeEventListener('readingProgressSyncFailed', failed)
    errors.mockRestore()
  })

  it('does not post a second time for a devotional already finished', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            signedIn: true,
            userId: 'user-1',
            progress: [],
          }),
        }
      }
      return { ok: true, status: 200, json: async () => storedRow(ORPHAN_SLUG) }
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchAccountCompletions()
    markDevotionalComplete(ORPHAN_SLUG)
    await settle()
    markDevotionalComplete(ORPHAN_SLUG)
    await settle()

    expect(postsOf(fetchMock)).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// The component wiring — mount, fetch, merge both stores, backfill
// ---------------------------------------------------------------------------

describe('ReadingProgressSync', () => {
  it('mounts, fetches, merges into both device stores, and backfills the rest', async () => {
    // The two device stores hold DIFFERENT halves of the history — the drift
    // this component exists to heal.
    localStorage.setItem(
      'wakeup_progress',
      JSON.stringify([
        { slug: 'jabez-day-1', completedAt: '2026-08-01T09:00:00.000Z' },
      ]),
    )
    useProgressStore.setState({
      completions: [
        { slug: 'jabez-day-2', completedAt: '2026-08-02T09:00:00.000Z' },
      ],
      syncOwnerId: null,
    })
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            signedIn: true,
            userId: 'user-1',
            progress: [
              {
                devotionalSlug: 'jabez-day-3',
                completedAt: '2026-08-03T09:00:00.000Z',
                timeSpentSeconds: null,
              },
            ],
          }),
        }
      }
      return { ok: true, status: 200, json: async () => storedRow('backfill') }
    })
    vi.stubGlobal('fetch', fetchMock)

    render(createElement(ReadingProgressSync))

    // Both device-only halves go up, one row each.
    await vi.waitFor(() => expect(postsOf(fetchMock)).toHaveLength(2))
    const pushedSlugs = postsOf(fetchMock)
      .map(
        ([, init]) =>
          (
            JSON.parse((init as RequestInit).body as string) as {
              devotionalSlug: string
            }
          ).devotionalSlug,
      )
      .sort()
    expect(pushedSlugs).toEqual(['jabez-day-1', 'jabez-day-2'])

    // And the account's row came down into BOTH stores.
    const all = ['jabez-day-1', 'jabez-day-2', 'jabez-day-3']
    expect(
      getProgress()
        .map((p) => p.slug)
        .sort(),
    ).toEqual(all)
    const state = useProgressStore.getState()
    expect(state.completions.map((p) => p.slug).sort()).toEqual(all)
    expect(state.syncOwnerId).toBe('user-1')
  })

  it('A signs out, B signs in: nothing of A is pushed, the device becomes B', async () => {
    // User A read a devotional on this device, then signed out (cookies gone,
    // device stores intact, owner stamp persisted).
    localStorage.setItem(
      'wakeup_progress',
      JSON.stringify([
        { slug: 'a-day-1', completedAt: '2026-08-01T09:00:00.000Z' },
      ]),
    )
    useProgressStore.setState({
      completions: [
        { slug: 'a-day-1', completedAt: '2026-08-01T09:00:00.000Z' },
      ],
      syncOwnerId: 'user-a',
    })
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            signedIn: true,
            userId: 'user-b',
            progress: [
              {
                devotionalSlug: 'b-day-1',
                completedAt: '2026-08-10T09:00:00.000Z',
                timeSpentSeconds: null,
              },
            ],
          }),
        }
      }
      return { ok: true, status: 200, json: async () => storedRow('b-day-1') }
    })
    vi.stubGlobal('fetch', fetchMock)

    render(createElement(ReadingProgressSync))

    await vi.waitFor(() =>
      expect(useProgressStore.getState().syncOwnerId).toBe('user-b'),
    )
    // A's completions were REPLACED, not merged, in both stores...
    expect(getProgress().map((p) => p.slug)).toEqual(['b-day-1'])
    expect(useProgressStore.getState().completions.map((p) => p.slug)).toEqual([
      'b-day-1',
    ])
    // ...and not one of them was pushed into B's account.
    expect(postsOf(fetchMock)).toHaveLength(0)
  })
})
