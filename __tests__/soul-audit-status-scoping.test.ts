import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * §12.3 IDOR regression: /api/soul-audit/select/status may only be
 * polled by the session that created the job (or the signed-in user
 * that session belongs to). Anyone else gets 404 — indistinguishable
 * from a nonexistent job.
 */

const JOB = {
  id: 'job-1',
  run_id: 'run-1',
  session_id: 'owner-session-token',
  plan_id: 'plan-token-1',
  status: 'complete',
  progress: 'done',
  current_day: 7,
  total_days: 7,
  theme: 'Rest',
  scripture_anchor: 'Matthew 11:28',
  user_input: 'weary',
  timezone: 'UTC',
  timezone_offset_minutes: 0,
  error: null,
  generating_since: null,
  created_at: '2026-07-10T00:00:00.000Z',
  updated_at: '2026-07-10T00:05:00.000Z',
}

let callerSessionToken = 'owner-session-token'
let authedUser: { id: string } | null = null
let linkedSessions: { session_token: string; user_id: string }[] = []

vi.mock('@/lib/soul-audit/session', () => ({
  getOrCreateAuditSessionToken: vi.fn(() =>
    Promise.resolve(callerSessionToken),
  ),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: () => Promise.resolve({ data: { user: authedUser } }),
      },
    }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {}
      const filters: Record<string, unknown> = {}
      chain.select = vi.fn(() => chain)
      chain.update = vi.fn(() => chain)
      chain.eq = vi.fn((col: string, val: unknown) => {
        filters[col] = val
        return chain
      })
      chain.single = vi.fn(() => {
        if (table === 'soul_audit_jobs' && filters.id === JOB.id) {
          return Promise.resolve({ data: { ...JOB }, error: null })
        }
        return Promise.resolve({ data: null, error: { message: 'not found' } })
      })
      chain.maybeSingle = vi.fn(() => {
        if (table === 'user_sessions') {
          const match = linkedSessions.find(
            (row) =>
              row.session_token === filters.session_token &&
              row.user_id === filters.user_id,
          )
          return Promise.resolve({ data: match ?? null, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })
      chain.then = (resolve: (value: unknown) => void) => {
        resolve({ data: null, error: null })
      }
      return chain
    },
  }),
}))

function buildRequest(jobId: string) {
  return new Request(
    `http://localhost/api/soul-audit/select/status?jobId=${jobId}`,
  )
}

describe('select/status ownership scoping (IDOR)', () => {
  beforeEach(() => {
    callerSessionToken = 'owner-session-token'
    authedUser = null
    linkedSessions = []
  })

  it('returns the job to the owning session', async () => {
    const { GET } = await import('@/app/api/soul-audit/select/status/route')
    const response = await GET(buildRequest(JOB.id) as never)
    expect(response.status).toBe(200)
    const payload = (await response.json()) as { status: string }
    expect(payload.status).toBe('complete')
  })

  it('404s for a different session holding a leaked jobId', async () => {
    callerSessionToken = 'attacker-session-token'
    const { GET } = await import('@/app/api/soul-audit/select/status/route')
    const response = await GET(buildRequest(JOB.id) as never)
    expect(response.status).toBe(404)
    const payload = (await response.json()) as { error: string }
    expect(payload.error).toBe('Job not found.')
  })

  it('allows the signed-in user whose account owns the creating session', async () => {
    callerSessionToken = 'new-device-session'
    authedUser = { id: 'user-1' }
    linkedSessions = [
      { session_token: 'owner-session-token', user_id: 'user-1' },
    ]
    const { GET } = await import('@/app/api/soul-audit/select/status/route')
    const response = await GET(buildRequest(JOB.id) as never)
    expect(response.status).toBe(200)
  })

  it('404s a signed-in user with no link to the creating session', async () => {
    callerSessionToken = 'new-device-session'
    authedUser = { id: 'user-2' }
    linkedSessions = [
      { session_token: 'owner-session-token', user_id: 'user-1' },
    ]
    const { GET } = await import('@/app/api/soul-audit/select/status/route')
    const response = await GET(buildRequest(JOB.id) as never)
    expect(response.status).toBe(404)
  })
})
