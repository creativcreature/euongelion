import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH, PUT } from '@/app/api/devotionals/active/route'
import { LibraryPersistenceError } from '@/lib/library/repository'
import { useDevotionalLibraryStore } from '@/stores/devotionalLibraryStore'

const repository = vi.hoisted(() => ({
  archiveSeries: vi.fn(),
  clearActiveSeries: vi.fn(),
  clearScheduledSwap: vi.fn(),
  getActiveSeries: vi.fn(),
  getScheduledSwap: vi.fn(),
  promoteScheduledSwapIfDue: vi.fn(),
  replaceActiveSeries: vi.fn(),
  setActiveSeries: vi.fn(),
  setScheduledSwap: vi.fn(),
  updateActiveSeriesDay: vi.fn(),
}))
const mockedGetUser = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth', () => ({ getUser: mockedGetUser }))
vi.mock('@/lib/library/repository', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/library/repository')>()
  return {
    ...actual,
    ...repository,
  }
})

const USER_ID = '00000000-0000-0000-0000-00000000abcd'
const ACTIVE_ROW = {
  user_id: USER_ID,
  series_slug: 'the-harvest',
  current_day: 3,
  source: 'manual_start' as const,
  started_at: '2026-07-27T10:00:00.000Z',
  last_opened_at: '2026-07-27T11:00:00.000Z',
}

function request(
  method: 'PUT' | 'PATCH',
  body: Record<string, unknown>,
): NextRequest {
  return new NextRequest('http://localhost/api/devotionals/active', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedGetUser.mockResolvedValue({ id: USER_ID })
  repository.getActiveSeries.mockResolvedValue(null)
  repository.getScheduledSwap.mockResolvedValue(null)
  repository.promoteScheduledSwapIfDue.mockResolvedValue(null)
})

describe('GET /api/devotionals/active', () => {
  it('returns the canonical active series and persisted day', async () => {
    repository.promoteScheduledSwapIfDue.mockResolvedValue(ACTIVE_ROW)

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.active).toMatchObject({
      seriesSlug: 'the-harvest',
      currentDay: 3,
      source: 'manual_start',
    })
  })

  it('distinguishes a confirmed empty account from a read failure', async () => {
    const emptyResponse = await GET()
    expect(emptyResponse.status).toBe(200)
    await expect(emptyResponse.json()).resolves.toMatchObject({ active: null })

    repository.promoteScheduledSwapIfDue.mockRejectedValue(
      new Error('database unavailable'),
    )
    const failedResponse = await GET()
    expect(failedResponse.status).toBe(500)
    await expect(failedResponse.json()).resolves.toMatchObject({
      error: 'Unable to read active devotional.',
    })
  })

  it('requires an authenticated account', async () => {
    mockedGetUser.mockResolvedValue(null)
    const response = await GET()
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      code: 'AUTH_REQUIRED',
    })
  })
})

describe('PUT /api/devotionals/active', () => {
  it('persists the selected devotional before reporting success', async () => {
    repository.replaceActiveSeries.mockResolvedValue(ACTIVE_ROW)

    const response = await PUT(
      request('PUT', {
        seriesSlug: 'the-harvest',
        currentDay: 3,
        mode: 'replace_now',
      }),
    )

    expect(response.status).toBe(200)
    expect(repository.replaceActiveSeries).toHaveBeenCalledWith({
      userId: USER_ID,
      seriesSlug: 'the-harvest',
      source: 'manual_start',
      currentDay: 3,
    })
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      active: { seriesSlug: 'the-harvest', currentDay: 3 },
    })
  })

  it('returns an honest 503 when the canonical write does not land', async () => {
    repository.replaceActiveSeries.mockRejectedValue(
      new LibraryPersistenceError('active_series', 'database unavailable'),
    )

    const response = await PUT(request('PUT', { seriesSlug: 'the-harvest' }))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      code: 'PERSISTENCE_FAILED',
    })
  })
})

describe('PATCH /api/devotionals/active', () => {
  it('persists reading progress on the active series', async () => {
    repository.getActiveSeries.mockResolvedValue(ACTIVE_ROW)
    repository.updateActiveSeriesDay.mockResolvedValue({
      ...ACTIVE_ROW,
      current_day: 4,
    })

    const response = await PATCH(request('PATCH', { currentDay: 4 }))

    expect(response.status).toBe(200)
    expect(repository.updateActiveSeriesDay).toHaveBeenCalledWith(USER_ID, 4)
    await expect(response.json()).resolves.toMatchObject({
      active: { seriesSlug: 'the-harvest', currentDay: 4 },
    })
  })
})

describe('devotional library client state', () => {
  it('retains the last confirmed active devotional when a refresh fails', async () => {
    useDevotionalLibraryStore.setState({
      active: {
        seriesSlug: 'the-harvest',
        currentDay: 3,
        source: 'manual_start',
        startedAt: '2026-07-27T10:00:00.000Z',
        lastOpenedAt: '2026-07-27T11:00:00.000Z',
        seriesTitle: 'The Harvest',
      },
      scheduledSwap: null,
      saved: [],
      archived: [],
      lastError: null,
    })
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ error: 'Unable to read active devotional.' }),
            { status: 500 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true, saved: [] }), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true, archived: [] }), {
            status: 200,
          }),
        ),
    )

    await useDevotionalLibraryStore.getState().refresh()

    expect(useDevotionalLibraryStore.getState().active).toMatchObject({
      seriesSlug: 'the-harvest',
      currentDay: 3,
    })
    expect(useDevotionalLibraryStore.getState().lastError).toBe(
      'Unable to read active devotional.',
    )
    vi.unstubAllGlobals()
  })

  it('clears account-scoped state only when the server confirms 401', async () => {
    useDevotionalLibraryStore.setState({
      active: {
        seriesSlug: 'the-harvest',
        currentDay: 3,
        source: 'manual_start',
        startedAt: '2026-07-27T10:00:00.000Z',
        lastOpenedAt: '2026-07-27T11:00:00.000Z',
        seriesTitle: 'The Harvest',
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'AUTH_REQUIRED' }), {
          status: 401,
        }),
      ),
    )

    await useDevotionalLibraryStore.getState().refresh()

    expect(useDevotionalLibraryStore.getState().active).toBeNull()
    vi.unstubAllGlobals()
  })
})
