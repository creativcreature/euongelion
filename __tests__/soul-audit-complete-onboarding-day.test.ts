import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Completing the onboarding day (day 0) on the Soul Audit plan path.
 *
 * A Wed-Sun starter gets a real, immediately-unlocked day-0 primer
 * ("Before You Begin") prepended to the days 1-7 cycle — persisted as a
 * `devotional_plan_days` row like any other day, and rendered by the reader
 * with a MARK DAY COMPLETE button like any other day.
 *
 * The route, however, bounded `dayNumber` at 1-7, so that button could only
 * ever fail: every weekend starter was told
 * "planId (string) and dayNumber (1-7) are required." and could not record
 * the one day they were able to read. Day 0 is a completable day; the bound
 * is 0-7.
 *
 * The upper bound and the junk-input rejections stay exactly as they were —
 * this widens the floor by one, it does not open the field.
 */

let sessionCookie: string | null = 'sess-1'
let planRow: Record<string, unknown> | null = null
let planError: unknown = null
const updates: Array<{
  values: Record<string, unknown>
  filters: Record<string, unknown>
}> = []

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        name === 'euangelion_audit_session' && sessionCookie
          ? { value: sessionCookie }
          : undefined,
    }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const filters: Record<string, unknown> = {}
      let mode: 'select' | 'update' = 'select'
      let values: Record<string, unknown> = {}
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn(() => chain)
      chain.update = vi.fn((v: Record<string, unknown>) => {
        mode = 'update'
        values = v
        return chain
      })
      chain.eq = vi.fn((col: string, val: unknown) => {
        filters[col] = val
        // The update completes on its final filter (plan_token + day_number).
        if (mode === 'update' && col === 'day_number') {
          updates.push({ values, filters: { ...filters } })
          return Promise.resolve({ error: null })
        }
        return chain
      })
      chain.single = vi.fn(() =>
        Promise.resolve({
          data: table === 'devotional_plan_instances' ? planRow : null,
          error: planError,
        }),
      )
      return chain
    },
  }),
}))

function postRequest(body: unknown) {
  return new Request('http://localhost/api/soul-audit/complete-day', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function deleteRequest(query: string) {
  return new Request(`http://localhost/api/soul-audit/complete-day?${query}`, {
    method: 'DELETE',
  })
}

describe('POST /api/soul-audit/complete-day — the onboarding day', () => {
  beforeEach(() => {
    sessionCookie = 'sess-1'
    planError = null
    planRow = {
      plan_token: 'token-abc',
      schedule: [
        { day: 0, date: 'x', unlock_at: 'x', status: 'unlocked' },
        { day: 1, date: 'y', unlock_at: 'y', status: 'locked' },
      ],
    }
    updates.length = 0
  })

  it('accepts day 0 and records the completion against that day', async () => {
    const { POST } = await import('@/app/api/soul-audit/complete-day/route')
    const res = await POST(
      postRequest({ planId: 'token-abc', dayNumber: 0 }) as never,
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ ok: true })

    // It marked day 0 — not day 1, and not "some day".
    expect(updates).toHaveLength(1)
    expect(updates[0].filters.day_number).toBe(0)
    expect(updates[0].filters.plan_token).toBe('token-abc')
    expect(typeof updates[0].values.completed_at).toBe('string')
  })

  it('still completes an ordinary cycle day', async () => {
    const { POST } = await import('@/app/api/soul-audit/complete-day/route')
    const res = await POST(
      postRequest({ planId: 'token-abc', dayNumber: 3 }) as never,
    )
    expect(res.status).toBe(200)
    expect(updates[0].filters.day_number).toBe(3)
  })

  it.each([-1, 8, 99])('still rejects out-of-range day %i', async (day) => {
    const { POST } = await import('@/app/api/soul-audit/complete-day/route')
    const res = await POST(
      postRequest({ planId: 'token-abc', dayNumber: day }) as never,
    )
    expect(res.status).toBe(400)
    expect(updates).toHaveLength(0)
  })

  it('still rejects a missing plan id', async () => {
    const { POST } = await import('@/app/api/soul-audit/complete-day/route')
    const res = await POST(postRequest({ dayNumber: 0 }) as never)
    expect(res.status).toBe(400)
    expect(updates).toHaveLength(0)
  })

  it('still rejects a non-numeric day', async () => {
    const { POST } = await import('@/app/api/soul-audit/complete-day/route')
    const res = await POST(
      postRequest({ planId: 'token-abc', dayNumber: 'zero' }) as never,
    )
    expect(res.status).toBe(400)
    expect(updates).toHaveLength(0)
  })

  it('still requires a session', async () => {
    sessionCookie = null
    const { POST } = await import('@/app/api/soul-audit/complete-day/route')
    const res = await POST(
      postRequest({ planId: 'token-abc', dayNumber: 0 }) as never,
    )
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/soul-audit/complete-day — undoing the onboarding day', () => {
  beforeEach(() => {
    sessionCookie = 'sess-1'
    planError = null
    planRow = { plan_token: 'token-abc' }
    updates.length = 0
  })

  it('accepts day 0 and clears its completion', async () => {
    const { DELETE } = await import('@/app/api/soul-audit/complete-day/route')
    const res = await DELETE(
      deleteRequest('planId=token-abc&dayNumber=0') as never,
    )

    expect(res.status).toBe(200)
    expect(updates).toHaveLength(1)
    expect(updates[0].filters.day_number).toBe(0)
    expect(updates[0].values.completed_at).toBeNull()
  })

  it.each([-1, 8])('still rejects out-of-range day %i', async (day) => {
    const { DELETE } = await import('@/app/api/soul-audit/complete-day/route')
    const res = await DELETE(
      deleteRequest(`planId=token-abc&dayNumber=${day}`) as never,
    )
    expect(res.status).toBe(400)
    expect(updates).toHaveLength(0)
  })

  it('still rejects a missing day number', async () => {
    const { DELETE } = await import('@/app/api/soul-audit/complete-day/route')
    const res = await DELETE(deleteRequest('planId=token-abc') as never)
    expect(res.status).toBe(400)
    expect(updates).toHaveLength(0)
  })
})
