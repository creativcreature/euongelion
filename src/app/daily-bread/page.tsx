import { cookies } from 'next/headers'
import { fetchActivePlan, getCurrentDay } from '@/lib/soul-audit/plan-queries'
import { AUDIT_SESSION_COOKIE } from '@/lib/soul-audit/session'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import DailyBreadView from '@/components/daily-bread/DailyBreadView'
import EmptyState from '@/components/daily-bread/EmptyState'
import HoldingState from '@/components/daily-bread/HoldingState'
import CompletionState from '@/components/daily-bread/CompletionState'
import type { DayScheduleEntry } from '@/types/soul-audit-plan'

export const dynamic = 'force-dynamic'

export default async function DailyBreadPage() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(AUDIT_SESSION_COOKIE)?.value ?? null

  if (!sessionToken) {
    return (
      <Shell>
        <EmptyState />
      </Shell>
    )
  }

  const plan = await fetchActivePlan(sessionToken)

  if (!plan) {
    return (
      <Shell>
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
      <DailyBreadView
        plan={plan}
        currentDay={getCurrentDay(plan)}
        schedule={schedule}
      />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />
        <section className="mock-panel">{children}</section>
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
