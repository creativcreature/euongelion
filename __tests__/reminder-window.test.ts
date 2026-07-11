/**
 * F-070 — reminder window matching (the "one quiet word" scheduler brain).
 *
 * These tests pin the canonical window boundaries and the idempotent
 * hourly-send decision in src/lib/push/reminder-window.ts. The Supabase edge
 * function send-daily-push carries a mirrored implementation (it is
 * deliberately self-contained), so these boundary pins are the drift guard:
 * if the windows ever change here, the mirror must change too.
 */
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REMINDER_WINDOW,
  REMINDER_WINDOWS,
  REMINDER_WINDOW_CODES,
  isReminderWindow,
  isValidTimezone,
  localClockFor,
  shouldSendReminderNow,
  windowMatchesHour,
} from '@/lib/push/reminder-window'

describe('reminder window definitions', () => {
  it('offers exactly the four Waking-Up-Moment windows', () => {
    expect(REMINDER_WINDOW_CODES).toEqual([
      'early_morning',
      'morning',
      'midday',
      'evening',
    ])
  })

  it('pins the canonical hour boundaries (mirrored in send-daily-push)', () => {
    expect(REMINDER_WINDOWS.early_morning).toMatchObject({
      startHour: 5,
      endHour: 7,
    })
    expect(REMINDER_WINDOWS.morning).toMatchObject({ startHour: 7, endHour: 9 })
    expect(REMINDER_WINDOWS.midday).toMatchObject({
      startHour: 12,
      endHour: 14,
    })
    expect(REMINDER_WINDOWS.evening).toMatchObject({
      startHour: 19,
      endHour: 21,
    })
  })

  it('defaults to morning — the promise legacy subscribers opted into', () => {
    expect(DEFAULT_REMINDER_WINDOW).toBe('morning')
  })

  it('validates window codes strictly', () => {
    expect(isReminderWindow('morning')).toBe(true)
    expect(isReminderWindow('evening')).toBe(true)
    expect(isReminderWindow('afternoon')).toBe(false)
    expect(isReminderWindow('')).toBe(false)
    expect(isReminderWindow(null)).toBe(false)
    expect(isReminderWindow(7)).toBe(false)
  })
})

describe('windowMatchesHour — [start, end) semantics', () => {
  it.each([
    ['early_morning', 4, false],
    ['early_morning', 5, true],
    ['early_morning', 6, true],
    ['early_morning', 7, false],
    ['morning', 6, false],
    ['morning', 7, true],
    ['morning', 8, true],
    ['morning', 9, false],
    ['midday', 11, false],
    ['midday', 12, true],
    ['midday', 13, true],
    ['midday', 14, false],
    ['evening', 18, false],
    ['evening', 19, true],
    ['evening', 20, true],
    ['evening', 21, false],
  ] as const)('%s @ %i:00 → %s', (window, hour, expected) => {
    expect(windowMatchesHour(window, hour)).toBe(expected)
  })
})

describe('localClockFor — timezone-aware wall clock', () => {
  // Fixed instant: 2026-01-15 12:30 UTC (January — no US DST).
  const instant = new Date('2026-01-15T12:30:00Z')

  it('resolves UTC', () => {
    expect(localClockFor('UTC', instant)).toMatchObject({
      hour: 12,
      isoDate: '2026-01-15',
      timezone: 'UTC',
    })
  })

  it('resolves America/New_York (EST, UTC-5)', () => {
    expect(localClockFor('America/New_York', instant)).toMatchObject({
      hour: 7,
      isoDate: '2026-01-15',
    })
  })

  it('resolves Asia/Tokyo (UTC+9)', () => {
    expect(localClockFor('Asia/Tokyo', instant)).toMatchObject({
      hour: 21,
      isoDate: '2026-01-15',
    })
  })

  it('crosses the date line correctly (Pacific/Auckland, NZDT +13)', () => {
    expect(localClockFor('Pacific/Auckland', instant)).toMatchObject({
      hour: 1,
      isoDate: '2026-01-16',
    })
  })

  it('reports midnight as hour 0, not 24 (h23 cycle)', () => {
    const midnightUtc = new Date('2026-01-15T00:30:00Z')
    expect(localClockFor('UTC', midnightUtc)).toMatchObject({
      hour: 0,
      isoDate: '2026-01-15',
    })
  })

  it('evaluates missing or unresolvable timezones as UTC', () => {
    expect(localClockFor(null, instant).timezone).toBe('UTC')
    expect(localClockFor(undefined, instant).timezone).toBe('UTC')
    expect(localClockFor('Not/AZone', instant).timezone).toBe('UTC')
  })
})

describe('isValidTimezone', () => {
  it('accepts real IANA zones', () => {
    expect(isValidTimezone('America/New_York')).toBe(true)
    expect(isValidTimezone('Europe/London')).toBe(true)
    expect(isValidTimezone('UTC')).toBe(true)
  })

  it('rejects garbage', () => {
    expect(isValidTimezone('Not/AZone')).toBe(false)
    expect(isValidTimezone('')).toBe(false)
  })
})

describe('shouldSendReminderNow — the idempotent hourly decision', () => {
  // 12:30 UTC = 07:30 in New York (inside morning) and 12:30 in UTC
  // (outside morning).
  const instant = new Date('2026-01-15T12:30:00Z')

  it('sends inside the window when nothing was sent today', () => {
    const decision = shouldSendReminderNow({
      window: 'morning',
      timezone: 'America/New_York',
      lastSentDate: null,
      now: instant,
    })
    expect(decision).toEqual({ send: true, localDate: '2026-01-15' })
  })

  it('never double-sends on the same local day (hourly-cron idempotency)', () => {
    const decision = shouldSendReminderNow({
      window: 'morning',
      timezone: 'America/New_York',
      lastSentDate: '2026-01-15',
      now: instant,
    })
    expect(decision.send).toBe(false)
    expect(decision.reason).toBe('already_sent')
  })

  it("sends again the next local day (yesterday's stamp does not block)", () => {
    const decision = shouldSendReminderNow({
      window: 'morning',
      timezone: 'America/New_York',
      lastSentDate: '2026-01-14',
      now: instant,
    })
    expect(decision.send).toBe(true)
  })

  it('skips outside the window', () => {
    const decision = shouldSendReminderNow({
      window: 'morning',
      timezone: 'UTC',
      lastSentDate: null,
      now: instant,
    })
    expect(decision.send).toBe(false)
    expect(decision.reason).toBe('outside_window')
  })

  it('treats a missing window as morning (legacy subscriber promise)', () => {
    const inMorning = shouldSendReminderNow({
      window: null,
      timezone: 'America/New_York',
      lastSentDate: null,
      now: instant,
    })
    expect(inMorning.send).toBe(true)

    const outsideMorning = shouldSendReminderNow({
      window: undefined,
      timezone: 'UTC',
      lastSentDate: null,
      now: instant,
    })
    expect(outsideMorning.send).toBe(false)
  })

  it('treats an unknown window string as morning rather than never sending', () => {
    const decision = shouldSendReminderNow({
      window: 'brunch',
      timezone: 'America/New_York',
      lastSentDate: null,
      now: instant,
    })
    expect(decision.send).toBe(true)
  })

  it('evaluates a NULL timezone as UTC', () => {
    // 07:30 UTC is inside morning when the timezone is unknown.
    const decision = shouldSendReminderNow({
      window: 'morning',
      timezone: null,
      lastSentDate: null,
      now: new Date('2026-01-15T07:30:00Z'),
    })
    expect(decision.send).toBe(true)
    expect(decision.localDate).toBe('2026-01-15')
  })

  it('respects the evening window in the subscriber timezone', () => {
    // 01:30 UTC on Jan 16 = 19:30 on Jan 15 in Chicago (CST, UTC-6).
    const decision = shouldSendReminderNow({
      window: 'evening',
      timezone: 'America/Chicago',
      lastSentDate: null,
      now: new Date('2026-01-16T01:30:00Z'),
    })
    expect(decision.send).toBe(true)
    expect(decision.localDate).toBe('2026-01-15')
  })
})
