/**
 * F-066 (SA-025) — integration: the completion beat and presence recording
 * fire at the REAL trigger point in the Daily Bread reader. Renders the
 * actual DailyBreadView, clicks MARK DAY COMPLETE, and asserts:
 *  - the quiet beat appears once, inline, with this day's scripture reference
 *  - today lands in the local presence log (plan completion is server-side
 *    and leaves no wakeup_progress entry, so this is the only local trace)
 *  - the existing post-read signal (euangelion:just-finished-reading) that
 *    PushOptIn/InstallPrompt consume is untouched by the new beat.
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

describe('Daily Bread reader — completion beat + presence at the real trigger (F-066)', () => {
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

  it('marking a day complete shows the beat once with the scripture reference, records presence, and keeps the post-read signal', async () => {
    const { plan, schedule } = buildPlan()
    render(<DailyBreadView plan={plan} currentDay={1} schedule={schedule} />)

    // No beat before completion.
    expect(screen.queryByTestId('completion-beat')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /mark day complete/i }))

    // The beat appears once, at the completion point, with the day's ref.
    const beat = await screen.findByTestId('completion-beat')
    expect(screen.getAllByTestId('completion-beat')).toHaveLength(1)
    expect(beat.textContent).toContain('Genesis 32:27-28')
    // No counts, no streak framing, no shouting.
    expect(beat.textContent).not.toMatch(/\d+ days?/i)
    expect((beat.textContent ?? '').toLowerCase()).not.toMatch(
      /streak|in a row/,
    )
    expect(beat.textContent).not.toMatch(/!/)

    // Presence: today is now a locally-known present day.
    const presence = JSON.parse(
      window.localStorage.getItem('euangelion:presence-days') ?? '[]',
    ) as string[]
    expect(presence).toContain(localDateKey(new Date()))

    // The pre-existing post-read signal is preserved.
    expect(
      window.localStorage.getItem('euangelion:just-finished-reading'),
    ).toBe('1')

    // The reader's own completed state landed too (chip flow intact).
    await waitFor(() => {
      expect(screen.getByText(/day 1 complete/i)).toBeTruthy()
    })
  })
})
