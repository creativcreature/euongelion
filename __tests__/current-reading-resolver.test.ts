import { beforeEach, describe, expect, it, vi } from 'vitest'

// Canonical current-reading resolver contract. This is the single source of
// truth /daily-bread renders from and /api/soul-audit/current reports from, so
// its precedence and failure semantics are proven here once.

let user: { id: string } | null = null
let activeSeries: unknown = null
let ownerPlan: unknown = null
let sessionPlan: unknown = null
let expired = false

const promoteScheduledSwapIfDue = vi.fn(async (_id: string) => activeSeries)
const fetchActivePlanByOwner = vi.fn(async (_id: string) => ownerPlan)
const fetchActivePlan = vi.fn(async (_token: string) => sessionPlan)
const claimPlansForUser = vi.fn(
  async (_id: string, _token: string | null) => {},
)
const archiveExpiredPlan = vi.fn(async (_plan: unknown) => {})
const isPlanExpired = vi.fn((_plan: unknown) => expired)

vi.mock('@/lib/auth', () => ({ getUser: vi.fn(async () => user) }))
vi.mock('@/lib/library/repository', () => ({
  promoteScheduledSwapIfDue: (id: string) => promoteScheduledSwapIfDue(id),
}))
vi.mock('@/lib/soul-audit/plan-queries', () => ({
  fetchActivePlanByOwner: (id: string) => fetchActivePlanByOwner(id),
  fetchActivePlan: (token: string) => fetchActivePlan(token),
  claimPlansForUser: (id: string, token: string | null) =>
    claimPlansForUser(id, token),
  archiveExpiredPlan: (plan: unknown) => archiveExpiredPlan(plan),
  isPlanExpired: (plan: unknown) => isPlanExpired(plan),
}))

import { resolveCurrentReading } from '@/lib/reading/current-reading'

describe('resolveCurrentReading', () => {
  beforeEach(() => {
    user = null
    activeSeries = null
    ownerPlan = null
    sessionPlan = null
    expired = false
    vi.clearAllMocks()
  })

  it('gives the user-controlled active series precedence over any plan', async () => {
    user = { id: 'u1' }
    activeSeries = { series_slug: 'the-harvest', current_day: 3 }
    ownerPlan = { plan_token: 'p1', devotional_plan_days: [] }

    const result = await resolveCurrentReading('sess')

    expect(result).toEqual({
      status: 'active',
      source: 'active_series',
      activeSeries,
    })
    // Active series short-circuits — the plan lookup never runs.
    expect(fetchActivePlanByOwner).not.toHaveBeenCalled()
  })

  it('resolves a signed-in plan ACCOUNT-first, not by session token', async () => {
    user = { id: 'u1' }
    ownerPlan = { plan_token: 'owner-plan', devotional_plan_days: [] }
    sessionPlan = { plan_token: 'session-plan', devotional_plan_days: [] }

    const result = await resolveCurrentReading('sess')

    expect(result).toMatchObject({
      status: 'active',
      source: 'soul_audit_plan',
    })
    expect((result as { plan: { plan_token: string } }).plan.plan_token).toBe(
      'owner-plan',
    )
    expect(claimPlansForUser).toHaveBeenCalledWith('u1', 'sess')
    // Account-first winner means the session fallback is not consulted.
    expect(fetchActivePlan).not.toHaveBeenCalled()
  })

  it('falls back to the session plan for an anonymous reader', async () => {
    user = null
    sessionPlan = { plan_token: 'session-plan', devotional_plan_days: [] }

    const result = await resolveCurrentReading('sess')

    expect(result).toMatchObject({
      status: 'active',
      source: 'soul_audit_plan',
    })
    expect(fetchActivePlan).toHaveBeenCalledWith('sess')
  })

  it('archives an expired plan and reports a confirmed empty state', async () => {
    user = { id: 'u1' }
    ownerPlan = { plan_token: 'zombie', devotional_plan_days: [] }
    expired = true

    const result = await resolveCurrentReading('sess')

    expect(archiveExpiredPlan).toHaveBeenCalledWith(ownerPlan)
    expect(result).toEqual({ status: 'empty' })
  })

  it('reports empty when nothing is active anywhere', async () => {
    user = { id: 'u1' }
    const result = await resolveCurrentReading('sess')
    expect(result).toEqual({ status: 'empty' })
  })

  it('reports empty for an anonymous reader with no session token', async () => {
    user = null
    const result = await resolveCurrentReading(null)
    expect(result).toEqual({ status: 'empty' })
    expect(fetchActivePlan).not.toHaveBeenCalled()
  })

  it('surfaces an active_series read failure as unavailable, never empty', async () => {
    user = { id: 'u1' }
    promoteScheduledSwapIfDue.mockRejectedValueOnce(
      new Error('active_series read failed: connection reset'),
    )

    const result = await resolveCurrentReading('sess')

    expect(result.status).toBe('unavailable')
    expect((result as { error: Error }).error).toBeInstanceOf(Error)
  })

  it('surfaces a plan read failure as unavailable, never empty', async () => {
    user = { id: 'u1' }
    fetchActivePlanByOwner.mockRejectedValueOnce(new Error('db timeout'))

    const result = await resolveCurrentReading('sess')

    expect(result.status).toBe('unavailable')
  })
})
