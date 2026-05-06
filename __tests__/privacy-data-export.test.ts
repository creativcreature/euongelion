import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Tests for src/lib/privacy/data-export.ts.
 *
 * Strategy: in-memory mock of the Supabase admin client. Each table
 * has a configurable rowset; the mocked builder supports the patterns
 * the helper uses (.select('*').eq(col, val), .select('*').in(col, vals)).
 */

type MockTable = Record<string, unknown[]>

let tables: MockTable = {}
let failureTables: Set<string> = new Set()

function resetState() {
  tables = {}
  failureTables = new Set()
}

function makeChain(table: string) {
  let filtered: unknown[] = tables[table] ?? []

  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn((col: string, val: unknown) => {
    filtered = (tables[table] ?? []).filter(
      (row) => (row as Record<string, unknown>)[col] === val,
    )
    return chain
  })
  chain.in = vi.fn((col: string, vals: unknown[]) => {
    const set = new Set(vals)
    filtered = (tables[table] ?? []).filter((row) =>
      set.has((row as Record<string, unknown>)[col]),
    )
    return chain
  })
  chain.maybeSingle = vi.fn(() => {
    if (failureTables.has(table)) {
      return Promise.resolve({ data: null, error: { message: 'simulated' } })
    }
    return Promise.resolve({ data: filtered[0] ?? null, error: null })
  })
  // The list-form .select(...).eq(...) chain awaits to a {data, error}
  chain.then = (resolve: (value: unknown) => void) => {
    if (failureTables.has(table)) {
      resolve({ data: null, error: { message: 'simulated' } })
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

describe('exportUserData', () => {
  it('returns an empty-but-valid export when the user has no data', async () => {
    tables.users = [{ id: 'u1', email: 'a@example.com' }]
    tables.user_sessions = []
    const { exportUserData } = await import('@/lib/privacy/data-export')
    const result = await exportUserData('u1')

    expect(result.exportVersion).toBe(1)
    expect(result.user.id).toBe('u1')
    expect(result.user.email).toBe('a@example.com')
    expect(result.sessions).toEqual([])
    expect(result.userKeyedRows.bookmarks).toEqual([])
    expect(result.partialFailures).toEqual([])
  })

  it('gathers session-keyed rows for every session_token the user owns', async () => {
    tables.users = [{ id: 'u1', email: 'a@example.com' }]
    tables.user_sessions = [
      { user_id: 'u1', session_token: 'tok-A' },
      { user_id: 'u1', session_token: 'tok-B' },
    ]
    tables.audit_runs = [
      { id: 'r1', session_token: 'tok-A', response_text: 'reflection 1' },
      { id: 'r2', session_token: 'tok-B', response_text: 'reflection 2' },
      { id: 'r3', session_token: 'tok-OTHER', response_text: 'someone else' },
    ]
    tables.devotional_plan_instances = [
      { plan_token: 'plan-1', session_token: 'tok-A' },
    ]
    tables.devotional_plan_days = [
      { plan_token: 'plan-1', day_number: 1, content: { day: 1 } },
    ]

    const { exportUserData } = await import('@/lib/privacy/data-export')
    const result = await exportUserData('u1')

    expect(result.sessions).toHaveLength(2)
    const tokA = result.sessions.find((s) => s.sessionToken === 'tok-A')
    const tokB = result.sessions.find((s) => s.sessionToken === 'tok-B')
    expect(tokA?.rowsBySource.audit_runs).toHaveLength(1)
    expect(tokB?.rowsBySource.audit_runs).toHaveLength(1)
    // someone else's audit_run never appears
    const allAuditRuns = result.sessions.flatMap(
      (s) => s.rowsBySource.audit_runs as Array<{ id: string }>,
    )
    expect(allAuditRuns.find((r) => r.id === 'r3')).toBeUndefined()
    // plan_token-keyed rows pulled in
    expect(tokA?.rowsBySource.devotional_plan_days).toHaveLength(1)
  })

  it('gathers user_id-keyed rows (bookmarks, user_progress, soul_audit_responses)', async () => {
    tables.users = [{ id: 'u1', email: 'a@example.com' }]
    tables.user_sessions = []
    tables.bookmarks = [
      { id: 'b1', user_id: 'u1', devotional_slug: 'identity-day-1' },
      { id: 'b2', user_id: 'u2', devotional_slug: 'other-user' },
    ]
    tables.user_progress = [{ id: 'p1', user_id: 'u1', current_day: 3 }]
    tables.soul_audit_responses = [
      { id: 's1', user_id: 'u1', response_text: 'my answer' },
    ]
    const { exportUserData } = await import('@/lib/privacy/data-export')
    const result = await exportUserData('u1')

    expect(result.userKeyedRows.bookmarks).toHaveLength(1)
    expect(result.userKeyedRows.userProgress).toHaveLength(1)
    expect(result.userKeyedRows.soulAuditResponses).toHaveLength(1)
    expect((result.userKeyedRows.bookmarks[0] as { id: string }).id).toBe('b1')
  })

  it('records partialFailures when a table errors but completes for the rest', async () => {
    tables.users = [{ id: 'u1', email: 'a@example.com' }]
    tables.user_sessions = [{ user_id: 'u1', session_token: 'tok-A' }]
    tables.audit_runs = [{ id: 'r1', session_token: 'tok-A' }]
    failureTables.add('annotations')

    const { exportUserData } = await import('@/lib/privacy/data-export')
    const result = await exportUserData('u1')

    expect(result.partialFailures).toContain('annotations:session_token')
    // audit_runs still came through
    const tokA = result.sessions.find((s) => s.sessionToken === 'tok-A')
    expect(tokA?.rowsBySource.audit_runs).toHaveLength(1)
  })

  it('formatExportForDownload produces a JSON body and a sane filename', async () => {
    const { exportUserData, formatExportForDownload } =
      await import('@/lib/privacy/data-export')
    tables.users = [{ id: 'user-abc', email: 'x@example.com' }]
    tables.user_sessions = []
    const result = await exportUserData('user-abc')
    const [body, filename] = formatExportForDownload(result)
    expect(body).toContain('"exportVersion": 1')
    expect(filename).toMatch(
      /^euangelion-data-export-user-abc-\d{4}-\d{2}-\d{2}\.json$/,
    )
  })
})
