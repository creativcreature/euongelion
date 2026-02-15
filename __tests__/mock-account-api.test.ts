import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GET as sessionGetHandler,
  POST as sessionPostHandler,
} from '@/app/api/mock-account/session/route'
import { GET as exportGetHandler } from '@/app/api/mock-account/export/route'

let sessionToken = 'mock-account-session'
let mockSession: {
  mode: 'anonymous' | 'mock_account'
  analytics_opt_in: boolean
} | null = null
const upsertSession = vi.fn()
const listRuns = vi.fn()
const listSelections = vi.fn()
const listAnnotations = vi.fn()
const listBookmarks = vi.fn()

vi.mock('@/lib/soul-audit/session', () => ({
  getOrCreateAuditSessionToken: vi.fn(async () => sessionToken),
}))

vi.mock('@/lib/soul-audit/repository', () => ({
  getMockAccountSessionWithFallback: vi.fn(async () => mockSession),
  upsertMockAccountSession: (...args: unknown[]) => upsertSession(...args),
  listAuditRunsForSessionWithFallback: (...args: unknown[]) =>
    listRuns(...args),
  listSelectionsForSessionWithFallback: (...args: unknown[]) =>
    listSelections(...args),
  listAnnotationsWithFallback: (...args: unknown[]) => listAnnotations(...args),
  listBookmarksWithFallback: (...args: unknown[]) => listBookmarks(...args),
}))

function postJson(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('mock account session/export API', () => {
  beforeEach(() => {
    sessionToken = `mock-session-${Date.now()}-${Math.random().toString(36).slice(2)}`
    mockSession = null
    upsertSession.mockReset()
    listRuns.mockReset()
    listSelections.mockReset()
    listAnnotations.mockReset()
    listBookmarks.mockReset()
  })

  it('session GET defaults to anonymous mode', async () => {
    const response = await sessionGetHandler()
    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      mode: string
      analyticsOptIn: boolean
      isAnonymousDefault: boolean
    }
    expect(payload.mode).toBe('anonymous')
    expect(payload.analyticsOptIn).toBe(false)
    expect(payload.isAnonymousDefault).toBe(true)
  })

  it('session POST persists mock account mode and analytics preference', async () => {
    upsertSession.mockResolvedValue({
      mode: 'mock_account',
      analytics_opt_in: true,
    })

    const response = await sessionPostHandler(
      postJson('http://localhost/api/mock-account/session', {
        mode: 'mock_account',
        analyticsOptIn: true,
      }) as never,
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      mode: string
      analyticsOptIn: boolean
      capabilities: string[]
      isAnonymousDefault: boolean
      retention: { anonymousSessionDays: number }
    }
    expect(payload.mode).toBe('mock_account')
    expect(payload.analyticsOptIn).toBe(true)
    expect(payload.capabilities).toContain('data-export')
    expect(payload.isAnonymousDefault).toBe(false)
    expect(payload.retention.anonymousSessionDays).toBeGreaterThan(0)
  })

  it('export GET blocks when mode is not mock_account', async () => {
    mockSession = {
      mode: 'anonymous',
      analytics_opt_in: false,
    }
    const response = await exportGetHandler()
    expect(response.status).toBe(403)
    const payload = (await response.json()) as { code?: string }
    expect(payload.code).toBe('MOCK_ACCOUNT_REQUIRED')
  })

  it('export GET blocks when analytics opt-in is false', async () => {
    mockSession = {
      mode: 'mock_account',
      analytics_opt_in: false,
    }
    const response = await exportGetHandler()
    expect(response.status).toBe(403)
    const payload = (await response.json()) as { code?: string }
    expect(payload.code).toBe('ANALYTICS_OPT_IN_REQUIRED')
  })

  it('export GET returns data + summary when session is export-eligible', async () => {
    mockSession = {
      mode: 'mock_account',
      analytics_opt_in: true,
    }
    listRuns.mockResolvedValue([{ id: 'run-1' }])
    listSelections.mockResolvedValue([{ id: 'sel-1' }])
    listAnnotations.mockResolvedValue([{ id: 'ann-1' }, { id: 'ann-2' }])
    listBookmarks.mockResolvedValue([{ id: 'bm-1' }])

    const response = await exportGetHandler()
    expect(response.status).toBe(200)

    const payload = (await response.json()) as {
      ok: boolean
      summary: {
        auditRuns: number
        auditSelections: number
        annotations: number
        bookmarks: number
      }
      data: {
        auditRuns: unknown[]
        auditSelections: unknown[]
        annotations: unknown[]
        bookmarks: unknown[]
      }
      retention: { chatHistoryDays: number }
    }

    expect(payload.ok).toBe(true)
    expect(payload.summary.auditRuns).toBe(1)
    expect(payload.summary.auditSelections).toBe(1)
    expect(payload.summary.annotations).toBe(2)
    expect(payload.summary.bookmarks).toBe(1)
    expect(payload.data.annotations).toHaveLength(2)
    expect(payload.retention.chatHistoryDays).toBeGreaterThan(0)
  })
})
