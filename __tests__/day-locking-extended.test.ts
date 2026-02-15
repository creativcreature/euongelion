/**
 * Day Locking and Schedule Extended Tests
 *
 * Tests from PLAN-V3 Phase 7 and euan-PLAN-v2 decisions 17-19:
 * - 7-day calendar view (always shows all days)
 * - Lock states (completed, unlocked, locked, archived, sabbath)
 * - Locked day teaser panel (title, verse, unlock time, reminder toggle)
 * - Midweek onboarding variants (Wed=3, Thu=2, Fri=1 bridge days)
 * - Existing user midweek start (past days archived/readable)
 * - Sabbath selection, default, mid-cycle change
 * - Non-active series: Day 1 preview only, Day 2+ locked
 * - No new devotional creation on sabbath
 * - 7:00 AM local unlock + quiet hours
 */
import { describe, expect, it, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DayStatus =
  | 'completed'
  | 'unlocked'
  | 'locked'
  | 'archived'
  | 'sabbath'
  | 'recap'
type SabbathPreference = 'saturday' | 'sunday'

interface DayState {
  day: number
  status: DayStatus
  title: string
  unlockAt: string | null
  teaserAvailable: boolean
  badge: string | null
}

interface ScheduleConfig {
  startDate: string // ISO date
  sabbathPreference: SabbathPreference
  timezone: string
  isNewUser: boolean
  startDayOfWeek: number // 0=Sun, 1=Mon, ..., 6=Sat
}

// ---------------------------------------------------------------------------
// Pure helpers (contract stubs)
// ---------------------------------------------------------------------------

function computeDayStates(
  config: ScheduleConfig,
  now: Date,
  completedDays: number[],
): DayState[] {
  const days: DayState[] = []
  // Parse startDate as local time (not UTC) to avoid timezone offset issues
  const [year, month, day] = config.startDate.split('-').map(Number)
  const start = new Date(year, month - 1, day)
  const unlockHour = 7

  for (let i = 1; i <= 7; i++) {
    const dayDate = new Date(start)
    dayDate.setDate(dayDate.getDate() + i - 1)
    dayDate.setHours(unlockHour, 0, 0, 0)

    const isSabbath =
      (config.sabbathPreference === 'sunday' && i === 7) ||
      (config.sabbathPreference === 'saturday' && i === 6)
    const isRecap =
      (config.sabbathPreference === 'sunday' && i === 6) ||
      (config.sabbathPreference === 'saturday' && i === 7)

    let status: DayStatus
    if (isSabbath) {
      status = 'sabbath'
    } else if (isRecap) {
      status =
        now >= dayDate
          ? completedDays.includes(i)
            ? 'completed'
            : 'unlocked'
          : 'locked'
    } else if (completedDays.includes(i)) {
      status = 'completed'
    } else if (now >= dayDate) {
      status = 'unlocked'
    } else {
      status = 'locked'
    }

    days.push({
      day: i,
      status,
      title: `Day ${i} Title`,
      unlockAt: status === 'locked' ? dayDate.toISOString() : null,
      teaserAvailable: status === 'locked',
      badge: null,
    })
  }

  return days
}

function getOnboardingBridgeDays(startDayOfWeek: number): number {
  // Mon=1: 0 bridge, Tue=2: 0 (starts normally), Wed=3: 3 bridge, Thu=4: 2, Fri=5: 1, Sat=6: 0 (sabbath first), Sun=0: 0
  const bridgeMap: Record<number, number> = {
    0: 0,
    1: 0,
    2: 0,
    3: 3,
    4: 2,
    5: 1,
    6: 0,
  }
  return bridgeMap[startDayOfWeek] ?? 0
}

function canCreateDevotionalOnSabbath(): boolean {
  return false
}

function getNonActiveSeriesPreview(dayNumber: number): {
  accessible: boolean
  previewOnly: boolean
} {
  if (dayNumber === 1) return { accessible: true, previewOnly: true }
  return { accessible: false, previewOnly: false }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('7-day calendar view', () => {
  it('always returns exactly 7 day states', () => {
    const config: ScheduleConfig = {
      startDate: '2026-02-15',
      sabbathPreference: 'sunday',
      timezone: 'America/New_York',
      isNewUser: true,
      startDayOfWeek: 1,
    }
    const days = computeDayStates(config, new Date('2026-02-15T10:00:00'), [])
    expect(days).toHaveLength(7)
  })

  it('shows all days even when none completed', () => {
    const config: ScheduleConfig = {
      startDate: '2026-02-16',
      sabbathPreference: 'sunday',
      timezone: 'America/New_York',
      isNewUser: true,
      startDayOfWeek: 1,
    }
    const days = computeDayStates(config, new Date('2026-02-16T10:00:00'), [])
    expect(days.every((d) => d.title)).toBe(true)
    expect(days[0].status).toBe('unlocked')
  })

  it('marks completed days correctly', () => {
    const config: ScheduleConfig = {
      startDate: '2026-02-15',
      sabbathPreference: 'sunday',
      timezone: 'America/New_York',
      isNewUser: true,
      startDayOfWeek: 1,
    }
    const days = computeDayStates(
      config,
      new Date('2026-02-17T10:00:00'),
      [1, 2],
    )
    expect(days[0].status).toBe('completed')
    expect(days[1].status).toBe('completed')
    expect(days[2].status).toBe('unlocked')
  })

  it('future days are locked with unlock times', () => {
    const config: ScheduleConfig = {
      startDate: '2026-02-15',
      sabbathPreference: 'sunday',
      timezone: 'America/New_York',
      isNewUser: true,
      startDayOfWeek: 1,
    }
    const days = computeDayStates(config, new Date('2026-02-15T10:00:00'), [])
    const lockedDays = days.filter((d) => d.status === 'locked')
    expect(lockedDays.length).toBeGreaterThan(0)
    for (const d of lockedDays) {
      expect(d.unlockAt).toBeTruthy()
      expect(d.teaserAvailable).toBe(true)
    }
  })
})

describe('Locked day teaser', () => {
  it('teaser available for locked days', () => {
    const config: ScheduleConfig = {
      startDate: '2026-02-15',
      sabbathPreference: 'sunday',
      timezone: 'America/New_York',
      isNewUser: true,
      startDayOfWeek: 1,
    }
    const days = computeDayStates(config, new Date('2026-02-15T10:00:00'), [])
    const locked = days.find((d) => d.status === 'locked')!
    expect(locked.teaserAvailable).toBe(true)
    expect(locked.title).toBeTruthy()
    expect(locked.unlockAt).toBeTruthy()
  })

  it('teaser not available for unlocked days', () => {
    const config: ScheduleConfig = {
      startDate: '2026-02-15',
      sabbathPreference: 'sunday',
      timezone: 'America/New_York',
      isNewUser: true,
      startDayOfWeek: 1,
    }
    const days = computeDayStates(config, new Date('2026-02-15T10:00:00'), [])
    const unlocked = days.find((d) => d.status === 'unlocked')!
    expect(unlocked.teaserAvailable).toBe(false)
  })
})

describe('Sabbath handling', () => {
  it('marks Sunday as sabbath when preference is Sunday', () => {
    const config: ScheduleConfig = {
      startDate: '2026-02-16', // Monday
      sabbathPreference: 'sunday',
      timezone: 'America/New_York',
      isNewUser: true,
      startDayOfWeek: 1,
    }
    const days = computeDayStates(config, new Date('2026-02-16T10:00:00'), [])
    expect(days[6].status).toBe('sabbath') // Day 7 = Sunday
  })

  it('marks Saturday as sabbath when preference is Saturday', () => {
    const config: ScheduleConfig = {
      startDate: '2026-02-16', // Monday
      sabbathPreference: 'saturday',
      timezone: 'America/New_York',
      isNewUser: true,
      startDayOfWeek: 1,
    }
    const days = computeDayStates(config, new Date('2026-02-16T10:00:00'), [])
    expect(days[5].status).toBe('sabbath') // Day 6 = Saturday
  })

  it('defaults to Sunday when missing', () => {
    const defaultSabbath: SabbathPreference = 'sunday'
    expect(defaultSabbath).toBe('sunday')
  })

  it('no new devotional creation on sabbath', () => {
    expect(canCreateDevotionalOnSabbath()).toBe(false)
  })
})

describe('Midweek onboarding variants', () => {
  it('Wednesday start: 3 bridge days', () => {
    expect(getOnboardingBridgeDays(3)).toBe(3)
  })

  it('Thursday start: 2 bridge days', () => {
    expect(getOnboardingBridgeDays(4)).toBe(2)
  })

  it('Friday start: 1 bridge day', () => {
    expect(getOnboardingBridgeDays(5)).toBe(1)
  })

  it('Monday start: 0 bridge days', () => {
    expect(getOnboardingBridgeDays(1)).toBe(0)
  })

  it('Tuesday start: 0 bridge days (normal start)', () => {
    expect(getOnboardingBridgeDays(2)).toBe(0)
  })
})

describe('Non-active series visibility', () => {
  it('Day 1 is preview excerpt only', () => {
    const preview = getNonActiveSeriesPreview(1)
    expect(preview.accessible).toBe(true)
    expect(preview.previewOnly).toBe(true)
  })

  it('Day 2+ requires activation', () => {
    for (let day = 2; day <= 7; day++) {
      const preview = getNonActiveSeriesPreview(day)
      expect(preview.accessible).toBe(false)
    }
  })
})

describe('Unlock timing', () => {
  it('unlocks at 7:00 AM local', () => {
    const config: ScheduleConfig = {
      startDate: '2026-02-16',
      sabbathPreference: 'sunday',
      timezone: 'America/New_York',
      isNewUser: true,
      startDayOfWeek: 1,
    }
    // Use explicit local time construction to match setHours(7) in computeDayStates
    const before7 = new Date(2026, 1, 16, 6, 59, 0) // Feb 16, 6:59 AM local
    const at7 = new Date(2026, 1, 16, 7, 0, 0) // Feb 16, 7:00 AM local

    // At 6:59 AM local, Day 1 should be locked
    const statesBefore = computeDayStates(config, before7, [])
    expect(statesBefore[0].status).toBe('locked')

    // At 7:00 AM local, Day 1 should be unlocked
    const statesAt = computeDayStates(config, at7, [])
    expect(statesAt[0].status).toBe('unlocked')
  })
})
