import { cookies } from 'next/headers'
import { fetchActivePlan, getCurrentDay } from '@/lib/soul-audit/plan-queries'
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

export const dynamic = 'force-dynamic'

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
    // CuratedActiveView owns its own devotional-shell-main container
    // (same width / chrome as the dedicated /devotional/[slug]
    // reader). Skip the mock-panel wrapper Shell uses for the other
    // states to avoid double-wrapping.
    return (
      <Shell unwrap>
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

  if (!sessionToken) {
    return (
      <Shell>
        <ScheduledSwapBanner />
        <EmptyState />
      </Shell>
    )
  }

  const plan = await fetchActivePlan(sessionToken)

  if (!plan) {
    return (
      <Shell>
        <ScheduledSwapBanner />
        <EmptyState />
      </Shell>
    )
  }

  const schedule = (plan.schedule || []) as DayScheduleEntry[]
  const firstUnlock = schedule[0]?.unlock_at
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

  const contentDays = plan.devotional_plan_days.filter(
    (d) => d.day_number >= 1 && d.day_number <= 5,
  )
  const allDone =
    contentDays.length === 5 && contentDays.every((d) => d.completed_at)

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

async function resolveUserActiveSeries() {
  try {
    const user = await getUser()
    if (!user) return null
    await promoteScheduledSwapIfDue(user.id)
    const active = await getActiveSeries(user.id)
    if (!active || active.source === 'soul_audit') return null
    return active
  } catch (error) {
    console.error('[daily-bread] active_series read failed:', error)
    return null
  }
}

function Shell({
  children,
  unwrap = false,
}: {
  children: React.ReactNode
  unwrap?: boolean
}) {
  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />
        {unwrap ? (
          children
        ) : (
          <section className="mock-panel">{children}</section>
        )}
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
