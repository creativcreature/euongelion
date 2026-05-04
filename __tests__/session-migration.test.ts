import { beforeEach, describe, expect, it, vi } from 'vitest'

// Build a small in-memory Supabase mock that records each
// `from(table).update(values).eq(col, val)` call.
type UpdateCall = {
  table: string
  values: Record<string, unknown>
  filterColumn: string
  filterValue: unknown
}

function buildSupabaseMock(opts: {
  priorSessionTokens: string[]
  priorSelectError?: unknown
}) {
  const updates: UpdateCall[] = []

  const userSessionsSelect = vi.fn(() => ({
    eq: vi.fn(() => ({
      neq: vi.fn(() =>
        Promise.resolve({
          data: opts.priorSelectError
            ? null
            : opts.priorSessionTokens.map((t) => ({ session_token: t })),
          error: opts.priorSelectError ?? null,
        }),
      ),
    })),
  }))

  const fromMock = vi.fn((table: string) => {
    if (table === 'user_sessions') {
      return {
        select: userSessionsSelect,
        // updateSession() also runs an UPDATE on user_sessions; record it
        // but don't conflate with the data-table migration UPDATEs.
        update: (values: Record<string, unknown>) => ({
          eq: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'session-current',
                    session_token: 'token-current',
                    user_id: values.user_id ?? null,
                  },
                  error: null,
                }),
            }),
          }),
        }),
      }
    }
    return {
      update: (values: Record<string, unknown>) => ({
        eq: (col: string, val: unknown) => {
          updates.push({
            table,
            values,
            filterColumn: col,
            filterValue: val,
          })
          return Promise.resolve({ error: null })
        },
      }),
    }
  })

  return { fromMock, updates }
}

let supabaseMock: ReturnType<typeof buildSupabaseMock>

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => supabaseMock.fromMock(table),
  }),
}))

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: () => undefined,
      set: () => undefined,
      delete: () => undefined,
    }),
}))

import { linkSessionToUser, migrateSessionData } from '@/lib/session'

describe('migrateSessionData', () => {
  beforeEach(() => {
    supabaseMock = buildSupabaseMock({ priorSessionTokens: [] })
  })

  it('runs UPDATE against every session-keyed table when tokens differ', async () => {
    const result = await migrateSessionData('old-token', 'new-token')
    expect(result.updatesAttempted).toBe(6)

    const tables = supabaseMock.updates.map((u) => u.table)
    expect(tables).toContain('devotional_plan_instances')
    expect(tables).toContain('audit_runs')
    expect(tables).toContain('consent_records')
    expect(tables).toContain('annotations')
    expect(tables).toContain('session_bookmarks')
    expect(tables).toContain('soul_audit_jobs')
  })

  it('uses session_id (not session_token) for soul_audit_jobs', async () => {
    await migrateSessionData('old-token', 'new-token')
    const jobUpdate = supabaseMock.updates.find(
      (u) => u.table === 'soul_audit_jobs',
    )
    expect(jobUpdate?.filterColumn).toBe('session_id')
    expect(jobUpdate?.values.session_id).toBe('new-token')
    expect(jobUpdate?.filterValue).toBe('old-token')
  })

  it('uses session_token for the other 5 tables', async () => {
    await migrateSessionData('old-token', 'new-token')
    const others = supabaseMock.updates.filter(
      (u) => u.table !== 'soul_audit_jobs',
    )
    for (const u of others) {
      expect(u.filterColumn).toBe('session_token')
      expect(u.values.session_token).toBe('new-token')
      expect(u.filterValue).toBe('old-token')
    }
  })

  it('is a no-op when fromToken === toToken', async () => {
    const result = await migrateSessionData('same', 'same')
    expect(result.updatesAttempted).toBe(0)
    expect(supabaseMock.updates).toHaveLength(0)
  })

  it('is a no-op when either token is empty', async () => {
    expect((await migrateSessionData('', 'x')).updatesAttempted).toBe(0)
    expect((await migrateSessionData('x', '')).updatesAttempted).toBe(0)
    expect(supabaseMock.updates).toHaveLength(0)
  })
})

describe('linkSessionToUser', () => {
  beforeEach(() => {
    supabaseMock = buildSupabaseMock({
      priorSessionTokens: ['phone-token', 'tablet-token'],
    })
  })

  it('migrates data from each prior session_token to the current token', async () => {
    await linkSessionToUser('session-current', 'user-abc')
    const tokensMigrated = new Set(
      supabaseMock.updates.map((u) => u.filterValue as string),
    )
    expect(tokensMigrated.has('phone-token')).toBe(true)
    expect(tokensMigrated.has('tablet-token')).toBe(true)
    // 6 tables × 2 prior sessions = 12 UPDATEs.
    expect(supabaseMock.updates).toHaveLength(12)
  })

  it('runs zero migration UPDATEs when the user has no other sessions', async () => {
    supabaseMock = buildSupabaseMock({ priorSessionTokens: [] })
    await linkSessionToUser('session-current', 'user-abc')
    expect(supabaseMock.updates).toHaveLength(0)
  })

  it('returns the linked session even if the prior-session lookup errors', async () => {
    supabaseMock = buildSupabaseMock({
      priorSessionTokens: [],
      priorSelectError: { message: 'simulated' },
    })
    const result = await linkSessionToUser('session-current', 'user-abc')
    expect(result?.user_id).toBe('user-abc')
    expect(supabaseMock.updates).toHaveLength(0)
  })
})
