import { cookies } from 'next/headers'
import {
  archiveExpiredPlan,
  claimPlansForUser,
  fetchActivePlan,
  fetchActivePlanByOwner,
  getCurrentDay,
  isPlanExpired,
} from '@/lib/soul-audit/plan-queries'
import { AUDIT_SESSION_COOKIE } from '@/lib/soul-audit/session'
import { getUser } from '@/lib/auth'
import {
  getActiveSeries,
  promoteScheduledSwapIfDue,
} from '@/lib/library/repository'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import DailyBreadView from '@/components/daily-bread/DailyBreadView'
import EmptyState from '@/components/daily-bread/EmptyState'
import HoldingState from '@/components/daily-bread/HoldingState'
import CompletionState from '@/components/daily-bread/CompletionState'
import CuratedActiveView from '@/components/daily-bread/CuratedActiveView'
import ScheduledSwapBanner from '@/components/daily-bread/ScheduledSwapBanner'
import type { DayScheduleEntry } from '@/types/soul-audit-plan'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Daily Bread',
  description:
    'Your active devotional, plus today’s reading queued from your Soul Audit plan. One short, slow reading a day — scripture-led, no streak-shaming.',
  alternates: { canonical: '/daily-bread' },
  openGraph: {
    title: 'Daily Bread | Euangelion',
    description:
      'Your active devotional and today’s reading, served warm. Scripture-led, no streak-shaming.',
    url: 'https://euangelion.app/daily-bread',
    type: 'website',
  },
}

export default async function DailyBreadPage() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(AUDIT_SESSION_COOKIE)?.value ?? null

  // User-controlled active series takes precedence over Soul Audit plan
  // resolution. If the user has manually started (or restarted from
  // archive) a curated series, render that — Soul Audit only fills in
  // when no manual choice exists. Errors (e.g. missing Supabase config
  // in a dev/preview env) downgrade to null so the page falls through
  // to the existing Soul Audit resolution path.
  const userActive = await resolveUserActiveSeries()
  if (userActive) {
    return (
      <Shell>
        <ScheduledSwapBanner />
        <CuratedActiveView
          seriesSlug={userActive.series_slug}
          currentDay={userActive.current_day}
          source={userActive.source}
          startedAt={userActive.started_at}
        />
      </Shell>
    )
  }

  // SA-032 (2026-07-27): account-first plan resolution — a signed-in
  // user's plan follows the ACCOUNT, not the cookie, so sign-out /
  // sign-in / new devices resume exactly where they left off. The
  // session-cookie path remains for anonymous readers. Whichever path
  // resolves, the plan flows through the same holding / completion /
  // reader logic below.
  const ownerPlan = await resolveOwnerPlan(sessionToken)
  let plan =
    ownerPlan ?? (sessionToken ? await fetchActivePlan(sessionToken) : null)

  // SA-033: a plan whose week ended more than a grace period ago is a
  // zombie — archive it and show the empty state instead of greeting
  // the reader with weeks-old content forever.
  if (plan && isPlanExpired(plan)) {
    await archiveExpiredPlan(plan)
    plan = null
  }

  if (!plan) {
    return (
      <Shell>
        <ScheduledSwapBanner />
        <EmptyState />
      </Shell>
    )
  }

  const schedule = (plan.schedule || []) as DayScheduleEntry[]

  // SOURCE-OF-TRUTH #22: a Wed-Sun start serves an onboarding devotional FIRST
  // (an immediately-unlocked day 0), then the full cycle unlocks Monday. When
  // such a day-0 entry exists and its content row is present, render the reader
  // now instead of the bare "Day 1 unlocks Monday" holding screen.
  const onboardingEntry = schedule.find((e) => e.day === 0)
  const onboardingReady =
    !!onboardingEntry &&
    !!onboardingEntry.unlock_at &&
    new Date(onboardingEntry.unlock_at) <= new Date() &&
    plan.devotional_plan_days.some((d) => d.day_number === 0)

  if (!onboardingReady) {
    // No onboarding day to serve: fall back to the holding screen when the
    // first cycle day is still gated (Wed-Sun without a day-0 row, or any plan
    // whose earliest entry is in the future).
    const firstCycleEntry = schedule.find((e) => e.day >= 1)
    const firstUnlock = firstCycleEntry?.unlock_at
    if (firstUnlock && new Date(firstUnlock) > new Date()) {
      return (
        <Shell>
          <HoldingState
            theme={plan.theme || 'Your devotional plan'}
            startDate={firstUnlock}
          />
        </Shell>
      )
    }
  }

  // F-083 audit fix 2026-07-27: plans are 7-day arcs (5 content +
  // Sabbath + Review). The old `<= 5 / === 5` window declared the
  // plan complete after day 5 and hid the Sabbath and Review days
  // behind CompletionState. Completion now requires every completable
  // (non-sabbath — sabbath days have no mark-complete control) day on
  // the schedule to be done, INCLUDING the Review day.
  const sabbathDays = new Set(
    schedule.filter((e) => e.status === 'sabbath').map((e) => e.day),
  )
  const completableDays = schedule.filter(
    (e) => e.day >= 1 && !sabbathDays.has(e.day),
  )
  const completedNumbers = new Set(
    plan.devotional_plan_days
      .filter((d) => d.completed_at)
      .map((d) => d.day_number),
  )
  const allDone =
    completableDays.length > 0 &&
    completableDays.every((e) => completedNumbers.has(e.day))

  if (allDone) {
    return (
      <Shell>
        <CompletionState plan={plan} />
      </Shell>
    )
  }

  return (
    <Shell>
      <ScheduledSwapBanner />
      <DailyBreadView
        plan={plan}
        currentDay={getCurrentDay(plan)}
        schedule={schedule}
      />
    </Shell>
  )
}

async function resolveOwnerPlan(sessionToken: string | null) {
  try {
    const user = await getUser()
    if (!user) return null
    // Lazy claim: if this session created plans while anonymous, stamp
    // them onto the account before looking up by owner.
    await claimPlansForUser(user.id, sessionToken)
    return await fetchActivePlanByOwner(user.id)
  } catch (error) {
    console.error('[daily-bread] owner plan read failed:', error)
    return null
  }
}

async function resolveUserActiveSeries() {
  try {
    const user = await getUser()
    if (!user) return null
    await promoteScheduledSwapIfDue(user.id)
    const active = await getActiveSeries(user.id)
    if (!active) return null
    // R37: founder fix — Daily Bread should always render the
    // user's `active_series` row, regardless of how it got there
    // (manual start, soul_audit, archive-restart). Previously
    // soul_audit-sourced rows were ignored and the page fell
    // through to the generic plan view (which defaulted to "A
    // Voice in the Wilderness"). Now every active selection wins.
    return active
  } catch (error) {
    console.error('[daily-bread] active_series read failed:', error)
    return null
  }
}

/**
 * R37: founder direction — Daily Bread should render at a single
 * consistent width across all states. Previously the active path
 * was width-locked to `devotional-shell-main mx-auto max-w-6xl` by
 * `CuratedActiveView`, while the empty / holding / completion /
 * soul-audit-plan paths used the generic `mock-panel` (different
 * width). Now Shell renders the SAME outer container for every
 * state; full-width on desktop, capped at max-w-6xl to match the
 * dedicated devotional reader.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />
        <section className="daily-bread-shell-frame">{children}</section>
        <SiteFooter />
        <section className="mock-bottom-brand">
          <h2 className="text-masthead mock-masthead-word">
            <span className="js-shell-masthead-fit mock-masthead-text">
              EUANGELION
            </span>
          </h2>
        </section>
      </main>
    </div>
  )
}
