import { createAdminClient } from '@/lib/supabase/admin'
import type {
  PlanWithDays,
  PlanDayRecord,
  DayScheduleEntry,
  DayContent,
} from '@/types/soul-audit-plan'

/**
 * Fetch the active plan for a session, including all day records.
 * Uses two queries because plan_token FK is not a Supabase-detected relationship.
 */
export async function fetchActivePlan(
  sessionToken: string,
): Promise<PlanWithDays | null> {
  const supabase = createAdminClient()

  // Get the active plan instance
  const { data: plan, error } = await supabase
    .from('devotional_plan_instances')
    .select('*')
    .eq('session_token', sessionToken)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !plan) return null

  // Get all days for this plan.
  // Cast through `any` because used_chunk_ids/completed_at/run_id were added
  // via ALTER TABLE and are not yet in the Supabase generated Database type.

  const { data: days } = await (supabase as any)
    .from('devotional_plan_days')
    .select('*')
    .eq('plan_token', plan.plan_token)
    .order('day_number')

  const planWithDays = {
    ...plan,
    devotional_plan_days: (days || []) as PlanDayRecord[],
  } as unknown as PlanWithDays

  return planWithDays
}

/**
 * SA-032 (2026-07-27): account-first plan resolution. Plans were only
 * reachable through the audit session cookie, so signing out (or a new
 * device) orphaned them — the founder's "when you sign back in you
 * should already be where you left off, regardless of device."
 * `owner_user_id` existed in the schema but nothing ever wrote it.
 */
export async function fetchActivePlanByOwner(
  userId: string,
): Promise<PlanWithDays | null> {
  const supabase = createAdminClient()
  const { data: plan, error } = await (supabase as any)
    .from('devotional_plan_instances')
    .select('*')
    .eq('owner_user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !plan) return null

  const { data: days } = await (supabase as any)
    .from('devotional_plan_days')
    .select('*')
    .eq('plan_token', plan.plan_token)
    .order('day_number')

  return {
    ...plan,
    devotional_plan_days: (days || []) as PlanDayRecord[],
  } as unknown as PlanWithDays
}

/**
 * Stamp the signed-in user as owner of any un-owned plans created under
 * the given audit session, so future sign-ins resume them from the
 * account no matter the device or cookie state. Best-effort (errors are
 * logged, never thrown — runs inside auth callbacks).
 */
export async function claimPlansForUser(
  userId: string,
  auditSessionToken: string | null,
): Promise<void> {
  if (!auditSessionToken) return
  try {
    const supabase = createAdminClient()
    const { error } = await (supabase as any)
      .from('devotional_plan_instances')
      .update({ owner_user_id: userId })
      .eq('session_token', auditSessionToken)
      .is('owner_user_id', null)
    if (error) {
      console.error('[claimPlansForUser] failed:', error)
    }
  } catch (err) {
    console.error(
      '[claimPlansForUser] threw:',
      err instanceof Error ? err.message : err,
    )
  }
}

/**
 * SA-033 follow-up (2026-07-27): a plan whose 7-day schedule finished
 * long ago must NOT keep resurfacing on Daily Bread (founder: a
 * July-11 plan was still greeting him on July 27). A plan is expired
 * once every unlock is more than EXPIRY_GRACE_DAYS behind us; expired
 * plans are archived in place and treated as absent.
 */
const EXPIRY_GRACE_DAYS = 7

export function isPlanExpired(plan: PlanWithDays): boolean {
  const schedule = (plan.schedule || []) as DayScheduleEntry[]
  const unlocks = schedule
    .map((e) => (e.unlock_at ? new Date(e.unlock_at).getTime() : 0))
    .filter((t) => t > 0)
  if (unlocks.length === 0) return false
  const lastUnlock = Math.max(...unlocks)
  return Date.now() - lastUnlock > EXPIRY_GRACE_DAYS * 24 * 60 * 60 * 1000
}

export async function archiveExpiredPlan(plan: PlanWithDays): Promise<void> {
  try {
    const supabase = createAdminClient()
    await (supabase as any)
      .from('devotional_plan_instances')
      .update({ status: 'archived' })
      .eq('id', plan.id)
  } catch (err) {
    console.error(
      '[archiveExpiredPlan] failed:',
      err instanceof Error ? err.message : err,
    )
  }
}

export function getCurrentDay(plan: PlanWithDays): number {
  const schedule = (plan.schedule || []) as DayScheduleEntry[]
  const now = new Date()
  let current = 1

  for (const entry of schedule) {
    if (entry.status === 'sabbath' || !entry.unlock_at) continue
    if (new Date(entry.unlock_at) > now) break
    const rec = plan.devotional_plan_days.find(
      (d) => d.day_number === entry.day,
    )
    if (rec && !rec.completed_at) return entry.day
    current = entry.day
  }

  return current
}

/**
 * Reconstruct generation state from saved days (for resume after stall).
 * Uses plan_token to find days.
 */
export async function reconstructGenerationState(planToken: string): Promise<{
  usedChunkIds: string[]
  previousDaysSummary: string
  lastSavedDay: number
}> {
  const supabase = createAdminClient()
  // Cast through `any` because used_chunk_ids was added via ALTER TABLE
  // and is not yet in the Supabase generated Database type.

  const { data: savedDays } = await (supabase as any)
    .from('devotional_plan_days')
    .select('day_number, content, used_chunk_ids')
    .eq('plan_token', planToken)
    .order('day_number')

  if (!savedDays || savedDays.length === 0) {
    return { usedChunkIds: [], previousDaysSummary: '', lastSavedDay: 0 }
  }

  const usedChunkIds = (savedDays as any[]).flatMap(
    (d: { used_chunk_ids?: string[] }) => d.used_chunk_ids || [],
  )

  const lastDay = (savedDays as any[])[savedDays.length - 1]
  const previousDaysSummary = lastDay
    ? (lastDay.content as DayContent).previousDaysSummaryForNext || ''
    : ''
  const lastSavedDay = lastDay?.day_number || 0

  return { usedChunkIds, previousDaysSummary, lastSavedDay }
}
