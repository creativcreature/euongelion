import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as bookmarkPost } from '@/app/api/bookmarks/route'
import { POST as annotationPost } from '@/app/api/annotations/route'

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

describe('save-state auth gate', () => {
  beforeEach(() => {
    mockedGetUser.mockReset()
  })

  it('blocks bookmark writes for unauthenticated users', async () => {
    mockedGetUser.mockResolvedValue(null)
    const response = await bookmarkPost(
      postJson('http://localhost/api/bookmarks', {
        devotionalSlug: 'identity-day-1',
      }) as never,
    )
    expect(response.status).toBe(401)
    const payload = (await response.json()) as { code?: string }
    expect(payload.code).toBe('AUTH_REQUIRED_SAVE_STATE')
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
})
