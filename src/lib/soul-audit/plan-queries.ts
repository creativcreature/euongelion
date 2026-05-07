import { createAdminClient } from '@/lib/supabase/admin'
import type {
  PlanWithDays,
  PlanRecord,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: savedDays } = await (supabase as any)
    .from('devotional_plan_days')
    .select('day_number, content, used_chunk_ids')
    .eq('plan_token', planToken)
    .order('day_number')

  if (!savedDays || savedDays.length === 0) {
    return { usedChunkIds: [], previousDaysSummary: '', lastSavedDay: 0 }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usedChunkIds = (savedDays as any[]).flatMap(
    (d: { used_chunk_ids?: string[] }) => d.used_chunk_ids || [],
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastDay = (savedDays as any[])[savedDays.length - 1]
  const previousDaysSummary = lastDay
    ? ((lastDay.content as DayContent).previousDaysSummaryForNext || '')
    : ''
  const lastSavedDay = lastDay?.day_number || 0

  return { usedChunkIds, previousDaysSummary, lastSavedDay }
}
