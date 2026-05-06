import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Tests for src/lib/privacy/retention-cleanup.ts.
 *
 * In-memory mock of the Supabase admin client supporting:
 *   .from(t).select(c).is(col, null).lt(col, val)  → list query
 *   .from(t).select(c).in(col, vals)               → list query
 *   .from(t).delete().in(col, vals)                → cascade delete
 */

type MockTable = Record<string, Array<Record<string, unknown>>>

let tables: MockTable = {}
let failedDeleteTables: Set<string> = new Set()
let failedSelectTables: Set<string> = new Set()

function resetState() {
  tables = {}
  failedDeleteTables = new Set()
  failedSelectTables = new Set()
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
  chain.is = vi.fn((col: string, val: null) => {
    filtered = (tables[table] ?? []).filter((row) => row[col] === val)
    return chain
  })
  chain.lt = vi.fn((col: string, val: string) => {
    filtered = filtered.filter((row) => {
      const v = row[col]
      if (typeof v !== 'string') return false
      return v < val
    })
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
    if (failedSelectTables.has(table)) {
      resolve({ data: null, error: { message: 'simulated select failure' } })
      return
    }
    resolve({ data: filtered, error: null })
  }
  return chain
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => makeChain(table),
  }),
}))

beforeEach(() => {
  resetState()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('runRetentionCleanup', () => {
  const NOW = new Date('2026-05-06T00:00:00.000Z')
  const olderThanCutoff = (days: number) =>
    new Date(NOW.getTime() - days * 24 * 60 * 60_000).toISOString()

  it('does nothing when no anonymous sessions are expired', async () => {
    tables.user_sessions = [
      // anonymous but recent
      {
        session_token: 'fresh',
        user_id: null,
        last_active_at: olderThanCutoff(5),
      },
    ]
    const { runRetentionCleanup } =
      await import('@/lib/privacy/retention-cleanup')
    const result = await runRetentionCleanup({ now: NOW })
    expect(result.expiredSessionsFound).toBe(0)
    expect(result.sessionTokensProcessed).toBe(0)
    expect(result.tablesDeleted).toEqual([])
    expect(result.partialFailures).toEqual([])
    // user_sessions untouched
    expect(tables.user_sessions).toHaveLength(1)
  })

  it('cascades deletes for anonymous sessions older than the cutoff', async () => {
    tables.user_sessions = [
      // expired anonymous (40 days old)
      {
        session_token: 'tok-old',
        user_id: null,
        last_active_at: olderThanCutoff(40),
      },
      // recent anonymous (5 days old) — kept
      {
        session_token: 'tok-fresh',
        user_id: null,
        last_active_at: olderThanCutoff(5),
      },
      // expired but authenticated — kept (we only touch anonymous)
      {
        session_token: 'tok-auth',
        user_id: 'some-user-id',
        last_active_at: olderThanCutoff(40),
      },
    ]
    tables.audit_runs = [
      { id: 'r-old', session_token: 'tok-old' },
      { id: 'r-fresh', session_token: 'tok-fresh' },
      { id: 'r-auth', session_token: 'tok-auth' },
    ]
    tables.devotional_plan_instances = [
      { plan_token: 'plan-old', session_token: 'tok-old' },
    ]
    tables.devotional_plan_days = [{ plan_token: 'plan-old', day_number: 1 }]
    tables.devotional_day_citations = [
      { plan_token: 'plan-old', citation: 'a' },
    ]

    const { runRetentionCleanup } =
      await import('@/lib/privacy/retention-cleanup')
    const result = await runRetentionCleanup({ now: NOW })

    expect(result.expiredSessionsFound).toBe(1)
    expect(result.sessionTokensProcessed).toBe(1)
    // audit_runs: only r-old gone; r-fresh and r-auth preserved
    expect(tables.audit_runs).toEqual([
      { id: 'r-fresh', session_token: 'tok-fresh' },
      { id: 'r-auth', session_token: 'tok-auth' },
    ])
    // plan rows gone
    expect(tables.devotional_plan_days).toEqual([])
    expect(tables.devotional_day_citations).toEqual([])
    // user_sessions: only tok-old gone
    expect(tables.user_sessions).toEqual([
      {
        session_token: 'tok-fresh',
        user_id: null,
        last_active_at: olderThanCutoff(5),
      },
      {
        session_token: 'tok-auth',
        user_id: 'some-user-id',
        last_active_at: olderThanCutoff(40),
      },
    ])
  })

  it('records partialFailures when a delete fails but continues', async () => {
    tables.user_sessions = [
      {
        session_token: 'tok-old',
        user_id: null,
        last_active_at: olderThanCutoff(60),
      },
    ]
    tables.audit_runs = [{ id: 'r-old', session_token: 'tok-old' }]
    tables.annotations = [{ id: 'an-old', session_token: 'tok-old' }]
    failedDeleteTables.add('annotations')

    const { runRetentionCleanup } =
      await import('@/lib/privacy/retention-cleanup')
    const result = await runRetentionCleanup({ now: NOW })

    expect(result.partialFailures).toContain('annotations:session_token')
    // audit_runs still cleaned up
    expect(tables.audit_runs).toEqual([])
    // annotations preserved due to simulated failure
    expect(tables.annotations).toEqual([
      { id: 'an-old', session_token: 'tok-old' },
    ])
  })

  it('respects an overridden windowDays', async () => {
    tables.user_sessions = [
      {
        session_token: 'tok-7d',
        user_id: null,
        last_active_at: olderThanCutoff(7),
      },
    ]
    const { runRetentionCleanup } =
      await import('@/lib/privacy/retention-cleanup')
    // With default 30d window, the 7-day-old session stays
    const defaultResult = await runRetentionCleanup({ now: NOW })
    expect(defaultResult.expiredSessionsFound).toBe(0)

    // Reset for second pass
    tables.user_sessions = [
      {
        session_token: 'tok-7d',
        user_id: null,
        last_active_at: olderThanCutoff(7),
      },
    ]
    // With override windowDays=3, the 7-day-old session is expired
    const overrideResult = await runRetentionCleanup({
      now: NOW,
      windowDays: 3,
    })
    expect(overrideResult.expiredSessionsFound).toBe(1)
  })

  it('records partialFailure when the user_sessions select fails', async () => {
    tables.user_sessions = [
      {
        session_token: 'tok-old',
        user_id: null,
        last_active_at: olderThanCutoff(60),
      },
    ]
    failedSelectTables.add('user_sessions')

    const { runRetentionCleanup } =
      await import('@/lib/privacy/retention-cleanup')
    const result = await runRetentionCleanup({ now: NOW })
    expect(result.partialFailures).toContain('user_sessions:select')
    expect(result.expiredSessionsFound).toBe(0)
  })

  it('returns a result with completedAt later than (or equal to) startedAt', async () => {
    tables.user_sessions = []
    const { runRetentionCleanup } =
      await import('@/lib/privacy/retention-cleanup')
    const result = await runRetentionCleanup({ now: NOW })
    expect(Date.parse(result.completedAt)).toBeGreaterThanOrEqual(
      Date.parse(result.startedAt),
    )
  })
})
