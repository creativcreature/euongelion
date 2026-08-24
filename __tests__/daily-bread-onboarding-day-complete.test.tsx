/**
 * The reader half of the onboarding-day completion fix.
 *
 * A Wed-Sun starter lands on a plan whose only unlocked day is the day-0 primer
 * — days 1-7 stay gated until Monday 7:00 AM local. The reader offers MARK DAY
 * COMPLETE there like anywhere else, so it has to post day 0 and confirm in the
 * onboarding day's own vocabulary: the plan calls it "Onboarding" in the day
 * chips, and "DAY 0 COMPLETE" is not a phrase the reader has any referent for.
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
import type {
  DayContent,
  DayScheduleEntry,
  PlanWithDays,
} from '@/types/soul-audit-plan'

vi.mock('@/components/AudioPlayer', () => ({ default: () => null }))
vi.mock('@/components/PushOptIn', () => ({ default: () => null }))
vi.mock('@/components/ClipButton', () => ({ default: () => null }))

function dayContent(title: string): DayContent {
  return {
    title,
    hookA: '',
    textB: 'A reading.',
    textBPreview: '',
    centerC: '',
    christConnectionBPrime: '',
    returnAPrime: '',
    scriptureReference: 'James 1:5',
    scriptureText: 'If any of you lacks wisdom, let him ask God.',
    hebrewGreekStudy: null,
    interactiveElement: { type: 'practice', content: '' },
    metaStoryPlacement: '',
    backwardLink: '',
    forwardLink: '',
    reflectionQuestions: [],
    prayer: 'Lord Jesus, steady my pace as I begin this path.',
    endnotes: [],
    previousDaysSummaryForNext: '',
    tier3Extended: null,
  }
}

/**
 * A weekend starter's plan: day 0 unlocked now, the cycle still locked —
 * the exact shape a Saturday sign-up produces.
 */
function buildWeekendPlan(): {
  plan: PlanWithDays
  schedule: DayScheduleEntry[]
} {
  const now = new Date().toISOString()
  const monday = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString()
  const plan = {
    id: 'plan-0',
    plan_token: 'token-weekend',
    audit_run_id: 'run-1',
    session_token: 'sess-1',
    series_slug: 'heart-wisdom-over-doctrine',
    timezone: 'Europe/London',
    timezone_offset_minutes: -60,
    start_policy: 'wed_sun_onboarding',
    started_at: now,
    cycle_start_at: monday,
    theme: 'Heart Wisdom',
    scripture_anchor: 'James 1:5',
    schedule: [],
    status: 'active',
    created_at: now,
    updated_at: null,
    devotional_plan_days: [
      {
        id: 'day-0',
        plan_token: 'token-weekend',
        day_number: 0,
        content: dayContent('Before You Begin'),
        used_chunk_ids: [],
        completed_at: null,
        run_id: null,
        created_at: now,
      },
      {
        id: 'day-1',
        plan_token: 'token-weekend',
        day_number: 1,
        content: dayContent('The Heart That Knows'),
        used_chunk_ids: [],
        completed_at: null,
        run_id: null,
        created_at: now,
      },
    ],
  } satisfies PlanWithDays

  const schedule: DayScheduleEntry[] = [
    { day: 0, date: now, unlock_at: now, status: 'unlocked' },
    { day: 1, date: monday, unlock_at: monday, status: 'locked' },
  ]
  return { plan, schedule }
}

describe('completing the onboarding day in the reader', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: true, nextDayUnlocksAt: null }), {
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

  it('posts day 0 — the number the onboarding day is actually stored under', async () => {
    const { plan, schedule } = buildWeekendPlan()
    render(<DailyBreadView plan={plan} currentDay={0} schedule={schedule} />)

    fireEvent.click(screen.getByRole('button', { name: /mark day complete/i }))

    const mock = globalThis.fetch as unknown as { mock: { calls: unknown[][] } }
    await waitFor(() => expect(mock.mock.calls.length).toBeGreaterThan(0))
    const [url, init] = mock.mock.calls[0] as [string, RequestInit]
    expect(String(url)).toContain('/api/soul-audit/complete-day')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({
      planId: 'token-weekend',
      dayNumber: 0,
    })
  })

  it('confirms in the onboarding day’s own words, not "DAY 0"', async () => {
    const { plan, schedule } = buildWeekendPlan()
    render(<DailyBreadView plan={plan} currentDay={0} schedule={schedule} />)

    fireEvent.click(screen.getByRole('button', { name: /mark day complete/i }))

    expect(await screen.findByText(/onboarding complete/i)).toBeTruthy()
    expect(screen.queryByText(/day 0 complete/i)).toBeNull()
  })

  it('still says DAY 1 COMPLETE for an ordinary cycle day', async () => {
    const { plan } = buildWeekendPlan()
    // Unlock the cycle so day 1 is the selected, completable day.
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const unlocked: DayScheduleEntry[] = [
      { day: 0, date: past, unlock_at: past, status: 'unlocked' },
      { day: 1, date: past, unlock_at: past, status: 'unlocked' },
    ]
    plan.devotional_plan_days[0].completed_at = past
    render(<DailyBreadView plan={plan} currentDay={1} schedule={unlocked} />)

    fireEvent.click(screen.getByRole('button', { name: /mark day complete/i }))
    expect(await screen.findByText(/day 1 complete/i)).toBeTruthy()
  })
})
