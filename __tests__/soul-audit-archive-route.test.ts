import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as archiveHandler } from '@/app/api/soul-audit/manage/route'

let sessionToken = 'archive-session'
let planInstances: Array<{
  plan_token: string
  series_slug: string
  created_at: string
}> = []
let planDaysByToken = new Map<
  string,
  Array<{
    day_number: number
    content: { title: string }
  }>
>()

vi.mock('@/lib/soul-audit/session', () => ({
  getOrCreateAuditSessionToken: vi.fn(async () => sessionToken),
}))

vi.mock('@/lib/soul-audit/repository', () => ({
  listPlanInstancesForSessionWithFallback: vi.fn(async () => planInstances),
  getAllPlanDaysWithFallback: vi.fn(async (planToken: string) => {
    return planDaysByToken.get(planToken) ?? []
  }),
}))

describe('GET /api/soul-audit/archive', () => {
  beforeEach(() => {
    sessionToken = `archive-${Date.now()}-${Math.random().toString(36).slice(2)}`
    planInstances = []
    planDaysByToken = new Map()
  })

  it('returns /today routes (dedicated plan reader is retired)', async () => {
    planInstances = [
      {
        plan_token: 'plan-abc',
        series_slug: 'identity',
        created_at: '2026-02-20T00:00:00.000Z',
      },
    ]
    planDaysByToken.set('plan-abc', [
      { day_number: 1, content: { title: 'Name it' } },
      { day_number: 2, content: { title: 'Read it' } },
    ])

    const response = await archiveHandler()
    expect(response.status).toBe(200)

    const payload = (await response.json()) as {
      ok: boolean
      archive: Array<{
        planToken: string
        route: string
        days: Array<{ day: number; route: string }>
      }>
    }

    expect(payload.ok).toBe(true)
    // The dedicated /soul-audit/plan/[token] reader is retired — all plan
    // entry points (including archive listings) route to the canonical
    // /daily-bread reader, matching /api/soul-audit/current and /select.
    expect(payload.archive[0]?.route).toBe('/today')
    expect(payload.archive[0]?.days[0]?.route).toBe('/today')
    expect(payload.archive[0]?.days[1]?.route).toBe('/today')
  })
})
