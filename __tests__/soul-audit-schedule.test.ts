import { describe, expect, it } from 'vitest'
import {
  isPlanDayUnlocked,
  resolveStartPolicy,
} from '@/lib/soul-audit/schedule'

describe('Soul Audit schedule policy edge cases', () => {
  it('returns monday_cycle when start date is Monday', () => {
    const nowUtc = new Date('2026-02-16T14:00:00.000Z') // Monday
    const policy = resolveStartPolicy(nowUtc, 0)
    expect(policy.startPolicy).toBe('monday_cycle')
  })

  it('returns tuesday_archived_monday when start date is Tuesday', () => {
    const nowUtc = new Date('2026-02-17T14:00:00.000Z') // Tuesday
    const policy = resolveStartPolicy(nowUtc, 0)
    expect(policy.startPolicy).toBe('tuesday_archived_monday')
  })

  it('returns wed_sun_onboarding when start date is Friday', () => {
    const nowUtc = new Date('2026-02-20T14:00:00.000Z') // Friday
    const policy = resolveStartPolicy(nowUtc, 0)
    expect(policy.startPolicy).toBe('wed_sun_onboarding')
    expect(policy.onboardingVariant).toBe('friday_1_day')
    expect(policy.onboardingDays).toBe(1)
  })

  it('returns 3-day onboarding variant for Wednesday starts', () => {
    const nowUtc = new Date('2026-02-18T14:00:00.000Z') // Wednesday
    const policy = resolveStartPolicy(nowUtc, 0)
    expect(policy.startPolicy).toBe('wed_sun_onboarding')
    expect(policy.onboardingVariant).toBe('wednesday_3_day')
    expect(policy.onboardingDays).toBe(3)
  })

  it('returns 2-day onboarding variant for Thursday starts', () => {
    const nowUtc = new Date('2026-02-19T14:00:00.000Z') // Thursday
    const policy = resolveStartPolicy(nowUtc, 0)
    expect(policy.startPolicy).toBe('wed_sun_onboarding')
    expect(policy.onboardingVariant).toBe('thursday_2_day')
    expect(policy.onboardingDays).toBe(2)
  })

  it('unlocks onboarding day for wed_sun_onboarding policy', () => {
    const result = isPlanDayUnlocked({
      nowUtc: new Date('2026-02-20T14:00:00.000Z'),
      policy: 'wed_sun_onboarding',
      cycleStartAtIso: '2026-02-23T07:00:00.000Z',
      dayNumber: 0,
      offsetMinutes: 0,
    })
    expect(result.unlocked).toBe(true)
    expect(result.onboarding).toBe(true)
  })

  it('unlocks archived Monday on Tuesday-start policy for day 1', () => {
    const result = isPlanDayUnlocked({
      nowUtc: new Date('2026-02-17T14:00:00.000Z'),
      policy: 'tuesday_archived_monday',
      cycleStartAtIso: '2026-02-16T07:00:00.000Z',
      dayNumber: 1,
      offsetMinutes: 0,
    })
    expect(result.unlocked).toBe(true)
    expect(result.archived).toBe(true)
  })

  it('locks future day until 7AM local time', () => {
    const result = isPlanDayUnlocked({
      nowUtc: new Date('2026-02-16T06:59:00.000Z'),
      policy: 'monday_cycle',
      cycleStartAtIso: '2026-02-16T07:00:00.000Z',
      dayNumber: 1,
      offsetMinutes: 0,
    })
    expect(result.unlocked).toBe(false)
    expect(result.message).toMatch(/7:00 AM local time/)
  })
})
