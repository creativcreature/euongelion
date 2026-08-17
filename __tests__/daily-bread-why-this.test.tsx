/**
 * D-22 (F-074) — "WHY THIS" row on the reader surfaces where a matched
 * plan/series appears outside the Soul Audit results:
 *
 *  - DailyBreadView (AI plan reader): renders the audit's real stored
 *    reasoning under the plan header ONLY when this session's payloads
 *    provably point at this plan.
 *  - CuratedActiveView (active curated series): renders it ONLY for a
 *    soul_audit-sourced series; a manual start is the reader's own choice
 *    and gets no fabricated recommendation line.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DailyBreadView from '@/components/daily-bread/DailyBreadView'
import CuratedActiveView from '@/components/daily-bread/CuratedActiveView'
import type {
  DayContent,
  DayScheduleEntry,
  PlanWithDays,
} from '@/types/soul-audit-plan'

// Heavy client children with their own wiring — out of scope here.
vi.mock('@/components/AudioPlayer', () => ({ default: () => null }))
vi.mock('@/components/PushOptIn', () => ({ default: () => null }))
vi.mock('@/components/ClipButton', () => ({ default: () => null }))
vi.mock('@/components/ModuleRenderer', () => ({ default: () => null }))
vi.mock('@/components/devotional/DevotionalFolio', () => ({
  default: () => null,
}))
vi.mock('@/components/devotional/DevotionalHeadline', () => ({
  default: () => null,
}))
vi.mock('@/components/devotional/DevotionalRhythm', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/components/devotional/AuthorColophon', () => ({
  default: () => null,
}))
vi.mock('@/components/devotional/ChurchYearCard', () => ({
  default: () => null,
}))

const routerPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPush,
    refresh: vi.fn(),
  }),
}))

vi.mock('@/stores/devotionalLibraryStore', () => ({
  useDevotionalLibraryStore: (
    selector: (state: Record<string, unknown>) => unknown,
  ) =>
    selector({
      clearActive: async () => ({ ok: true }),
      save: async () => ({ ok: true }),
      unsave: async () => ({ ok: true }),
      saved: [],
      refresh: async () => {},
      hydrate: async () => {},
    }),
}))

const WHY_REASONING =
  'A restlessness that will not settle — this path sits with stillness before God.'

function seedAuditReason(params: {
  planToken: string | null
  seriesSlug: string
  kind?: string
}) {
  window.sessionStorage.setItem(
    'soul-audit-submit-v2',
    JSON.stringify({
      version: 'v2',
      auditRunId: 'run-1',
      runToken: 'tok-1',
      remainingAudits: 2,
      requiresEssentialConsent: true,
      analyticsOptInDefault: false,
      consentAccepted: true,
      crisis: {
        required: false,
        acknowledged: false,
        resources: [],
        prompt: '',
      },
      options: [
        {
          id: 'opt-1',
          kind: params.kind ?? 'ai_primary',
          rank: 1,
          slug: params.seriesSlug,
          title: 'Matched Path',
          question: 'Q',
          confidence: 0.9,
          reasoning: WHY_REASONING,
        },
      ],
      policy: {
        noAccountRequired: true,
        maxAuditsPerCycle: 3,
        directionCount: 3,
      },
    }),
  )
  window.sessionStorage.setItem(
    'soul-audit-selection-v2',
    JSON.stringify({
      ok: true,
      auditRunId: 'run-1',
      selectionType: params.kind ?? 'ai_primary',
      route: '/daily-bread',
      planToken: params.planToken ?? undefined,
      seriesSlug: params.seriesSlug,
    }),
  )
}

function dayContent(): DayContent {
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
  }
}

function buildPlan(): { plan: PlanWithDays; schedule: DayScheduleEntry[] } {
  const past = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const plan = {
    id: 'plan-1',
    plan_token: 'token-abc',
    audit_run_id: 'run-1',
    session_token: 'sess-1',
    series_slug: 'quieting-the-noise',
    timezone: 'America/New_York',
    timezone_offset_minutes: -300,
    start_policy: 'monday_cycle',
    started_at: past,
    cycle_start_at: past,
    theme: 'Quieting the Noise',
    scripture_anchor: 'Psalm 46',
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

describe('WHY THIS row on reader surfaces (D-22 / F-074)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
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

  it('DailyBreadView: renders the stored reason under the plan header', async () => {
    seedAuditReason({
      planToken: 'token-abc',
      seriesSlug: 'quieting-the-noise',
    })
    const { plan, schedule } = buildPlan()
    render(<DailyBreadView plan={plan} currentDay={1} schedule={schedule} />)

    const why = await screen.findByTestId('daily-bread-why-this')
    expect(why.textContent).toContain('WHY THIS')
    expect(why.textContent).toContain(WHY_REASONING)
    expect(why.textContent).not.toMatch(/!/)
  })

  it('DailyBreadView: no session payloads → no why-row', async () => {
    const { plan, schedule } = buildPlan()
    render(<DailyBreadView plan={plan} currentDay={1} schedule={schedule} />)

    // The reader itself renders… anchored on the day's scripture rather than
    // its title. SA-045 (F-091) moved the title out of DailyBreadView's own
    // <h1> and into <DevotionalHeadline>, which this file mocks to null, so the
    // title is no longer reachable here. The scripture comes from the same day
    // payload and proves the same thing: real day content reached the page.
    expect(await screen.findByText('What is your name?')).toBeInTheDocument()
    // …but no reason is invented.
    expect(screen.queryByTestId('daily-bread-why-this')).toBeNull()
  })

  it('CuratedActiveView: soul_audit source + matching stored reason → why-row', async () => {
    seedAuditReason({
      planToken: null,
      seriesSlug: 'identity',
      kind: 'curated_prefab',
    })
    render(
      <CuratedActiveView
        seriesSlug="identity"
        currentDay={1}
        source="soul_audit"
        startedAt={new Date().toISOString()}
      />,
    )

    const why = await screen.findByTestId('curated-why-this')
    expect(why.textContent).toContain('WHY THIS')
    expect(why.textContent).toContain(WHY_REASONING)
  })

  it('CuratedActiveView: manual_start never shows a why-row, even with stored payloads', async () => {
    seedAuditReason({
      planToken: null,
      seriesSlug: 'identity',
      kind: 'curated_prefab',
    })
    render(
      <CuratedActiveView
        seriesSlug="identity"
        currentDay={1}
        source="manual_start"
        startedAt={new Date().toISOString()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText(/your active devotional/i)).toBeInTheDocument()
    })
    expect(screen.queryByTestId('curated-why-this')).toBeNull()
  })
})
