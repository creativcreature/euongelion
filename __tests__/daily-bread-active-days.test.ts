import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as activeDaysHandler } from '@/app/api/daily-bread/active-days/route'

let sessionToken = 'daily-bread-session'
let dayLockingEnabled = false
let latestPlan: {
  plan_token: string
  series_slug: string
  start_policy:
    | 'monday_cycle'
    | 'tuesday_archived_monday'
    | 'wed_sun_onboarding'
  cycle_start_at: string
  timezone_offset_minutes: number
} | null = null
let planDays: Array<{
  day_number: number
  content: {
    title: string
    scriptureReference: string
  }
}> = []
let unlockResolver: (dayNumber: number) => {
  unlocked: boolean
  archived: boolean
  onboarding: boolean
  message: string
} = () => ({
  unlocked: true,
  archived: false,
  onboarding: false,
  message: '',
})

vi.mock('@/lib/soul-audit/session', () => ({
  getOrCreateAuditSessionToken: vi.fn(async () => sessionToken),
}))

vi.mock('@/lib/day-locking', () => ({
  isDayLockingEnabledForRequest: vi.fn(() => dayLockingEnabled),
}))

vi.mock('@/lib/soul-audit/repository', () => ({
  getLatestPlanInstanceForSessionWithFallback: vi.fn(async () => latestPlan),
  getAllPlanDaysWithFallback: vi.fn(async () => planDays),
}))

vi.mock('@/lib/soul-audit/schedule', () => ({
  isPlanDayUnlocked: vi.fn(({ dayNumber }: { dayNumber: number }) =>
    unlockResolver(dayNumber),
  ),
}))

describe('GET /api/daily-bread/active-days', () => {
  beforeEach(() => {
    sessionToken = `daily-bread-${Date.now()}-${Math.random().toString(36).slice(2)}`
    dayLockingEnabled = false
    latestPlan = null
    planDays = []
    unlockResolver = () => ({
      unlocked: true,
      archived: false,
      onboarding: false,
      message: '',
    })
  })

  it('returns hasPlan false when no active plan exists', async () => {
    const response = await activeDaysHandler(
      new Request('http://localhost/api/daily-bread/active-days') as never,
    )
    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      ok: boolean
      hasPlan: boolean
      days: unknown[]
    }
    expect(payload.ok).toBe(true)
    expect(payload.hasPlan).toBe(false)
    expect(payload.days).toEqual([])
  })

  it('marks latest unlocked day as current when day locking is disabled', async () => {
    latestPlan = {
      plan_token: 'token-123',
      series_slug: 'identity',
      start_policy: 'monday_cycle',
      cycle_start_at: new Date().toISOString(),
      timezone_offset_minutes: 0,
    }
    planDays = [
      {
        day_number: 1,
        content: { title: 'Name It', scriptureReference: 'Psalm 46:10' },
      },
      {
        day_number: 2,
        content: { title: 'Read It', scriptureReference: 'Isaiah 40:31' },
      },
      {
        day_number: 3,
        content: { title: 'Walk It Out', scriptureReference: 'James 1:22' },
      },
    ]

    const response = await activeDaysHandler(
      new Request('http://localhost/api/daily-bread/active-days') as never,
    )
    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      hasPlan: boolean
      currentDay: number
      dayLocking: 'enabled' | 'disabled'
      days: Array<{ day: number; status: string }>
    }

    expect(payload.hasPlan).toBe(true)
    expect(payload.dayLocking).toBe('disabled')
    expect(payload.currentDay).toBe(3)
    expect(payload.days[0].status).toBe('unlocked')
    expect(payload.days[1].status).toBe('unlocked')
    expect(payload.days[2].status).toBe('current')
  })

  it('returns archived, current, and locked statuses when day locking is enabled', async () => {
    dayLockingEnabled = true
    latestPlan = {
      plan_token: 'token-xyz',
      series_slug: 'peace',
      start_policy: 'tuesday_archived_monday',
      cycle_start_at: new Date().toISOString(),
      timezone_offset_minutes: 0,
    }
    planDays = [
      {
        day_number: 1,
        content: { title: 'Archive Day', scriptureReference: 'Psalm 13:5' },
      },
      {
        day_number: 2,
        content: { title: 'Current Day', scriptureReference: 'John 14:27' },
      },
      {
        day_number: 3,
        content: { title: 'Locked Day', scriptureReference: 'Phil 4:6-7' },
      },
    ]

    unlockResolver = (dayNumber) => {
      if (dayNumber === 1) {
        return {
          unlocked: true,
          archived: true,
          onboarding: false,
          message: '',
        }
      }
      if (dayNumber === 2) {
        return {
          unlocked: true,
          archived: false,
          onboarding: false,
          message: '',
        }
      }
      return {
        unlocked: false,
        archived: false,
        onboarding: false,
        message: "This day isn't ready yet.",
      }
    }

    const response = await activeDaysHandler(
      new Request('http://localhost/api/daily-bread/active-days') as never,
    )
    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      currentDay: number
      dayLocking: 'enabled' | 'disabled'
      days: Array<{ day: number; status: string; lockMessage?: string }>
    }

    expect(payload.dayLocking).toBe('enabled')
    expect(payload.currentDay).toBe(2)

    const day1 = payload.days.find((day) => day.day === 1)
    const day2 = payload.days.find((day) => day.day === 2)
    const day3 = payload.days.find((day) => day.day === 3)

    expect(day1?.status).toBe('archived')
    expect(day2?.status).toBe('current')
    expect(day3?.status).toBe('locked')
    expect(day3?.lockMessage).toContain("isn't ready")
  })
})
