import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  clearSessionAuditState,
  getOrCreateAuditSessionToken,
  rotateAuditSessionToken,
} = vi.hoisted(() => ({
  clearSessionAuditState: vi.fn(async () => {}),
  getOrCreateAuditSessionToken: vi.fn(async () => 'session-old'),
  rotateAuditSessionToken: vi.fn(async () => 'session-new'),
}))

vi.mock('@/lib/soul-audit/repository', () => ({
  clearSessionAuditState,
}))

vi.mock('@/lib/soul-audit/session', () => ({
  getOrCreateAuditSessionToken,
  rotateAuditSessionToken,
}))

import { POST as resetHandler } from '@/app/api/soul-audit/manage/route'

describe('POST /api/soul-audit/reset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clears previous session state and rotates session token', async () => {
    const response = await resetHandler()
    const payload = (await response.json()) as {
      ok: boolean
      reset: boolean
    }

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.reset).toBe(true)
    expect(getOrCreateAuditSessionToken).toHaveBeenCalledTimes(1)
    expect(clearSessionAuditState).toHaveBeenCalledWith('session-old')
    expect(rotateAuditSessionToken).toHaveBeenCalledTimes(1)

    const cookieHeader = response.headers.get('set-cookie') || ''
    expect(cookieHeader).toContain('euangelion_current_route=;')
  })
})
