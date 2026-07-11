/**
 * F-066 (SA-025) — gentle presence indicator, surface B.
 *
 * Days you showed up are quietly lit: lit/unlit dots only, current day
 * marked, ZERO visible numbers, zero negative framing on gaps. The only
 * count lives in the aria-label screen-reader summary. Data is purely
 * local: the explicit presence log merged with wakeup_progress history.
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import PresenceWeekRow from '@/components/PresenceWeekRow'
import {
  PRESENCE_UPDATED_EVENT,
  getWeekPresence,
  localDateKey,
  recordPresenceToday,
} from '@/lib/presence'

const PRESENCE_KEY = 'euangelion:presence-days'
const WAKEUP_PROGRESS_KEY = 'wakeup_progress'

/** The Sunday that starts the week containing `now` (local time). */
function weekStart(now: Date): Date {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay())
  return start
}

describe('presence lib', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('records today idempotently and reads it back in the week view', () => {
    recordPresenceToday()
    recordPresenceToday()
    const stored = JSON.parse(
      window.localStorage.getItem(PRESENCE_KEY) ?? '[]',
    ) as string[]
    expect(stored).toEqual([localDateKey(new Date())])

    const week = getWeekPresence()
    expect(week.present[week.todayIndex]).toBe(true)
    expect(week.presentCount).toBe(1)
  })

  it('merges wakeup_progress completion history into presence', () => {
    const sunday = weekStart(new Date())
    window.localStorage.setItem(
      WAKEUP_PROGRESS_KEY,
      JSON.stringify([
        { slug: 'identity-day-1', completedAt: sunday.toISOString() },
      ]),
    )
    const week = getWeekPresence()
    expect(week.present[0]).toBe(true)
  })

  it('does not light days outside the current week', () => {
    const lastWeek = new Date(weekStart(new Date()))
    lastWeek.setDate(lastWeek.getDate() - 3)
    window.localStorage.setItem(
      PRESENCE_KEY,
      JSON.stringify([localDateKey(lastWeek)]),
    )
    expect(getWeekPresence().presentCount).toBe(0)
  })
})

describe('PresenceWeekRow', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('lights the dots for locally-known present days (both sources merged)', async () => {
    const now = new Date()
    const sunday = weekStart(now)
    // Source 1: explicit presence log (Daily Bread completions) — today.
    window.localStorage.setItem(
      PRESENCE_KEY,
      JSON.stringify([localDateKey(now)]),
    )
    // Source 2: wake-up reader history — the Sunday of this week.
    window.localStorage.setItem(
      WAKEUP_PROGRESS_KEY,
      JSON.stringify([
        { slug: 'identity-day-1', completedAt: sunday.toISOString() },
      ]),
    )
    const expectedLit = now.getDay() === 0 ? 1 : 2

    render(<PresenceWeekRow />)
    const row = await screen.findByTestId('presence-week-row')

    const lit = row.querySelectorAll('[data-lit="true"]')
    const cells = row.querySelectorAll('[data-lit]')
    expect(cells).toHaveLength(7)
    expect(lit).toHaveLength(expectedLit)

    // Today's cell is lit and marked.
    const today = row.querySelector('[data-today="true"]')
    expect(today).not.toBeNull()
    expect(today?.getAttribute('data-lit')).toBe('true')
  })

  it('renders all seven days unlit — quietly, with no negative framing — when nothing is recorded', async () => {
    render(<PresenceWeekRow />)
    const row = await screen.findByTestId('presence-week-row')
    expect(row.querySelectorAll('[data-lit="false"]')).toHaveLength(7)
    const text = (row.textContent ?? '').toLowerCase()
    expect(text).not.toMatch(/missed|streak|broken|behind|catch up/)
  })

  it('shows no numeric text content — the count lives only in the aria summary', async () => {
    window.localStorage.setItem(
      PRESENCE_KEY,
      JSON.stringify([localDateKey(new Date())]),
    )
    render(<PresenceWeekRow />)
    const row = await screen.findByTestId('presence-week-row')

    expect(row.textContent).not.toMatch(/\d/)
    expect(row.textContent).toContain('THIS WEEK')
    expect(row.getAttribute('aria-label')).toBe(
      'Present 1 of 7 days this week.',
    )
  })

  it('labels are presence-framed: S M T W T F S letters + THIS WEEK, nothing else', async () => {
    render(<PresenceWeekRow />)
    const row = await screen.findByTestId('presence-week-row')
    const letters = Array.from(
      row.querySelectorAll('.presence-week-letter'),
    ).map((el) => el.textContent)
    expect(letters).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S'])
  })

  it('updates live when a completion is recorded (presence + progress events)', async () => {
    render(<PresenceWeekRow />)
    const row = await screen.findByTestId('presence-week-row')
    expect(row.querySelectorAll('[data-lit="true"]')).toHaveLength(0)

    // Daily Bread path: recordPresenceToday dispatches the presence event.
    act(() => {
      recordPresenceToday()
    })
    expect(row.querySelectorAll('[data-lit="true"]')).toHaveLength(1)
    expect(row.getAttribute('aria-label')).toBe(
      'Present 1 of 7 days this week.',
    )

    // Wake-up path: markDevotionalComplete writes wakeup_progress and
    // dispatches progressUpdated — the row folds it in on the same event.
    window.localStorage.clear()
    const sunday = weekStart(new Date())
    window.localStorage.setItem(
      WAKEUP_PROGRESS_KEY,
      JSON.stringify([
        { slug: 'sleep-day-1', completedAt: sunday.toISOString() },
      ]),
    )
    act(() => {
      window.dispatchEvent(new CustomEvent('progressUpdated'))
    })
    expect(
      row
        .querySelector('[data-lit="true"]')
        ?.querySelector('.presence-week-letter')?.textContent,
    ).toBe('S')
  })

  it(`re-renders from the shared event contract (${PRESENCE_UPDATED_EVENT})`, async () => {
    render(<PresenceWeekRow />)
    await screen.findByTestId('presence-week-row')
    window.localStorage.setItem(
      PRESENCE_KEY,
      JSON.stringify([localDateKey(new Date())]),
    )
    act(() => {
      window.dispatchEvent(new CustomEvent(PRESENCE_UPDATED_EVENT))
    })
    expect(
      screen
        .getByTestId('presence-week-row')
        .querySelectorAll('[data-lit="true"]'),
    ).toHaveLength(1)
  })
})
