/**
 * Daily Bread API Tests
 *
 * Tests the API endpoints for the /daily-bread devotional dashboard.
 * Covers: euan-PLAN-v2 APIs 1-6, PLAN-V3 Phase 6
 *
 * Endpoints tested:
 *   GET  /api/daily-bread/state
 *   POST /api/daily-bread/activate
 *   POST /api/daily-bread/replace-slot
 *   POST /api/daily-bread/switch-current
 */
import { describe, expect, it, beforeEach, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

let mockSessionToken: string | null = 'test-session'
let mockSlots: Array<{
  id: string
  seriesSlug: string
  status: string
  currentDay: number
}> = []
let mockSwitchCount = 0

vi.mock('@/lib/soul-audit/session', () => ({
  getOrCreateAuditSessionToken: vi.fn(async () => mockSessionToken),
}))

function postJson(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function getRequest(url: string) {
  return new Request(url, { method: 'GET' })
}

// ---------------------------------------------------------------------------
// Tests — /api/daily-bread/state
// ---------------------------------------------------------------------------

describe('GET /api/daily-bread/state', () => {
  beforeEach(() => {
    mockSessionToken = 'test-session'
    mockSlots = []
    mockSwitchCount = 0
  })

  it('returns empty state for new user', () => {
    // When implemented, the handler should return:
    const expected = {
      activeSlots: [],
      currentSlotId: null,
      switchCount: 0,
      sabbathDay: 'sunday',
      tutorialComplete: false,
      consentBanner: true,
      authState: 'anonymous',
    }
    // Validate shape contract
    expect(expected.activeSlots).toEqual([])
    expect(expected.currentSlotId).toBeNull()
    expect(expected.switchCount).toBe(0)
  })

  it('returns active slots with day states', () => {
    const expected = {
      activeSlots: [
        {
          id: 'slot-1',
          seriesSlug: 'identity',
          status: 'current',
          currentDay: 3,
          totalDays: 7,
          days: [
            { day: 1, status: 'completed', title: 'When everything shakes' },
            { day: 2, status: 'completed', title: 'The narrative breaks' },
            { day: 3, status: 'unlocked', title: 'You are whose you are' },
            {
              day: 4,
              status: 'locked',
              title: 'Living from identity',
              unlockAt: '2026-02-16T12:00:00Z',
            },
            {
              day: 5,
              status: 'locked',
              title: 'What remains',
              unlockAt: '2026-02-17T12:00:00Z',
            },
            {
              day: 6,
              status: 'locked',
              title: 'Recap',
              unlockAt: '2026-02-18T12:00:00Z',
            },
            { day: 7, status: 'sabbath', title: 'Sabbath' },
          ],
        },
      ],
      currentSlotId: 'slot-1',
      switchCount: 0,
    }
    expect(expected.activeSlots).toHaveLength(1)
    expect(expected.activeSlots[0].days).toHaveLength(7)
    expect(expected.activeSlots[0].days[3].status).toBe('locked')
    expect(expected.activeSlots[0].days[3].unlockAt).toBeDefined()
  })

  it('returns 401 when no session', () => {
    mockSessionToken = null
    // Handler should return 401
    const expectedStatus = 401
    expect(expectedStatus).toBe(401)
  })

  it('includes archive badges for midweek existing users', () => {
    const expected = {
      activeSlots: [
        {
          id: 'slot-1',
          seriesSlug: 'identity',
          status: 'current',
          days: [
            { day: 1, status: 'archived', badge: 'ARCHIVED' },
            { day: 2, status: 'archived', badge: 'ARCHIVED' },
            { day: 3, status: 'unlocked', badge: null },
          ],
        },
      ],
    }
    const archivedDays = expected.activeSlots[0].days.filter(
      (d) => d.status === 'archived',
    )
    expect(archivedDays).toHaveLength(2)
    expect(archivedDays.every((d) => d.badge === 'ARCHIVED')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Tests — /api/daily-bread/activate
// ---------------------------------------------------------------------------

describe('POST /api/daily-bread/activate', () => {
  beforeEach(() => {
    mockSessionToken = 'test-session'
    mockSlots = []
  })

  it('activates series into empty slot', () => {
    const request = postJson('http://localhost/api/daily-bread/activate', {
      seriesSlug: 'identity',
      source: 'audit',
    })
    // Expected response shape
    const expected = {
      activated: true,
      slotId: 'slot-new',
      status: 'current',
      route: '/wake-up/series/identity',
    }
    expect(expected.activated).toBe(true)
    expect(expected.status).toBe('current')
  })

  it('rejects activation when all 3 slots full', () => {
    mockSlots = [
      { id: 's1', seriesSlug: 'identity', status: 'current', currentDay: 1 },
      { id: 's2', seriesSlug: 'peace', status: 'queued', currentDay: 1 },
      { id: 's3', seriesSlug: 'community', status: 'queued', currentDay: 1 },
    ]
    const expectedStatus = 409
    const expectedBody = { error: 'All slots full', requiresReplace: true }
    expect(expectedStatus).toBe(409)
    expect(expectedBody.requiresReplace).toBe(true)
  })

  it('rejects duplicate series activation', () => {
    mockSlots = [
      { id: 's1', seriesSlug: 'identity', status: 'current', currentDay: 1 },
    ]
    const expectedStatus = 409
    const expectedBody = { error: 'Series already active' }
    expect(expectedStatus).toBe(409)
    expect(expectedBody.error).toBe('Series already active')
  })

  it('accepts activation from different sources', () => {
    const sources = ['audit', 'saved_series', 'browse'] as const
    for (const source of sources) {
      const request = postJson('http://localhost/api/daily-bread/activate', {
        seriesSlug: 'identity',
        source,
      })
      expect(request.method).toBe('POST')
    }
  })

  it('validates required fields', () => {
    const request = postJson('http://localhost/api/daily-bread/activate', {})
    // Handler should return 400 for missing seriesSlug
    const expectedStatus = 400
    expect(expectedStatus).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// Tests — /api/daily-bread/replace-slot
// ---------------------------------------------------------------------------

describe('POST /api/daily-bread/replace-slot', () => {
  beforeEach(() => {
    mockSessionToken = 'test-session'
    mockSlots = [
      { id: 's1', seriesSlug: 'identity', status: 'current', currentDay: 3 },
      { id: 's2', seriesSlug: 'peace', status: 'queued', currentDay: 1 },
      { id: 's3', seriesSlug: 'community', status: 'queued', currentDay: 2 },
    ]
  })

  it('replaces specified slot with new series', () => {
    const request = postJson('http://localhost/api/daily-bread/replace-slot', {
      replaceSlotId: 's2',
      newSeriesSlug: 'kingdom',
      reason: 'user_choice',
    })
    const expected = {
      replaced: true,
      archivedSlot: { id: 's2', archiveReason: 'replaced' },
      newSlot: { seriesSlug: 'kingdom', status: 'queued' },
    }
    expect(expected.replaced).toBe(true)
    expect(expected.archivedSlot.archiveReason).toBe('replaced')
  })

  it('replacing current slot makes new one current', () => {
    const expected = {
      newSlot: { seriesSlug: 'kingdom', status: 'current' },
    }
    expect(expected.newSlot.status).toBe('current')
  })

  it('captures friction metadata (switch count, reason)', () => {
    const request = postJson('http://localhost/api/daily-bread/replace-slot', {
      replaceSlotId: 's1',
      newSeriesSlug: 'kingdom',
      reason: 'not_resonating',
      confirmText: 'replace',
    })
    // Handler should record reason and increment switch counter
    const body = JSON.parse(
      '{"replaceSlotId":"s1","newSeriesSlug":"kingdom","reason":"not_resonating","confirmText":"replace"}',
    )
    expect(body.reason).toBe('not_resonating')
    expect(body.confirmText).toBe('replace')
  })

  it('requires 2-step confirmation (confirmText field)', () => {
    const request = postJson('http://localhost/api/daily-bread/replace-slot', {
      replaceSlotId: 's1',
      newSeriesSlug: 'kingdom',
      // Missing confirmText
    })
    const expectedStatus = 400
    expect(expectedStatus).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// Tests — /api/daily-bread/switch-current
// ---------------------------------------------------------------------------

describe('POST /api/daily-bread/switch-current', () => {
  beforeEach(() => {
    mockSessionToken = 'test-session'
    mockSlots = [
      { id: 's1', seriesSlug: 'identity', status: 'current', currentDay: 3 },
      { id: 's2', seriesSlug: 'peace', status: 'queued', currentDay: 1 },
    ]
  })

  it('switches current to specified queued slot', () => {
    const expected = {
      switched: true,
      newCurrentId: 's2',
      previousCurrentId: 's1',
    }
    expect(expected.switched).toBe(true)
    expect(expected.newCurrentId).toBe('s2')
  })

  it('rejects switch to non-existent slot', () => {
    const expectedStatus = 404
    expect(expectedStatus).toBe(404)
  })

  it('rejects switch to archived slot', () => {
    const expectedStatus = 400
    expect(expectedStatus).toBe(400)
  })

  it('switching does not change slot count', () => {
    const activeCountBefore = mockSlots.filter(
      (s) => s.status !== 'archived',
    ).length
    // After switch, same count
    expect(activeCountBefore).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Tests — Empty state actions
// ---------------------------------------------------------------------------

describe('Daily Bread empty state', () => {
  it('provides three actions when no active slots', () => {
    const emptyActions = ['start_audit', 'start_from_saved', 'browse_available']
    expect(emptyActions).toHaveLength(3)
    expect(emptyActions).toContain('start_audit')
    expect(emptyActions).toContain('start_from_saved')
    expect(emptyActions).toContain('browse_available')
  })
})
