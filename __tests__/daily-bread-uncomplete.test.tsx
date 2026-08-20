/**
 * Undoing a completion on the Soul Audit plan path.
 *
 * SA-111 gave the curated-series reader an undo. This is the same gap on the
 * plan reader, which stores completion as `completed_at` on the plan day rather
 * than as a `user_progress` row — different data model, identical problem: a
 * reader who taps MARK DAY COMPLETE by accident had no way back.
 *
 * The subtle part is local state. Completing deliberately avoids a reload (it
 * loses scroll and motion), so the component carries a session-local set. The
 * undo needs a SYMMETRIC override: the `dayRecord` that came down with the plan
 * still carries the old timestamp, so clearing the "completed" set alone would
 * leave the UI insisting the day is done.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DailyBreadView from '@/components/today/DailyBreadView'
import { localDateKey } from '@/lib/presence'
import type {
  DayContent,
  DayScheduleEntry,
  PlanWithDays,
} from '@/types/soul-audit-plan'

// Heavy client children with their own wiring — out of scope here.
vi.mock('@/components/AudioPlayer', () => ({ default: () => null }))
vi.mock('@/components/PushOptIn', () => ({ default: () => null }))
vi.mock('@/components/ClipButton', () => ({ default: () => null }))

function dayContent(overrides: Partial<DayContent> = {}): DayContent {
  return {
    title: 'The Name You Answer To',
    hookA: '',
    textB: 'A reading about identity.',
    textBPreview: '',
    centerC: '',
    christConnectionBPrime: '',
    returnAPrime: '',
    scriptureReference: 'Genesis 32:27-28',
    scriptureText: 'What is your name?',
    hebrewGreekStudy: null,
    interactiveElement: { type: 'practice', content: '' },
    metaStoryPlacement: '',
    backwardLink: '',
    forwardLink: '',
    reflectionQuestions: [],
    prayer: 'Settle us, Lord.',
    endnotes: [],
    previousDaysSummaryForNext: '',
    tier3Extended: null,
    ...overrides,
  }
}

function buildPlan(): { plan: PlanWithDays; schedule: DayScheduleEntry[] } {
  const past = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const plan = {
    id: 'plan-1',
    plan_token: 'token-abc',
    audit_run_id: 'run-1',
    session_token: 'sess-1',
    series_slug: 'identity',
    timezone: 'America/New_York',
    timezone_offset_minutes: -300,
    start_policy: 'monday_cycle',
    started_at: past,
    cycle_start_at: past,
    theme: 'Identity',
    scripture_anchor: 'Genesis 32',
    schedule: [],
    status: 'active',
    created_at: past,
    updated_at: null,
    devotional_plan_days: [
      {
        id: 'day-1',
        plan_token: 'token-abc',
        day_number: 1,
        content: dayContent(),
        used_chunk_ids: [],
        completed_at: null,
        run_id: null,
        created_at: past,
      },
    ],
  } satisfies PlanWithDays
  const schedule: DayScheduleEntry[] = [
    { day: 1, date: past, unlock_at: past, status: 'unlocked' },
  ]
  return { plan, schedule }
}

describe('un-completing a plan day', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    )
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('offers MARK AS UNREAD once a day is complete, and takes the completion back', async () => {
    const { plan, schedule } = buildPlan()
    render(<DailyBreadView plan={plan} currentDay={1} schedule={schedule} />)

    // Not offered before there is anything to undo.
    expect(screen.queryByRole('button', { name: /mark as unread/i })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /mark day complete/i }))
    const undo = await screen.findByRole('button', { name: /mark as unread/i })
    fireEvent.click(undo)

    // Genuinely taken back: the mark control returns.
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /mark day complete/i }),
      ).toBeTruthy(),
    )
  })

  it('sends a DELETE for that plan and day, not a second POST', async () => {
    const { plan, schedule } = buildPlan()
    render(<DailyBreadView plan={plan} currentDay={1} schedule={schedule} />)
    fireEvent.click(screen.getByRole('button', { name: /mark day complete/i }))
    const undo = await screen.findByRole('button', { name: /mark as unread/i })

    const mock = globalThis.fetch as unknown as { mock: { calls: unknown[][] } }
    const before = mock.mock.calls.length
    fireEvent.click(undo)

    await waitFor(() => expect(mock.mock.calls.length).toBeGreaterThan(before))
    const last = mock.mock.calls[mock.mock.calls.length - 1] as [
      string,
      RequestInit,
    ]
    expect(String(last[0])).toContain('/api/soul-audit/complete-day')
    expect(String(last[0])).toContain('dayNumber=1')
    expect(last[1]?.method).toBe('DELETE')
  })
})
