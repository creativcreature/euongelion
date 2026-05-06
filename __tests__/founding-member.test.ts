import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Tests for the Founding Member helpers
 * (src/lib/billing/founding-member.ts).
 *
 * Strategy: build a tiny in-memory `users` table abstraction that the
 * mocked Supabase client reads from + writes to. Each test resets the
 * table, exercises one path, and asserts on the resulting state.
 */

type UserRow = {
  id: string
  email: string
  founding_member_at: string | null
}

let usersTable: UserRow[] = []
let lookupShouldFail = false

function resetTable() {
  usersTable = []
  lookupShouldFail = false
}

function findUser(id: string): UserRow | undefined {
  return usersTable.find((u) => u.id === id)
}

function makeChain(rows: UserRow[]) {
  // Generic chain that supports the Supabase patterns used by the helper:
  //   .from('users').select(...).eq(col, val).maybeSingle()
  //   .from('users').select('id', { count: 'exact', head: true }).not(col, op, null)
  //   .from('users').update(values).eq(col, val).is(col, null).select(...).maybeSingle()
  let filteredRows = rows.slice()
  let updateValues: Record<string, unknown> | null = null
  let countMode = false

  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(
    (_cols?: string, opts?: { count?: 'exact'; head?: boolean }) => {
      if (opts?.count === 'exact') countMode = true
      return chain
    },
  )
  chain.update = vi.fn((values: Record<string, unknown>) => {
    updateValues = values
    return chain
  })
  chain.eq = vi.fn((col: keyof UserRow, val: unknown) => {
    filteredRows = filteredRows.filter((r) => r[col] === val)
    return chain
  })
  chain.is = vi.fn((col: keyof UserRow, val: null) => {
    filteredRows = filteredRows.filter((r) => r[col] === val)
    return chain
  })
  chain.not = vi.fn((col: keyof UserRow, op: string, val: null) => {
    if (op === 'is' && val === null) {
      filteredRows = filteredRows.filter((r) => r[col] !== null)
    }
    return chain
  })
  chain.maybeSingle = vi.fn(() => {
    if (lookupShouldFail) {
      return Promise.resolve({ data: null, error: { message: 'simulated' } })
    }
    if (updateValues) {
      // Apply the update to all matching rows
      for (const row of filteredRows) {
        const original = findUser(row.id)
        if (original) Object.assign(original, updateValues)
      }
      const updated = filteredRows[0]
        ? { ...findUser(filteredRows[0].id)! }
        : null
      return Promise.resolve({ data: updated, error: null })
    }
    return Promise.resolve({
      data: filteredRows[0] ? { ...filteredRows[0] } : null,
      error: null,
    })
  })
  // For the count(head=true) path:
  // The helper awaits the chain after .not(...) — Supabase resolves to
  // { count, error }. Proxy that via a then().
  chain.then = (resolve: (value: unknown) => void) => {
    if (countMode) {
      resolve({
        count: filteredRows.length,
        error: lookupShouldFail ? { message: 'simulated' } : null,
      })
      return
    }
    resolve({ data: filteredRows, error: null })
  }
  return chain
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== 'users') throw new Error(`Unexpected table: ${table}`)
      return makeChain(usersTable)
    },
  }),
}))

beforeEach(async () => {
  resetTable()
  // Invalidate the helper's internal count cache between tests
  const mod = await import('@/lib/billing/founding-member')
  mod.clearFoundingMemberCountCache()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('readFoundingMemberAt', () => {
  it('returns null for null userId', async () => {
    const { readFoundingMemberAt } =
      await import('@/lib/billing/founding-member')
    expect(await readFoundingMemberAt(null)).toBeNull()
  })

  it('returns the timestamp when the user holds the badge', async () => {
    usersTable.push({
      id: 'user-1',
      email: 'a@example.com',
      founding_member_at: '2026-05-05T10:00:00.000Z',
    })
    const { readFoundingMemberAt } =
      await import('@/lib/billing/founding-member')
    expect(await readFoundingMemberAt('user-1')).toBe(
      '2026-05-05T10:00:00.000Z',
    )
  })

  it('returns null when the user does not hold the badge', async () => {
    usersTable.push({
      id: 'user-2',
      email: 'b@example.com',
      founding_member_at: null,
    })
    const { readFoundingMemberAt } =
      await import('@/lib/billing/founding-member')
    expect(await readFoundingMemberAt('user-2')).toBeNull()
  })

  it('returns null when the user does not exist', async () => {
    const { readFoundingMemberAt } =
      await import('@/lib/billing/founding-member')
    expect(await readFoundingMemberAt('nonexistent')).toBeNull()
  })

  it('returns null on lookup failure (Supabase down)', async () => {
    lookupShouldFail = true
    const { readFoundingMemberAt } =
      await import('@/lib/billing/founding-member')
    expect(await readFoundingMemberAt('user-1')).toBeNull()
  })
})

describe('getFoundingMemberCount', () => {
  it('returns 0 of 500 on an empty table', async () => {
    const { getFoundingMemberCount, FOUNDING_MEMBER_CAP } =
      await import('@/lib/billing/founding-member')
    const c = await getFoundingMemberCount()
    expect(c.claimed).toBe(0)
    expect(c.total).toBe(FOUNDING_MEMBER_CAP)
    expect(c.full).toBe(false)
  })

  it('counts non-null founding_member_at rows', async () => {
    for (let i = 0; i < 7; i++) {
      usersTable.push({
        id: `user-${i}`,
        email: `${i}@example.com`,
        founding_member_at:
          i < 3 ? null : new Date(Date.now() - i * 1000).toISOString(),
      })
    }
    const { getFoundingMemberCount } =
      await import('@/lib/billing/founding-member')
    const c = await getFoundingMemberCount()
    expect(c.claimed).toBe(4)
    expect(c.full).toBe(false)
  })

  it('returns full=true once cap is reached', async () => {
    for (let i = 0; i < 500; i++) {
      usersTable.push({
        id: `u${i}`,
        email: `${i}@example.com`,
        founding_member_at: new Date().toISOString(),
      })
    }
    const { getFoundingMemberCount } =
      await import('@/lib/billing/founding-member')
    const c = await getFoundingMemberCount()
    expect(c.claimed).toBe(500)
    expect(c.full).toBe(true)
  })

  it('returns 0/500 fallback on Supabase failure', async () => {
    lookupShouldFail = true
    const { getFoundingMemberCount } =
      await import('@/lib/billing/founding-member')
    const c = await getFoundingMemberCount()
    expect(c.claimed).toBe(0)
    expect(c.full).toBe(false)
  })
})

describe('claimFoundingMemberSlot', () => {
  it('awards a slot to a fresh user when capacity exists', async () => {
    usersTable.push({
      id: 'fresh-user',
      email: 'fresh@example.com',
      founding_member_at: null,
    })
    const { claimFoundingMemberSlot } =
      await import('@/lib/billing/founding-member')
    const result = await claimFoundingMemberSlot('fresh-user')
    expect(result.claimed).toBe(true)
    if (result.claimed) {
      expect(typeof result.claimedAt).toBe('string')
    }
    expect(findUser('fresh-user')?.founding_member_at).not.toBeNull()
  })

  it('returns already_held when the user already has the badge', async () => {
    usersTable.push({
      id: 'has-badge',
      email: 'has@example.com',
      founding_member_at: '2026-04-01T00:00:00.000Z',
    })
    const { claimFoundingMemberSlot } =
      await import('@/lib/billing/founding-member')
    const result = await claimFoundingMemberSlot('has-badge')
    expect(result.claimed).toBe(false)
    if (!result.claimed) {
      expect(result.reason).toBe('already_held')
    }
  })

  it('returns user_not_found when the user row is missing', async () => {
    const { claimFoundingMemberSlot } =
      await import('@/lib/billing/founding-member')
    const result = await claimFoundingMemberSlot('ghost')
    expect(result.claimed).toBe(false)
    if (!result.claimed) {
      expect(result.reason).toBe('user_not_found')
    }
  })

  it('returns cap_reached when 500 slots are already claimed', async () => {
    for (let i = 0; i < 500; i++) {
      usersTable.push({
        id: `u${i}`,
        email: `${i}@example.com`,
        founding_member_at: new Date().toISOString(),
      })
    }
    usersTable.push({
      id: 'late',
      email: 'late@example.com',
      founding_member_at: null,
    })
    const { claimFoundingMemberSlot } =
      await import('@/lib/billing/founding-member')
    const result = await claimFoundingMemberSlot('late')
    expect(result.claimed).toBe(false)
    if (!result.claimed) {
      expect(result.reason).toBe('cap_reached')
    }
    // Late user should still have null
    expect(findUser('late')?.founding_member_at).toBeNull()
  })

  it('is idempotent — calling twice returns already_held the second time', async () => {
    usersTable.push({
      id: 'twice',
      email: 'twice@example.com',
      founding_member_at: null,
    })
    const { claimFoundingMemberSlot } =
      await import('@/lib/billing/founding-member')
    const first = await claimFoundingMemberSlot('twice')
    expect(first.claimed).toBe(true)
    const second = await claimFoundingMemberSlot('twice')
    expect(second.claimed).toBe(false)
    if (!second.claimed) {
      expect(second.reason).toBe('already_held')
    }
  })
})
