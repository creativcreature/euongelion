import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as bookmarkPost } from '@/app/api/bookmarks/route'
import {
  PATCH as annotationPatch,
  POST as annotationPost,
} from '@/app/api/annotations/route'

const mockedGetUser = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth', () => ({
  getUser: mockedGetUser,
}))

vi.mock('@/lib/soul-audit/session', () => ({
  getOrCreateAuditSessionToken: vi.fn(async () => 'anon-session'),
}))

function postJson(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function patchJson(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Save-state auth model (SA-018, amended 2026-06-09):
//   - Bookmarks ("save for later") are a LIGHTWEIGHT save-state action and are
//     allowed anonymously, keyed by the audit session token (and merged to the
//     account on sign-in). This matches the anonymous reading flow.
//   - Annotations (notes / highlights / stickies) are richer authored content
//     and still REQUIRE sign-in (return AUTH_REQUIRED_SAVE_STATE when anon).
describe('save-state auth gate', () => {
  beforeEach(() => {
    mockedGetUser.mockReset()
  })

  it('REFUSES bookmark writes for unauthenticated users', async () => {
    // REVERSED 2026-08-16 by SA-062. This test previously asserted a 200 —
    // SA-018's amendment allowed anonymous bookmarks keyed by the audit session
    // token. The founder replaced that with two states: "No account, data
    // should not be retained." A bookmark is save-state, so it needs an
    // account. The reversal is deliberate; this is not drift.
    mockedGetUser.mockResolvedValue(null)
    const response = await bookmarkPost(
      postJson('http://localhost/api/bookmarks', {
        devotionalSlug: 'he-cannot-deny-himself-day-1',
      }) as never,
    )
    expect(response.status).toBe(401)
    const body = (await response.json()) as { code?: string }
    expect(body.code).toBe('AUTH_REQUIRED_SAVE_STATE')
  })

  it('allows bookmark writes for authenticated users', async () => {
    mockedGetUser.mockResolvedValue({ id: 'user-123' })
    const response = await bookmarkPost(
      postJson('http://localhost/api/bookmarks', {
        devotionalSlug: 'identity-day-1',
      }) as never,
    )
    expect(response.status).toBe(200)
  })

  it('blocks annotation writes for unauthenticated users', async () => {
    mockedGetUser.mockResolvedValue(null)
    const response = await annotationPost(
      postJson('http://localhost/api/annotations', {
        devotionalSlug: 'identity-day-1',
        annotationType: 'note',
        body: 'Test note',
      }) as never,
    )
    expect(response.status).toBe(401)
    const payload = (await response.json()) as { code?: string }
    expect(payload.code).toBe('AUTH_REQUIRED_SAVE_STATE')
  })

  it('allows annotation writes for authenticated users', async () => {
    mockedGetUser.mockResolvedValue({ id: 'user-123' })
    const response = await annotationPost(
      postJson('http://localhost/api/annotations', {
        devotionalSlug: 'identity-day-1',
        annotationType: 'note',
        body: 'Test note',
      }) as never,
    )
    expect(response.status).toBe(200)
  })

  it('blocks annotation updates for unauthenticated users', async () => {
    mockedGetUser.mockResolvedValue(null)
    const response = await annotationPatch(
      patchJson('http://localhost/api/annotations', {
        annotationId: 'fake-annotation-id',
        body: 'Updated sticky text',
      }) as never,
    )
    expect(response.status).toBe(401)
    const payload = (await response.json()) as { code?: string }
    expect(payload.code).toBe('AUTH_REQUIRED_SAVE_STATE')
  })
})
