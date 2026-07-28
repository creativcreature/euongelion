import { getUser } from '@/lib/auth'
import {
  promoteScheduledSwapIfDue,
  type ActiveSeriesRecord,
} from '@/lib/library/repository'
import {
  archiveExpiredPlan,
  claimPlansForUser,
  fetchActivePlan,
  fetchActivePlanByOwner,
  isPlanExpired,
} from '@/lib/soul-audit/plan-queries'
import type { PlanWithDays } from '@/types/soul-audit-plan'

/**
 * The single canonical answer to "what is this reader's current devotional?"
 *
 * Before this resolver, `/daily-bread` (the reader) and `/api/soul-audit/current`
 * (every header/tab/home-card/resume badge) each resolved current-reading truth
 * through their own stack. They agreed on `active_series` but diverged on the
 * plan fallback: the page read the plan account-first (`owner_user_id`) while the
 * badge read it session-token-only, so a signed-in reader on a new device saw
 * their plan on the page but "nothing current" in the header. The badge also
 * advertised un-activated curated Soul-Audit selections the reader never rendered.
 *
 * One resolver, called by both surfaces, ends the divergence. It returns a
 * discriminated union with exactly three real-world states — never an implicit
 * "empty" that is actually a swallowed failure:
 *
 *  - `active`      the reader HAS a current devotional (an active_series row, or
 *                  an account-first / session Soul Audit plan).
 *  - `empty`       a confirmed absence — every source was read and none exists.
 *  - `unavailable` a read/auth failure. Callers MUST surface this (error boundary
 *                  on the page, honest 5xx on the API). It must never be rewritten
 *                  as `empty`, which is how the six-month Daily Bread bug hid.
 */
export type CurrentReading =
  | {
      status: 'active'
      source: 'active_series'
      activeSeries: ActiveSeriesRecord
    }
  | { status: 'active'; source: 'soul_audit_plan'; plan: PlanWithDays }
  | { status: 'empty' }
  | { status: 'unavailable'; error: unknown }

/**
 * Resolve the reader's current devotional from canonical sources.
 *
 * Precedence (matches the reader's long-standing behavior):
 *   1. The user-controlled `active_series` row (manual start, soul_audit, or
 *      archive-restart), after promoting any due scheduled swap.
 *   2. The Soul Audit plan — account-first for signed-in users, session cookie
 *      for anonymous readers. An expired ("zombie") plan is archived and treated
 *      as absent.
 *   3. Confirmed empty.
 *
 * Any thrown read/auth failure collapses to `unavailable` — never to `empty`.
 *
 * @param sessionToken the anonymous Soul Audit session cookie value, or null.
 */
export async function resolveCurrentReading(
  sessionToken: string | null,
): Promise<CurrentReading> {
  try {
    const user = await getUser()

    // 1. The user-controlled active series is the canonical answer for every
    //    "what am I reading?" surface. It wins over any older Soul Audit plan.
    if (user) {
      const activeSeries = await promoteScheduledSwapIfDue(user.id)
      if (activeSeries) {
        return { status: 'active', source: 'active_series', activeSeries }
      }
    }

    // 2. Soul Audit plan. Signed-in users resolve account-first so sign-out /
    //    sign-in / a new device resumes the same plan; anonymous readers resolve
    //    by session cookie. Both flow through the identical downstream logic.
    let plan: PlanWithDays | null = null
    if (user) {
      // Lazy claim: stamp any plans this session created while anonymous onto
      // the account before the owner lookup. Best-effort (never throws).
      await claimPlansForUser(user.id, sessionToken)
      plan = await fetchActivePlanByOwner(user.id)
    }
    if (!plan && sessionToken) {
      plan = await fetchActivePlan(sessionToken)
    }

    // A plan whose week ended past the grace period is a zombie — archive it and
    // treat the reader as having no current plan, rather than greeting them with
    // weeks-old content forever.
    if (plan && isPlanExpired(plan)) {
      await archiveExpiredPlan(plan)
      plan = null
    }

    if (plan) {
      return { status: 'active', source: 'soul_audit_plan', plan }
    }

    return { status: 'empty' }
  } catch (error) {
    // A failed auth/database read is NOT proof that the reader has no devotional.
    // Surfacing it as unavailable keeps a transient outage from impersonating a
    // cleared selection or falling through to an unrelated default devotional.
    console.error('[current-reading] resolution failed:', error)
    return { status: 'unavailable', error }
  }
}
