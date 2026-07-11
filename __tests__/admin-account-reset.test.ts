import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Tests for POST /api/admin/reset-my-account (brief §9, F-077).
 *
 * Gating is real, not obscurity: env flag → auth → DB role → typed
 * confirmation, each failing to 404/400. The endpoint can only reset
 * the caller's own account and preserves the auth user + users row.
 */

let authedUser: { id: string } | null = null
let roleRows: { id: string; role: string }[] = []
let usersRowUpdates: Record<string, unknown>[] = []
let metadataUpdates: { userId: string; metadata: Record<string, unknown> }[] =
  []

const deleteUserAccountMock = vi.fn()

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
    from: () => {
      const filters: Record<string, unknown> = {}
      let mode: 'select' | 'update' = 'select'
      let updateValues: Record<string, unknown> = {}
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn(() => chain)
      chain.update = vi.fn((values: Record<string, unknown>) => {
        mode = 'update'
        updateValues = values
        return chain
      })
      chain.eq = vi.fn((col: string, val: unknown) => {
        filters[col] = val
        if (mode === 'update') {
          usersRowUpdates.push({ ...updateValues, _target: val })
          return Promise.resolve({ error: null })
        }
        return chain
      })
      chain.maybeSingle = vi.fn(() => {
        const row = roleRows.find((r) => r.id === filters.id)
        return Promise.resolve({ data: row ?? null, error: null })
      })
      return chain
    },
    auth: {
      admin: {
        updateUserById: vi.fn(
          (
            userId: string,
            payload: { user_metadata: Record<string, unknown> },
          ) => {
            metadataUpdates.push({ userId, metadata: payload.user_metadata })
            return Promise.resolve({ error: null })
          },
        ),
      },
    },
  }),
}))

vi.mock('@/lib/privacy/account-deletion', () => ({
  deleteUserAccount: (...args: unknown[]) => deleteUserAccountMock(...args),
}))

function buildRequest(body?: unknown) {
  return new Request('http://localhost/api/admin/reset-my-account', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '127.0.0.9',
    },
    body: body === undefined ? '{}' : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.unstubAllEnvs()
  authedUser = null
  roleRows = []
  usersRowUpdates = []
  metadataUpdates = []
  deleteUserAccountMock.mockReset()
  deleteUserAccountMock.mockResolvedValue({
    userId: 'admin-1',
    startedAt: '',
    completedAt: '',
    tablesDeleted: ['devotional_plan_instances'],
    partialFailures: [],
    sessionTokensProcessed: 2,
    authUserDeleted: false,
  })
})

describe('POST /api/admin/reset-my-account', () => {
  it('404s when the environment flag is off, even for a real admin', async () => {
    authedUser = { id: 'admin-1' }
    roleRows = [{ id: 'admin-1', role: 'admin' }]
    const { POST } = await import('@/app/api/admin/reset-my-account/route')
    const response = await POST(
      buildRequest({ confirm: 'RESET MY ACCOUNT' }) as never,
    )
    expect(response.status).toBe(404)
    expect(deleteUserAccountMock).not.toHaveBeenCalled()
  })

  it('404s for anonymous callers', async () => {
    vi.stubEnv('ADMIN_ACCOUNT_RESET_ENABLED', 'true')
    const { POST } = await import('@/app/api/admin/reset-my-account/route')
    const response = await POST(
      buildRequest({ confirm: 'RESET MY ACCOUNT' }) as never,
    )
    expect(response.status).toBe(404)
  })

  it('404s for authenticated NON-admins (role checked server-side)', async () => {
    vi.stubEnv('ADMIN_ACCOUNT_RESET_ENABLED', 'true')
    authedUser = { id: 'user-1' }
    roleRows = [{ id: 'user-1', role: 'user' }]
    const { POST } = await import('@/app/api/admin/reset-my-account/route')
    const response = await POST(
      buildRequest({ confirm: 'RESET MY ACCOUNT' }) as never,
    )
    expect(response.status).toBe(404)
    expect(deleteUserAccountMock).not.toHaveBeenCalled()
  })

  it('400s without the typed confirmation', async () => {
    vi.stubEnv('ADMIN_ACCOUNT_RESET_ENABLED', 'true')
    authedUser = { id: 'admin-1' }
    roleRows = [{ id: 'admin-1', role: 'admin' }]
    const { POST } = await import('@/app/api/admin/reset-my-account/route')
    const response = await POST(buildRequest({}) as never)
    expect(response.status).toBe(400)
    expect(deleteUserAccountMock).not.toHaveBeenCalled()
  })

  it('resets ONLY the calling admin, preserving the auth user', async () => {
    vi.stubEnv('ADMIN_ACCOUNT_RESET_ENABLED', 'true')
    authedUser = { id: 'admin-1' }
    roleRows = [{ id: 'admin-1', role: 'admin' }]
    const { POST } = await import('@/app/api/admin/reset-my-account/route')
    const response = await POST(
      buildRequest({ confirm: 'RESET MY ACCOUNT' }) as never,
    )
    expect(response.status).toBe(200)

    // Cascade ran for the caller only, in preserve mode.
    expect(deleteUserAccountMock).toHaveBeenCalledTimes(1)
    expect(deleteUserAccountMock).toHaveBeenCalledWith('admin-1', {
      preserveAuthUser: true,
    })

    // users row reset: onboarding + free grant, never subscription state.
    const rowUpdate = usersRowUpdates.find((u) => u._target === 'admin-1')
    expect(rowUpdate).toMatchObject({
      onboarding_completed: false,
      free_generation_used_at: null,
    })
    expect(rowUpdate).not.toHaveProperty('subscription_tier')
    expect(rowUpdate).not.toHaveProperty('stripe_customer_id')
    expect(rowUpdate).not.toHaveProperty('role')

    // Onboarding metadata cleared for the caller.
    expect(metadataUpdates).toHaveLength(1)
    expect(metadataUpdates[0].userId).toBe('admin-1')
    expect(metadataUpdates[0].metadata).toMatchObject({
      onboardingCompleted: false,
      onboardingSkipped: false,
    })

    const payload = (await response.json()) as { ok: boolean; reset: unknown }
    expect(payload.ok).toBe(true)
  })
})
