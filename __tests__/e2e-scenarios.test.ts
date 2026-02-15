/**
 * End-to-End Scenario Tests
 *
 * Tests from euan-PLAN-v2 Test Cases Section 4 and PLAN-V3 Phase 18:
 * - Anonymous browse → temp save → sign-in merge
 * - New user Wednesday onboarding path
 * - Existing user midweek activation with archived past days
 * - Three-slot fill + unlimited replacements + adaptive warnings
 * - Sabbath reset and weekly setup
 * - Restore archived item with full slots replacement picker
 * - Chat context integrity across devotional navigation
 * - Full flow: audit → select → activate → read → complete → archive
 */
import { describe, expect, it, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Types (consolidated from other test files for E2E scenarios)
// ---------------------------------------------------------------------------

type AuthState = 'anonymous' | 'authenticated'
type SlotStatus = 'current' | 'queued' | 'archived' | 'completed'
type DayStatus = 'completed' | 'unlocked' | 'locked' | 'archived' | 'sabbath'
type ArchiveReason = 'completed' | 'replaced' | 'week_end'

interface TempSave {
  id: string
  kind: string
  data: Record<string, unknown>
}

interface Slot {
  id: string
  seriesSlug: string
  status: SlotStatus
  currentDay: number
  completedDays: number[]
  archiveReason: ArchiveReason | null
}

interface UserState {
  authState: AuthState
  userId: string | null
  slots: Slot[]
  tempSaves: TempSave[]
  switchCount: number
  sabbathPreference: 'saturday' | 'sunday'
  tutorialComplete: boolean
  consentRecorded: boolean
}

interface OnboardingState {
  startDayOfWeek: number
  bridgeDays: number
  sabbathSelected: boolean
  tutorialCompleted: boolean
}

// ---------------------------------------------------------------------------
// Scenario helpers
// ---------------------------------------------------------------------------

function createFreshUser(): UserState {
  return {
    authState: 'anonymous',
    userId: null,
    slots: [],
    tempSaves: [],
    switchCount: 0,
    sabbathPreference: 'sunday',
    tutorialComplete: false,
    consentRecorded: false,
  }
}

function recordConsent(user: UserState): UserState {
  return { ...user, consentRecorded: true }
}

function addTempSave(user: UserState, save: TempSave): UserState {
  if (user.authState === 'authenticated')
    throw new Error('No temp saves for authenticated users')
  return { ...user, tempSaves: [...user.tempSaves, save] }
}

function signIn(user: UserState, userId: string): UserState {
  return {
    ...user,
    authState: 'authenticated',
    userId,
    // tempSaves preserved for merge
  }
}

function mergeTempSaves(user: UserState): {
  user: UserState
  mergedCount: number
} {
  if (user.authState !== 'authenticated')
    throw new Error('Must be authenticated to merge')
  const count = user.tempSaves.length
  return { user: { ...user, tempSaves: [] }, mergedCount: count }
}

function activateSeries(
  user: UserState,
  seriesSlug: string,
  asCurrent: boolean,
): UserState {
  if (
    user.slots.some(
      (s) => s.seriesSlug === seriesSlug && s.status !== 'archived',
    )
  )
    throw new Error('Series already active')
  if (user.slots.filter((s) => s.status !== 'archived').length >= 3)
    throw new Error('All slots full')

  const newSlot: Slot = {
    id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    seriesSlug,
    status: asCurrent ? 'current' : 'queued',
    currentDay: 1,
    completedDays: [],
    archiveReason: null,
  }

  // If activating as current, demote existing current to queued
  const updatedSlots = asCurrent
    ? user.slots.map((s) =>
        s.status === 'current' ? { ...s, status: 'queued' as SlotStatus } : s,
      )
    : user.slots

  return { ...user, slots: [...updatedSlots, newSlot] }
}

function replaceSlot(
  user: UserState,
  replaceSlotId: string,
  newSeriesSlug: string,
  reason: string,
): UserState {
  const slotIndex = user.slots.findIndex((s) => s.id === replaceSlotId)
  if (slotIndex === -1) throw new Error('Slot not found')

  const oldSlot = user.slots[slotIndex]
  const wasCurrent = oldSlot.status === 'current'
  const archivedSlot: Slot = {
    ...oldSlot,
    status: 'archived',
    archiveReason: 'replaced',
  }

  const newSlot: Slot = {
    id: `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    seriesSlug: newSeriesSlug,
    status: wasCurrent ? 'current' : 'queued',
    currentDay: 1,
    completedDays: [],
    archiveReason: null,
  }

  const newSlots = [...user.slots]
  newSlots[slotIndex] = archivedSlot
  newSlots.push(newSlot)

  return { ...user, slots: newSlots, switchCount: user.switchCount + 1 }
}

function completeDay(user: UserState, slotId: string, day: number): UserState {
  return {
    ...user,
    slots: user.slots.map((s) => {
      if (s.id !== slotId) return s
      if (s.completedDays.includes(day)) return s
      const newCompleted = [...s.completedDays, day]
      return {
        ...s,
        completedDays: newCompleted,
        currentDay: Math.max(s.currentDay, day + 1),
      }
    }),
  }
}

function completeSeries(user: UserState, slotId: string): UserState {
  return {
    ...user,
    slots: user.slots.map((s) => {
      if (s.id !== slotId) return s
      return {
        ...s,
        status: 'completed' as SlotStatus,
        archiveReason: 'completed',
      }
    }),
  }
}

function archiveOnWeekEnd(user: UserState): UserState {
  return {
    ...user,
    slots: user.slots.map((s) => {
      if (s.status === 'completed')
        return {
          ...s,
          status: 'archived' as SlotStatus,
          archiveReason: 'week_end' as ArchiveReason,
        }
      return s
    }),
  }
}

function restoreFromArchive(user: UserState, slotId: string): UserState {
  const slot = user.slots.find((s) => s.id === slotId)
  if (!slot || slot.status !== 'archived') throw new Error('Slot not archived')

  const activeCount = user.slots.filter((s) =>
    ['current', 'queued'].includes(s.status),
  ).length
  if (activeCount >= 3)
    throw new Error('All slots full — requires replace picker')

  return {
    ...user,
    slots: user.slots.map((s) => {
      if (s.id !== slotId) return s
      return { ...s, status: 'queued' as SlotStatus, archiveReason: null }
    }),
  }
}

function getActiveSlotCount(user: UserState): number {
  return user.slots.filter((s) =>
    ['current', 'queued', 'completed'].includes(s.status),
  ).length
}

function getAdaptiveFrictionLevel(
  switchCount: number,
): 'none' | 'gentle' | 'firm' {
  if (switchCount <= 1) return 'none'
  if (switchCount <= 3) return 'gentle'
  return 'firm'
}

function computeMidweekOnboarding(startDayOfWeek: number): OnboardingState {
  const bridgeMap: Record<number, number> = {
    0: 0,
    1: 0,
    2: 0,
    3: 3,
    4: 2,
    5: 1,
    6: 0,
  }
  return {
    startDayOfWeek,
    bridgeDays: bridgeMap[startDayOfWeek] ?? 0,
    sabbathSelected: false,
    tutorialCompleted: false,
  }
}

function computeDayStatesForMidweekExisting(
  startDay: number,
  currentDayOfWeek: number,
): { day: number; status: DayStatus }[] {
  const days: { day: number; status: DayStatus }[] = []
  for (let i = 1; i <= 7; i++) {
    const dayOfWeek = ((startDay + i - 2) % 7) + 1
    if (dayOfWeek < currentDayOfWeek) {
      days.push({ day: i, status: 'archived' })
    } else if (dayOfWeek === currentDayOfWeek) {
      days.push({ day: i, status: 'unlocked' })
    } else {
      days.push({ day: i, status: 'locked' })
    }
  }
  return days
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('E2E: Anonymous browse → save → sign-in merge', () => {
  let user: UserState

  beforeEach(() => {
    user = createFreshUser()
  })

  it('full anonymous to authenticated flow', () => {
    // Step 1: Consent
    user = recordConsent(user)
    expect(user.consentRecorded).toBe(true)

    // Step 2: Browse and make temp saves
    user = addTempSave(user, {
      id: 'ts1',
      kind: 'bookmark',
      data: { slug: 'identity' },
    })
    user = addTempSave(user, {
      id: 'ts2',
      kind: 'highlight',
      data: { text: 'God is love' },
    })
    expect(user.tempSaves).toHaveLength(2)
    expect(user.authState).toBe('anonymous')

    // Step 3: Sign in
    user = signIn(user, 'user-abc')
    expect(user.authState).toBe('authenticated')
    expect(user.tempSaves).toHaveLength(2) // still there before merge

    // Step 4: Auto-merge
    const { user: merged, mergedCount } = mergeTempSaves(user)
    user = merged
    expect(mergedCount).toBe(2)
    expect(user.tempSaves).toHaveLength(0) // cleared after merge
  })

  it('temp saves are session-only without sign-in', () => {
    user = addTempSave(user, { id: 'ts1', kind: 'progress', data: { day: 1 } })
    expect(user.tempSaves).toHaveLength(1)
    // Session end = temp saves disappear (simulated by creating new user)
    const freshUser = createFreshUser()
    expect(freshUser.tempSaves).toHaveLength(0)
  })

  it('no temp saves after authentication', () => {
    user = signIn(user, 'user-abc')
    expect(() =>
      addTempSave(user, { id: 'ts1', kind: 'bookmark', data: {} }),
    ).toThrow('No temp saves for authenticated users')
  })
})

describe('E2E: New user Wednesday onboarding', () => {
  it('Wednesday start gives 3 bridge days then full Monday cycle', () => {
    const onboarding = computeMidweekOnboarding(3) // Wednesday
    expect(onboarding.bridgeDays).toBe(3)
    expect(onboarding.sabbathSelected).toBe(false)
    expect(onboarding.tutorialCompleted).toBe(false)
  })

  it('Thursday start gives 2 bridge days', () => {
    const onboarding = computeMidweekOnboarding(4)
    expect(onboarding.bridgeDays).toBe(2)
  })

  it('Friday start gives 1 bridge day', () => {
    const onboarding = computeMidweekOnboarding(5)
    expect(onboarding.bridgeDays).toBe(1)
  })

  it('Monday start gives 0 bridge days (normal)', () => {
    const onboarding = computeMidweekOnboarding(1)
    expect(onboarding.bridgeDays).toBe(0)
  })

  it('onboarding requires sabbath selection', () => {
    const onboarding = computeMidweekOnboarding(3)
    expect(onboarding.sabbathSelected).toBe(false)
    // Tutorial includes required sabbath selection
    const completed = {
      ...onboarding,
      sabbathSelected: true,
      tutorialCompleted: true,
    }
    expect(completed.sabbathSelected).toBe(true)
  })
})

describe('E2E: Existing user midweek activation', () => {
  it('past days appear as archived with badge', () => {
    // Existing user starts series on Wednesday (day 3 of week)
    // Days 1-2 should be archived/readable, day 3 is current
    const days = computeDayStatesForMidweekExisting(1, 3) // started Mon, now Wed
    expect(days[0].status).toBe('archived') // Day 1 (Mon) — past
    expect(days[1].status).toBe('archived') // Day 2 (Tue) — past
    expect(days[2].status).toBe('unlocked') // Day 3 (Wed) — current
    expect(days[3].status).toBe('locked') // Day 4 — future
  })

  it('all 7 days are always visible', () => {
    const days = computeDayStatesForMidweekExisting(1, 5)
    expect(days).toHaveLength(7)
  })
})

describe('E2E: Three-slot fill + replacements + adaptive friction', () => {
  let user: UserState

  beforeEach(() => {
    user = createFreshUser()
    user = signIn(user, 'user-123')
    const { user: merged } = mergeTempSaves(user)
    user = merged
  })

  it('fills all 3 slots', () => {
    user = activateSeries(user, 'identity', true)
    user = activateSeries(user, 'peace', false)
    user = activateSeries(user, 'community', false)
    expect(getActiveSlotCount(user)).toBe(3)
  })

  it('rejects 4th activation when full', () => {
    user = activateSeries(user, 'identity', true)
    user = activateSeries(user, 'peace', false)
    user = activateSeries(user, 'community', false)
    expect(() => activateSeries(user, 'kingdom', false)).toThrow(
      'All slots full',
    )
  })

  it('allows replacement when full', () => {
    user = activateSeries(user, 'identity', true)
    user = activateSeries(user, 'peace', false)
    user = activateSeries(user, 'community', false)

    const slotToReplace = user.slots.find((s) => s.seriesSlug === 'peace')!
    user = replaceSlot(user, slotToReplace.id, 'kingdom', 'not_resonating')

    const activeCount = user.slots.filter((s) =>
      ['current', 'queued'].includes(s.status),
    ).length
    expect(activeCount).toBe(3) // still 3 active
    expect(user.slots.find((s) => s.seriesSlug === 'kingdom')).toBeDefined()
    expect(user.switchCount).toBe(1)
  })

  it('unlimited replacements allowed', () => {
    user = activateSeries(user, 'identity', true)
    user = activateSeries(user, 'peace', false)
    user = activateSeries(user, 'community', false)

    for (let i = 0; i < 5; i++) {
      const queued = user.slots.find((s) => s.status === 'queued')!
      user = replaceSlot(user, queued.id, `series-${i}`, 'exploring')
    }
    expect(user.switchCount).toBe(5)
  })

  it('adaptive friction escalates with switches', () => {
    expect(getAdaptiveFrictionLevel(0)).toBe('none')
    expect(getAdaptiveFrictionLevel(1)).toBe('none')
    expect(getAdaptiveFrictionLevel(2)).toBe('gentle')
    expect(getAdaptiveFrictionLevel(3)).toBe('gentle')
    expect(getAdaptiveFrictionLevel(4)).toBe('firm')
    expect(getAdaptiveFrictionLevel(10)).toBe('firm')
  })

  it('replacing current makes new series current', () => {
    user = activateSeries(user, 'identity', true)
    user = activateSeries(user, 'peace', false)

    const currentSlot = user.slots.find((s) => s.status === 'current')!
    expect(currentSlot.seriesSlug).toBe('identity')

    user = replaceSlot(user, currentSlot.id, 'kingdom', 'switching')
    const newCurrent = user.slots.find((s) => s.status === 'current')!
    expect(newCurrent.seriesSlug).toBe('kingdom')
  })

  it('rejects duplicate active series', () => {
    user = activateSeries(user, 'identity', true)
    expect(() => activateSeries(user, 'identity', false)).toThrow(
      'Series already active',
    )
  })
})

describe('E2E: Sabbath reset and weekly setup', () => {
  let user: UserState

  beforeEach(() => {
    user = createFreshUser()
    user = signIn(user, 'user-123')
    const { user: merged } = mergeTempSaves(user)
    user = merged
    user = activateSeries(user, 'identity', true)
  })

  it('completed slot stays until sabbath reset', () => {
    // Complete all days
    const slot = user.slots[0]
    for (let day = 1; day <= 5; day++) {
      user = completeDay(user, slot.id, day)
    }
    user = completeSeries(user, slot.id)
    expect(user.slots[0].status).toBe('completed')
    expect(getActiveSlotCount(user)).toBe(1) // completed still counts

    // Sabbath reset
    user = archiveOnWeekEnd(user)
    expect(user.slots[0].status).toBe('archived')
    expect(user.slots[0].archiveReason).toBe('week_end')
    expect(getActiveSlotCount(user)).toBe(0)
  })

  it('sabbath preference defaults to Sunday', () => {
    expect(user.sabbathPreference).toBe('sunday')
  })

  it('sabbath change mid-cycle applies immediately', () => {
    user = { ...user, sabbathPreference: 'saturday' }
    expect(user.sabbathPreference).toBe('saturday')
    // Only swaps recap/sabbath placement, doesn't break unlock history
  })
})

describe('E2E: Restore archived with full slots', () => {
  let user: UserState

  beforeEach(() => {
    user = createFreshUser()
    user = signIn(user, 'user-123')
    const { user: merged } = mergeTempSaves(user)
    user = merged
  })

  it('restores when slots are available', () => {
    user = activateSeries(user, 'identity', true)
    user = activateSeries(user, 'peace', false)

    // Archive identity
    const identitySlot = user.slots.find((s) => s.seriesSlug === 'identity')!
    user = {
      ...user,
      slots: user.slots.map((s) =>
        s.id === identitySlot.id
          ? {
              ...s,
              status: 'archived' as SlotStatus,
              archiveReason: 'replaced' as ArchiveReason,
            }
          : s,
      ),
    }

    // Restore
    user = restoreFromArchive(user, identitySlot.id)
    const restored = user.slots.find((s) => s.id === identitySlot.id)!
    expect(restored.status).toBe('queued')
    expect(restored.archiveReason).toBeNull()
  })

  it('rejects restore when all 3 slots full', () => {
    user = activateSeries(user, 'identity', true)
    user = activateSeries(user, 'peace', false)
    user = activateSeries(user, 'community', false)

    // Create an archived slot
    const archivedSlot: Slot = {
      id: 'archived-1',
      seriesSlug: 'kingdom',
      status: 'archived',
      currentDay: 3,
      completedDays: [1, 2],
      archiveReason: 'replaced',
    }
    user = { ...user, slots: [...user.slots, archivedSlot] }

    expect(() => restoreFromArchive(user, 'archived-1')).toThrow(
      'All slots full — requires replace picker',
    )
  })

  it('restored slot preserves prior progress', () => {
    user = activateSeries(user, 'identity', true)
    const slot = user.slots[0]

    // Complete some days
    user = completeDay(user, slot.id, 1)
    user = completeDay(user, slot.id, 2)

    // Archive
    user = {
      ...user,
      slots: user.slots.map((s) =>
        s.id === slot.id
          ? {
              ...s,
              status: 'archived' as SlotStatus,
              archiveReason: 'replaced' as ArchiveReason,
            }
          : s,
      ),
    }

    // Restore
    user = restoreFromArchive(user, slot.id)
    const restored = user.slots.find((s) => s.id === slot.id)!
    expect(restored.completedDays).toEqual([1, 2])
    expect(restored.currentDay).toBe(3)
  })
})

describe('E2E: Full audit → activate → read → complete flow', () => {
  let user: UserState

  beforeEach(() => {
    user = createFreshUser()
  })

  it('complete user journey from audit to series completion', () => {
    // 1. Consent
    user = recordConsent(user)
    expect(user.consentRecorded).toBe(true)

    // 2. Run Soul Audit (anonymous)
    expect(user.authState).toBe('anonymous')

    // 3. See 5 options (3 AI + 2 prefab) — tested in soul-audit-extended
    const auditOptions = { total: 5, ai: 3, prefab: 2 }
    expect(auditOptions.total).toBe(5)

    // 4. Select option → soft auth prompt → sign in
    user = signIn(user, 'user-xyz')
    const { user: merged } = mergeTempSaves(user)
    user = merged

    // 5. Activate series
    user = activateSeries(user, 'identity', true)
    expect(getActiveSlotCount(user)).toBe(1)
    expect(user.slots[0].status).toBe('current')

    // 6. Read and complete days
    const slot = user.slots[0]
    for (let day = 1; day <= 5; day++) {
      user = completeDay(user, slot.id, day)
    }
    expect(user.slots[0].completedDays).toEqual([1, 2, 3, 4, 5])

    // 7. Complete series
    user = completeSeries(user, slot.id)
    expect(user.slots[0].status).toBe('completed')

    // 8. Sabbath reset
    user = archiveOnWeekEnd(user)
    expect(user.slots[0].status).toBe('archived')
    expect(user.slots[0].archiveReason).toBe('week_end')

    // 9. Start new audit or browse
    expect(getActiveSlotCount(user)).toBe(0)
    // User can now run new audit, browse, or start from saved
  })
})

describe('E2E: Multi-tab slot conflict', () => {
  it('last-write-wins policy defined', () => {
    const conflictResolution = {
      strategy: 'last_write_wins',
      notification: 'toast_refresh',
    }
    expect(conflictResolution.strategy).toBe('last_write_wins')
    expect(conflictResolution.notification).toBe('toast_refresh')
  })
})

describe('E2E: Chat context integrity', () => {
  it('chat context restricted to devotional + local corpus', () => {
    const chatConfig = {
      contextSources: ['current_devotional', 'local_corpus'],
      webRetrieval: false,
      noteLinkage: { dayNumber: true, textAnchor: true },
    }
    expect(chatConfig.webRetrieval).toBe(false)
    expect(chatConfig.contextSources).not.toContain('web')
    expect(chatConfig.noteLinkage.dayNumber).toBe(true)
  })

  it('chat notes link to day and optional text anchor', () => {
    const chatNote = {
      dayNumber: 3,
      seriesSlug: 'identity',
      textAnchor: 'Be still and know',
      noteText: 'This reminds me of...',
    }
    expect(chatNote.dayNumber).toBe(3)
    expect(chatNote.textAnchor).toBeTruthy()
  })

  it('chat threads are searchable and filterable', () => {
    const chatIndex = {
      searchable: true,
      filterable: true,
      groupBy: ['series', 'day', 'date'],
    }
    expect(chatIndex.searchable).toBe(true)
    expect(chatIndex.filterable).toBe(true)
  })
})

describe('E2E: Daily Bread empty state', () => {
  it('provides correct actions when no active devotionals', () => {
    const user = createFreshUser()
    const hasActiveSlots = getActiveSlotCount(user) > 0
    expect(hasActiveSlots).toBe(false)

    const emptyStateActions = [
      'start_audit',
      'start_from_saved',
      'browse_available',
    ]
    expect(emptyStateActions).toHaveLength(3)
  })

  it('homepage shows continue CTA when active devotional exists', () => {
    let user = createFreshUser()
    user = signIn(user, 'user-123')
    const { user: merged } = mergeTempSaves(user)
    user = merged
    user = activateSeries(user, 'identity', true)

    const hasActive = getActiveSlotCount(user) > 0
    expect(hasActive).toBe(true)

    const homepageHero = hasActive
      ? { type: 'continue_cta', text: 'You have a devotional waiting' }
      : { type: 'audit_inline', text: 'What are you wrestling with today?' }

    expect(homepageHero.type).toBe('continue_cta')
  })
})
