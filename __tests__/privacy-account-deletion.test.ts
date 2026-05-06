import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Tests for src/lib/privacy/account-deletion.ts.
 *
 * The mock replays the cascade: each table starts with seeded rows;
 * delete calls remove matching rows; the test asserts on the resulting
 * empty state for the user's data and on the deletion result shape.
 */

type MockTable = Record<string, Array<Record<string, unknown>>>

let tables: MockTable = {}
let failedDeleteTables: Set<string> = new Set()
let authDeleteUserResult: { error: { message: string } | null } = {
  error: null,
}
let authDeleteUserCalled = false
let authDeleteUserId: string | null = null

function resetState() {
  tables = {}
  failedDeleteTables = new Set()
  authDeleteUserResult = { error: null }
  authDeleteUserCalled = false
  authDeleteUserId = null
}

function makeChain(table: string) {
  let filtered = tables[table] ?? []
  let mode: 'select' | 'delete' = 'select'

  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.delete = vi.fn(() => {
    mode = 'delete'
    return chain
  })
  chain.eq = vi.fn((col: string, val: unknown) => {
    if (mode === 'delete') {
      if (failedDeleteTables.has(table)) return chain
      tables[table] = (tables[table] ?? []).filter((row) => row[col] !== val)
    } else {
      filtered = (tables[table] ?? []).filter((row) => row[col] === val)
    }
    return chain
  })
  chain.in = vi.fn((col: string, vals: unknown[]) => {
    const set = new Set(vals)
    if (mode === 'delete') {
      if (failedDeleteTables.has(table)) return chain
      tables[table] = (tables[table] ?? []).filter((row) => !set.has(row[col]))
    } else {
      filtered = (tables[table] ?? []).filter((row) => set.has(row[col]))
    }
    return chain
  })
  chain.then = (resolve: (value: unknown) => void) => {
    if (mode === 'delete') {
      resolve({
        error: failedDeleteTables.has(table)
          ? { message: 'simulated delete failure' }
          : null,
      })
      return
    }
    resolve({ data: filtered, error: null })
  }
  return chain
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => makeChain(table),
    auth: {
      admin: {
        deleteUser: async (userId: string) => {
          authDeleteUserCalled = true
          authDeleteUserId = userId
          if (authDeleteUserResult.error === null) {
            // simulate auth.users → public.users CASCADE
            tables.users = (tables.users ?? []).filter((u) => u.id !== userId)
            tables.bookmarks = (tables.bookmarks ?? []).filter(
              (b) => b.user_id !== userId,
            )
            tables.user_progress = (tables.user_progress ?? []).filter(
              (p) => p.user_id !== userId,
            )
            tables.soul_audit_responses = (
              tables.soul_audit_responses ?? []
            ).filter((s) => s.user_id !== userId)
          }
          return authDeleteUserResult
        },
      },
    },
  }),
}))

beforeEach(() => {
  resetState()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('deleteUserAccount', () => {
  it('cascades across all session-keyed and user-keyed tables on the happy path', async () => {
    tables.users = [{ id: 'u1', email: 'a@example.com' }]
    tables.user_sessions = [
      { user_id: 'u1', session_token: 'tok-A' },
      { user_id: 'u1', session_token: 'tok-B' },
    ]
    tables.audit_runs = [
      { id: 'r1', session_token: 'tok-A' },
      { id: 'r2', session_token: 'tok-B' },
      { id: 'r3', session_token: 'tok-OTHER' },
    ]
    tables.devotional_plan_instances = [
      { plan_token: 'plan-1', session_token: 'tok-A' },
    ]
    tables.devotional_plan_days = [{ plan_token: 'plan-1', day_number: 1 }]
    tables.devotional_day_citations = [{ plan_token: 'plan-1', citation: 'a' }]
    tables.bookmarks = [
      { id: 'b1', user_id: 'u1' },
      { id: 'b2', user_id: 'u2' },
    ]

    const { deleteUserAccount } = await import('@/lib/privacy/account-deletion')
    const result = await deleteUserAccount('u1')

    expect(result.userId).toBe('u1')
    expect(result.authUserDeleted).toBe(true)
    expect(result.partialFailures).toEqual([])
    expect(result.sessionTokensProcessed).toBe(2)
    // user's session-keyed rows gone, other user's row preserved
    expect(tables.audit_runs).toEqual([
      { id: 'r3', session_token: 'tok-OTHER' },
    ])
    // plan-keyed rows gone
    expect(tables.devotional_plan_days).toEqual([])
    expect(tables.devotional_day_citations).toEqual([])
    // user_sessions gone
    expect(tables.user_sessions).toEqual([])
    // auth.users delete cascaded to bookmarks, user_progress, soul_audit_responses
    expect(authDeleteUserCalled).toBe(true)
    expect(authDeleteUserId).toBe('u1')
    expect(tables.bookmarks).toEqual([{ id: 'b2', user_id: 'u2' }])
    expect(tables.users).toEqual([])
  })

  it('records partialFailures when a table fails but continues', async () => {
    tables.users = [{ id: 'u1', email: 'a@example.com' }]
    tables.user_sessions = [{ user_id: 'u1', session_token: 'tok-A' }]
    tables.audit_runs = [{ id: 'r1', session_token: 'tok-A' }]
    tables.annotations = [{ id: 'an1', session_token: 'tok-A' }]
    failedDeleteTables.add('annotations')

    const { deleteUserAccount } = await import('@/lib/privacy/account-deletion')
    const result = await deleteUserAccount('u1')

    expect(result.partialFailures).toContain('annotations:session_token')
    expect(result.authUserDeleted).toBe(true)
    // audit_runs still got deleted
    expect(tables.audit_runs).toEqual([])
    // annotations preserved due to simulated failure
    expect(tables.annotations).toEqual([{ id: 'an1', session_token: 'tok-A' }])
  })

  it('records partialFailure when auth.users delete fails — and does NOT mark authUserDeleted=true', async () => {
    tables.users = [{ id: 'u1', email: 'a@example.com' }]
    tables.user_sessions = []
    authDeleteUserResult = {
      error: { message: 'simulated auth delete failure' },
    }

    const { deleteUserAccount } = await import('@/lib/privacy/account-deletion')
    const result = await deleteUserAccount('u1')

    expect(result.authUserDeleted).toBe(false)
    expect(
      result.partialFailures.some((f) => f.startsWith('auth.users:id')),
    ).toBe(true)
    // public.users row preserved (no cascade fired)
    expect(tables.users).toEqual([{ id: 'u1', email: 'a@example.com' }])
  })

  it('is idempotent — second call sees nothing and still returns ok', async () => {
    tables.users = [{ id: 'u1', email: 'a@example.com' }]
    tables.user_sessions = []

    const { deleteUserAccount } = await import('@/lib/privacy/account-deletion')
    const first = await deleteUserAccount('u1')
    expect(first.authUserDeleted).toBe(true)
    const second = await deleteUserAccount('u1')
    // user_sessions still empty, no rows to find — but no errors
    expect(second.sessionTokensProcessed).toBe(0)
    expect(second.partialFailures).toEqual([])
  })

  it('records non-zero sessionTokensProcessed for users with multiple sessions', async () => {
    tables.users = [{ id: 'u1', email: 'a@example.com' }]
    tables.user_sessions = [
      { user_id: 'u1', session_token: 'tok-A' },
      { user_id: 'u1', session_token: 'tok-B' },
      { user_id: 'u1', session_token: 'tok-C' },
    ]
    const { deleteUserAccount } = await import('@/lib/privacy/account-deletion')
    const result = await deleteUserAccount('u1')
    expect(result.sessionTokensProcessed).toBe(3)
  })

  it('returns a result with completedAt later than (or equal to) startedAt', async () => {
    tables.users = [{ id: 'u1', email: 'a@example.com' }]
    tables.user_sessions = []
    const { deleteUserAccount } = await import('@/lib/privacy/account-deletion')
    const result = await deleteUserAccount('u1')
    expect(Date.parse(result.completedAt)).toBeGreaterThanOrEqual(
      Date.parse(result.startedAt),
    )
  })
})
