import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The two-site-states data ruling (F-105, CHANGELOG 2026-08-16); its
 * CHANGELOG SA label collides with the canonical decisions file and is
 * deliberately not cited here. That ruling keyed the signed-in write path
 * of /api/annotations and /api/bookmarks to the AUTH USER ID: both routes
 * set `session_token = user.id` rather than the random hex token in
 * `user_sessions` — and /api/push/subscribe + /api/push/preferences key
 * push_subscriptions the same way. The privacy helpers were not told.
 *
 * The result was a promise the product could not keep in either direction:
 * Settings says a deleted account's notes and highlights are "permanently
 * removed" while the deletion cascade only ever swept user_sessions tokens,
 * and the export claiming to be all of a reader's data omitted the notes
 * that reader wrote. Erasure and access, both incomplete, on the rows a
 * reader would most notice.
 *
 * This file covers the three halves of the fix together, because they are
 * one behaviour split across three modules: deletion sweeps the user id,
 * export gathers it, and the cross-device migration no longer pretends to
 * move rows that have not been keyed that way since that ruling landed.
 */

type MockRow = Record<string, unknown>
type MockTable = Record<string, MockRow[]>
type DeleteCall = { table: string; column: string; values: string[] }
type UpdateCall = { table: string; column: string; filterValue: unknown }

let tables: MockTable = {}
let deletes: DeleteCall[] = []
let updates: UpdateCall[] = []
let authDeleteUserId: string | null = null
/** Tables whose SELECTs fail — for asserting partial-failure labels. */
let failSelectTables: Set<string> = new Set()

function resetState() {
  tables = {}
  deletes = []
  updates = []
  authDeleteUserId = null
  failSelectTables = new Set()
}

/**
 * One in-memory Supabase chain serving all three modules: select for the
 * export, delete for the cascade, update for the migration. Deletes and
 * updates are recorded as well as applied, so a test can assert on the
 * filter values that were sent, not only on the rows left behind.
 */
function makeChain(table: string) {
  let filtered: MockRow[] = tables[table] ?? []
  let mode: 'select' | 'delete' | 'update' = 'select'

  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.delete = vi.fn(() => {
    mode = 'delete'
    return chain
  })
  chain.update = vi.fn(() => {
    mode = 'update'
    return chain
  })
  chain.eq = vi.fn((col: string, val: unknown) => {
    if (mode === 'delete') {
      deletes.push({ table, column: col, values: [String(val)] })
      tables[table] = (tables[table] ?? []).filter((row) => row[col] !== val)
    } else if (mode === 'update') {
      updates.push({ table, column: col, filterValue: val })
    } else {
      filtered = (tables[table] ?? []).filter((row) => row[col] === val)
    }
    return chain
  })
  chain.in = vi.fn((col: string, vals: unknown[]) => {
    const set = new Set(vals)
    if (mode === 'delete') {
      deletes.push({ table, column: col, values: vals.map(String) })
      tables[table] = (tables[table] ?? []).filter((row) => !set.has(row[col]))
    } else {
      filtered = (tables[table] ?? []).filter((row) => set.has(row[col]))
    }
    return chain
  })
  chain.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: filtered[0] ?? null, error: null }),
  )
  chain.then = (resolve: (value: unknown) => void) => {
    if (mode === 'delete' || mode === 'update') {
      resolve({ error: null })
      return
    }
    if (failSelectTables.has(table)) {
      resolve({ data: null, error: { message: 'injected failure' } })
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
          authDeleteUserId = userId
          // simulate the auth.users → public.users FK cascade
          tables.users = (tables.users ?? []).filter((u) => u.id !== userId)
          return { error: null }
        },
      },
    },
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

const USER_ID = 'e6f0a1c2-3b4d-5e6f-7a8b-9c0d1e2f3a4b'

beforeEach(() => {
  resetState()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('deleteUserAccount — user-id-keyed rows (F-105)', () => {
  it('deletes annotations, session_bookmarks, and push_subscriptions keyed to the user id as well as to session tokens', async () => {
    tables.users = [{ id: USER_ID, email: 'reader@example.com' }]
    tables.user_sessions = [{ user_id: USER_ID, session_token: 'tok-A' }]
    tables.annotations = [
      { id: 'an-legacy-anon', session_token: 'tok-A' },
      { id: 'an-signed-in', session_token: USER_ID, body: 'my note' },
      { id: 'an-someone-else', session_token: 'tok-OTHER' },
    ]
    tables.session_bookmarks = [
      { id: 'bm-signed-in', session_token: USER_ID },
      { id: 'bm-someone-else', session_token: 'tok-OTHER' },
    ]
    tables.push_subscriptions = [
      { id: 'ps-signed-in', session_token: USER_ID, endpoint: 'https://p/1' },
      { id: 'ps-someone-else', session_token: 'tok-OTHER' },
    ]

    const { deleteUserAccount } = await import('@/lib/privacy/account-deletion')
    const result = await deleteUserAccount(USER_ID)

    expect(result.partialFailures).toEqual([])
    expect(authDeleteUserId).toBe(USER_ID)
    // The signed-in rows are gone; another reader's rows are untouched.
    expect(tables.annotations).toEqual([
      { id: 'an-someone-else', session_token: 'tok-OTHER' },
    ])
    expect(tables.session_bookmarks).toEqual([
      { id: 'bm-someone-else', session_token: 'tok-OTHER' },
    ])
    expect(tables.push_subscriptions).toEqual([
      { id: 'ps-someone-else', session_token: 'tok-OTHER' },
    ])

    // Both keyings went out in the same filter.
    for (const table of [
      'annotations',
      'session_bookmarks',
      'push_subscriptions',
    ]) {
      const call = deletes.find((d) => d.table === table)
      expect(call?.column).toBe('session_token')
      expect(call?.values).toContain(USER_ID)
      expect(call?.values).toContain('tok-A')
    }
  })

  it('sweeps the user-id-keyed tables even when the user owns no user_sessions rows', async () => {
    // The worst case: a reader whose session cookie has expired or was
    // cleared. Every row they own hangs off the user id alone, so a cascade
    // gated on `sessionTokens.length > 0` would delete none of it.
    tables.users = [{ id: USER_ID, email: 'reader@example.com' }]
    tables.user_sessions = []
    tables.annotations = [{ id: 'an-signed-in', session_token: USER_ID }]
    tables.session_bookmarks = [{ id: 'bm-signed-in', session_token: USER_ID }]
    tables.push_subscriptions = [{ id: 'ps-signed-in', session_token: USER_ID }]

    const { deleteUserAccount } = await import('@/lib/privacy/account-deletion')
    const result = await deleteUserAccount(USER_ID)

    expect(result.sessionTokensProcessed).toBe(0)
    expect(tables.annotations).toEqual([])
    expect(tables.session_bookmarks).toEqual([])
    expect(tables.push_subscriptions).toEqual([])
  })

  it('does not send the user id as a session_token filter to the other tables', async () => {
    // The user id is a session_token value only for the user-id-keyed
    // tables. Sending it everywhere would be a filter that means nothing
    // elsewhere.
    tables.users = [{ id: USER_ID, email: 'reader@example.com' }]
    tables.user_sessions = [{ user_id: USER_ID, session_token: 'tok-A' }]
    tables.audit_runs = [{ id: 'r1', session_token: 'tok-A' }]

    const { deleteUserAccount } = await import('@/lib/privacy/account-deletion')
    await deleteUserAccount(USER_ID)

    const auditRunDelete = deletes.find((d) => d.table === 'audit_runs')
    expect(auditRunDelete?.values).toEqual(['tok-A'])
  })

  it('still deletes the user-id-keyed rows in preserveAuthUser (first-run reset) mode', async () => {
    tables.users = [{ id: USER_ID, email: 'reader@example.com' }]
    tables.user_sessions = [{ user_id: USER_ID, session_token: 'tok-A' }]
    tables.annotations = [{ id: 'an-signed-in', session_token: USER_ID }]
    tables.session_bookmarks = [{ id: 'bm-signed-in', session_token: USER_ID }]
    tables.push_subscriptions = [{ id: 'ps-signed-in', session_token: USER_ID }]

    const { deleteUserAccount } = await import('@/lib/privacy/account-deletion')
    const result = await deleteUserAccount(USER_ID, { preserveAuthUser: true })

    expect(tables.annotations).toEqual([])
    expect(tables.session_bookmarks).toEqual([])
    expect(tables.push_subscriptions).toEqual([])
    expect(result.authUserDeleted).toBe(false)
    expect(tables.users).toEqual([{ id: USER_ID, email: 'reader@example.com' }])
  })
})

describe('exportUserData — user-id-keyed rows (F-105)', () => {
  it('includes annotations, session_bookmarks, and push_subscriptions keyed to the user id', async () => {
    tables.users = [{ id: USER_ID, email: 'reader@example.com' }]
    tables.user_sessions = [{ user_id: USER_ID, session_token: 'tok-A' }]
    tables.annotations = [
      { id: 'an-signed-in', session_token: USER_ID, body: 'my note' },
      { id: 'an-someone-else', session_token: 'tok-OTHER', body: 'not mine' },
    ]
    tables.session_bookmarks = [
      { id: 'bm-signed-in', session_token: USER_ID },
      { id: 'bm-someone-else', session_token: 'tok-OTHER' },
    ]
    tables.push_subscriptions = [
      { id: 'ps-signed-in', session_token: USER_ID, endpoint: 'https://p/1' },
      { id: 'ps-someone-else', session_token: 'tok-OTHER' },
    ]

    const { exportUserData } = await import('@/lib/privacy/data-export')
    const result = await exportUserData(USER_ID)

    expect(result.partialFailures).toEqual([])
    const userKeyed = result.sessions.find((s) => s.sessionToken === USER_ID)
    expect(userKeyed?.rowsBySource.annotations).toEqual([
      { id: 'an-signed-in', session_token: USER_ID, body: 'my note' },
    ])
    expect(userKeyed?.rowsBySource.session_bookmarks).toEqual([
      { id: 'bm-signed-in', session_token: USER_ID },
    ])
    expect(userKeyed?.rowsBySource.push_subscriptions).toEqual([
      { id: 'ps-signed-in', session_token: USER_ID, endpoint: 'https://p/1' },
    ])
    // Shape symmetry: the user-id entry carries the same plan keys the
    // per-token entries always do, structurally empty.
    expect(userKeyed?.rowsBySource.devotional_plan_days).toEqual([])
    expect(userKeyed?.rowsBySource.devotional_day_citations).toEqual([])
    // Nobody else's rows ride along.
    const everyRow = result.sessions.flatMap((s) =>
      Object.values(s.rowsBySource).flat(),
    )
    expect(
      everyRow.filter((row) => (row as MockRow).session_token === 'tok-OTHER'),
    ).toEqual([])
  })

  it('exports the user-id-keyed rows even with no user_sessions rows left', async () => {
    tables.users = [{ id: USER_ID, email: 'reader@example.com' }]
    tables.user_sessions = []
    tables.annotations = [{ id: 'an-signed-in', session_token: USER_ID }]

    const { exportUserData } = await import('@/lib/privacy/data-export')
    const result = await exportUserData(USER_ID)

    expect(result.sessions).toHaveLength(1)
    expect(result.sessions[0].sessionToken).toBe(USER_ID)
    expect(result.sessions[0].rowsBySource.annotations).toHaveLength(1)
  })

  it('adds no phantom session entry when the user has no user-id-keyed rows', async () => {
    tables.users = [{ id: USER_ID, email: 'reader@example.com' }]
    tables.user_sessions = [{ user_id: USER_ID, session_token: 'tok-A' }]
    tables.annotations = [{ id: 'an-legacy-anon', session_token: 'tok-A' }]

    const { exportUserData } = await import('@/lib/privacy/data-export')
    const result = await exportUserData(USER_ID)

    expect(result.sessions.map((s) => s.sessionToken)).toEqual(['tok-A'])
  })

  it('labels a user-id-sweep failure distinctly from the per-token sweep', async () => {
    // One flaky table must not read as two: step 3 reports
    // `annotations:session_token`, the user-id sweep `annotations:user_id`.
    tables.users = [{ id: USER_ID, email: 'reader@example.com' }]
    tables.user_sessions = [{ user_id: USER_ID, session_token: 'tok-A' }]
    failSelectTables = new Set(['annotations'])

    const { exportUserData } = await import('@/lib/privacy/data-export')
    const result = await exportUserData(USER_ID)

    expect(result.partialFailures).toContain('annotations:session_token')
    expect(result.partialFailures).toContain('annotations:user_id')
    expect(
      result.partialFailures.filter((f) => f === 'annotations:session_token'),
    ).toHaveLength(1)
    expect(
      result.partialFailures.filter((f) => f === 'annotations:user_id'),
    ).toHaveLength(1)
  })
})

describe('migrateSessionData — the F-105 dead UPDATEs removed', () => {
  it('no longer issues UPDATEs against annotations or session_bookmarks', async () => {
    const { migrateSessionData } = await import('@/lib/session')
    const result = await migrateSessionData('tok-old', 'tok-new')

    const touched = updates.map((u) => u.table)
    expect(touched).not.toContain('annotations')
    expect(touched).not.toContain('session_bookmarks')
    // The genuinely session-keyed tables still migrate.
    expect(touched).toEqual([
      'devotional_plan_instances',
      'audit_runs',
      'consent_records',
      'soul_audit_jobs',
    ])
    expect(result.updatesAttempted).toBe(4)
  })
})

/**
 * Source-text guard, in the spirit of privacy-table-coverage.test.ts: the
 * two user-id-keyed lists are hand-maintained in separate files, so they
 * can drift apart silently and forever. A table deleted by user id but not
 * exported by user id is the same GDPR asymmetry this fix closes.
 */
function userIdKeyedTablesIn(path: string): string[] {
  const block = readFileSync(path, 'utf8')
    .split('const USER_ID_KEYED_SESSION_TOKEN_TABLES')[1]
    ?.split(']')[0]
  if (block === undefined) {
    throw new Error(
      `Could not find USER_ID_KEYED_SESSION_TOKEN_TABLES in ${path} — was it renamed?`,
    )
  }
  return [...block.matchAll(/'([a-z_]+)'/g)].map((match) => match[1])
}

describe('user-id-keyed table lists stay paired across the privacy helpers', () => {
  it('deletion and export name the same user-id-keyed tables', () => {
    const deletion = userIdKeyedTablesIn('src/lib/privacy/account-deletion.ts')
    const exported = userIdKeyedTablesIn('src/lib/privacy/data-export.ts')
    expect(deletion).toEqual([
      'annotations',
      'session_bookmarks',
      'push_subscriptions',
    ])
    expect(exported).toEqual(deletion)
  })
})
