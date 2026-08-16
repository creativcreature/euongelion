/**
 * SA-058 — the listening-progress route contract.
 *
 * Exercises the handlers directly rather than over HTTP, because a parallel
 * session was holding `.next` and the Workers preview when this was written.
 * That makes these a contract test, NOT a substitute for the workerd run that
 * dev rule #9 requires before deploy — see the handoff.
 *
 * The three behaviours worth pinning are the ones a reader would feel:
 *
 *  - signed out is 200 with `progress: null`, NOT 401. "Nothing to resume from
 *    an account" is the normal state for most page loads; answering 401 would
 *    log a failure on every one of them.
 *  - a pending migration 018 degrades to on-device resume instead of erroring
 *    the reading — and still logs, so it is a visible degraded path rather than
 *    a silent fallback.
 *  - writing requires an account (SA-060).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getUser = vi.fn()
const readListeningProgress = vi.fn()
const upsertListeningProgress = vi.fn()
const logApiFailure = vi.fn()

vi.mock('@/lib/auth', () => ({ getUser: () => getUser() }))
vi.mock('@/lib/audio/listening-progress-repository', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/audio/listening-progress-repository')
  >('@/lib/audio/listening-progress-repository')
  return {
    isMissingListeningProgressTable: actual.isMissingListeningProgressTable,
    readListeningProgress: (...a: unknown[]) => readListeningProgress(...a),
    upsertListeningProgress: (...a: unknown[]) => upsertListeningProgress(...a),
  }
})
vi.mock('@/lib/observability/api-failure', () => ({
  logApiFailure: (...a: unknown[]) => logApiFailure(...a),
}))

const { GET, PUT } = await import('@/app/api/listening-progress/route')

const url = (slug: string) =>
  new URL(`http://localhost/api/listening-progress?devotionalSlug=${slug}`)

/** Minimal stand-in for the NextRequest surface the handlers actually touch. */
const getRequest = (slug: string) =>
  ({
    method: 'GET',
    nextUrl: url(slug),
    headers: new Headers(),
  }) as never

const putRequest = (body: unknown) =>
  ({
    method: 'PUT',
    nextUrl: new URL('http://localhost/api/listening-progress'),
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as never

beforeEach(() => {
  getUser.mockReset()
  readListeningProgress.mockReset()
  upsertListeningProgress.mockReset()
  logApiFailure.mockReset()
})
afterEach(() => vi.clearAllMocks())

describe('GET /api/listening-progress', () => {
  it('rejects an unsafe slug before doing any work', async () => {
    const response = await GET(getRequest('..%2Fetc%2Fpasswd'))
    expect(response.status).toBe(400)
    expect(getUser).not.toHaveBeenCalled()
  })

  it('answers 200 with progress:null when signed out', async () => {
    getUser.mockResolvedValue(null)
    const response = await GET(getRequest('jabez-day-1'))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ progress: null })
    expect(readListeningProgress).not.toHaveBeenCalled()
  })

  it('returns the stored row for a signed-in reader', async () => {
    getUser.mockResolvedValue({ id: 'user-1' })
    readListeningProgress.mockResolvedValue({
      positionSeconds: 128,
      durationSeconds: 405,
      secondsListened: 128,
      completedAt: null,
      lastPlayedAt: '2026-08-16T10:00:00.000Z',
    })
    const response = await GET(getRequest('jabez-day-1'))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      progress: { positionSeconds: 128 },
    })
  })

  it('degrades to on-device resume when migration 018 is pending', async () => {
    getUser.mockResolvedValue({ id: 'user-1' })
    readListeningProgress.mockRejectedValue({
      code: '42P01',
      message: 'relation "listening_progress" does not exist',
    })

    const response = await GET(getRequest('jabez-day-1'))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      progress: null,
      pendingMigration: true,
    })
    // Degraded, but VISIBLE — this is the line between a documented fallback
    // and a silent one.
    expect(logApiFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'CONFIG_FEATURE_DISABLED',
        context: expect.objectContaining({ pending: true }),
      }),
    )
  })
})

describe('PUT /api/listening-progress', () => {
  it('requires an account', async () => {
    getUser.mockResolvedValue(null)
    const response = await PUT(
      putRequest({ devotionalSlug: 'jabez-day-1', positionSeconds: 10 }),
    )
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      code: 'AUTH_REQUIRED_SAVE_STATE',
    })
  })

  it('rejects a negative position', async () => {
    getUser.mockResolvedValue({ id: 'user-1' })
    const response = await PUT(
      putRequest({ devotionalSlug: 'jabez-day-1', positionSeconds: -5 }),
    )
    expect(response.status).toBe(400)
    expect(upsertListeningProgress).not.toHaveBeenCalled()
  })

  it('clamps an implausible listening delta', async () => {
    getUser.mockResolvedValue({ id: 'user-1' })
    upsertListeningProgress.mockResolvedValue({
      positionSeconds: 10,
      durationSeconds: 405,
      secondsListened: 300,
      completedAt: null,
      lastPlayedAt: '2026-08-16T10:00:00.000Z',
    })

    await PUT(
      putRequest({
        devotionalSlug: 'jabez-day-1',
        positionSeconds: 10,
        durationSeconds: 405,
        // A tab suspended for two hours would otherwise report 7200s of
        // "listening" that never happened.
        listenedDelta: 7200,
      }),
    )

    expect(upsertListeningProgress).toHaveBeenCalledWith(
      expect.objectContaining({ listenedDelta: 300 }),
    )
  })
})
