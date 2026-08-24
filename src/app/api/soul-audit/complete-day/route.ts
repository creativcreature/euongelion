import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { AUDIT_SESSION_COOKIE } from '@/lib/soul-audit/session'
import { createRequestId, jsonError, logApiError } from '@/lib/api-security'
import type { DayScheduleEntry } from '@/types/soul-audit-plan'

interface CompleteBody {
  planId: string
  dayNumber: number
}

/**
 * The inclusive bounds of a plan day.
 *
 * The floor is 0, not 1. A Wed-Sun starter's plan is prepended with a real,
 * immediately-unlocked day-0 primer ("Before You Begin") — persisted as a
 * `devotional_plan_days` row and rendered by the reader with the same MARK DAY
 * COMPLETE button as any cycle day. Bounding at 1 meant that button could only
 * ever fail, so every weekend starter was locked out of recording the one day
 * they were able to read.
 */
const MIN_PLAN_DAY = 0
const MAX_PLAN_DAY = 7

/**
 * Parse a day number from untrusted input, or null if it is not one.
 *
 * Widening the floor to 0 makes the coercion itself load-bearing: `Number(null)`,
 * `Number('')` and `Number(false)` are all 0, so a request that omits the field
 * would otherwise read as a valid day 0 rather than as junk. Presence is checked
 * before coercion, and the value must be a whole number — 0-7 means the eight
 * days themselves, not anything that rounds into them.
 */
function parsePlanDayNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'number' && typeof raw !== 'string') return null
  if (typeof raw === 'string' && raw.trim() === '') return null
  const dayNumber = Number(raw)
  if (!Number.isInteger(dayNumber)) return null
  if (dayNumber < MIN_PLAN_DAY || dayNumber > MAX_PLAN_DAY) return null
  return dayNumber
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  // ─── Session check ────────────────────────────────────────────────
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(AUDIT_SESSION_COOKIE)?.value ?? null
  if (!sessionToken) {
    return jsonError({
      error: 'Session required.',
      status: 401,
      requestId,
    })
  }

  // ─── Parse body ───────────────────────────────────────────────────
  let body: CompleteBody
  try {
    body = await request.json()
  } catch (error) {
    logApiError({
      scope: 'soul-audit-complete-day',
      requestId,
      error,
      method: request.method,
      path: '/api/soul-audit/complete-day',
      context: { reason: 'invalid-json-body' },
    })
    return jsonError({
      error: 'Invalid request body.',
      status: 400,
      requestId,
      code: 'INVALID_JSON_BODY',
    })
  }

  const planId = String(body.planId || '').trim()
  const dayNumber = parsePlanDayNumber(body.dayNumber)

  if (!planId || dayNumber === null) {
    return jsonError({
      error: 'planId (string) and dayNumber (0-7) are required.',
      status: 400,
      requestId,
      code: 'INVALID_FIELDS',
    })
  }

  // `schedule` and `completed_at` columns are not yet in the generated
  // DB types. Cast the client so TypeScript does not block the query.

  const supabase = createAdminClient() as any

  // ─── Verify plan belongs to this session ──────────────────────────
  const { data: plan, error: planError } = await supabase
    .from('devotional_plan_instances')
    .select('plan_token, schedule')
    .eq('plan_token', planId)
    .eq('session_token', sessionToken)
    .single()

  if (planError || !plan) {
    return jsonError({
      error: 'Plan not found or access denied.',
      status: 403,
      requestId,
      code: 'PLAN_NOT_FOUND',
    })
  }

  // ─── Mark day as complete ─────────────────────────────────────────
  const { error: updateError } = await supabase
    .from('devotional_plan_days')
    .update({ completed_at: new Date().toISOString() })
    .eq('plan_token', planId)
    .eq('day_number', dayNumber)

  if (updateError) {
    logApiError({
      scope: 'soul-audit-complete-day',
      requestId,
      error: updateError,
      method: request.method,
      path: '/api/soul-audit/complete-day',
      context: {
        reason: 'mark-day-complete-failed',
        planId,
        dayNumber,
      },
    })
    return jsonError({
      error: 'Failed to mark day as complete.',
      status: 500,
      requestId,
      code: 'COMPLETE_DAY_DB_FAILURE',
    })
  }

  // ─── Find next day unlock time ────────────────────────────────────
  const schedule = ((plan as Record<string, unknown>).schedule ??
    []) as DayScheduleEntry[]
  const nextEntry = schedule.find((entry) => entry.day === dayNumber + 1)

  return NextResponse.json({
    ok: true,
    nextDayUnlocksAt: nextEntry?.unlock_at ?? null,
  })
}

/**
 * DELETE — un-complete a plan day.
 *
 * The curated-series reader gained an undo (SA-111); this is the same gap on
 * the Soul Audit plan path, which stores completion as `completed_at` on
 * `devotional_plan_days` rather than as a row in `user_progress`. Different
 * data model, identical problem: a reader who taps MARK DAY COMPLETE by
 * accident had no way back.
 *
 * Nulling `completed_at` rather than deleting the row is the right inverse
 * here — unlike a progress row, the plan day itself must survive, because it
 * carries the day's generated content. Absence of a timestamp is exactly how
 * every reader of this table already spells "not finished".
 *
 * Same session check, same plan-ownership verification and same 0-7 bound as
 * POST. An undo is a write, and removing rather than adding does not make it
 * cheaper to abuse.
 */
export async function DELETE(request: NextRequest) {
  const requestId = createRequestId()
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(AUDIT_SESSION_COOKIE)?.value ?? null
  if (!sessionToken) {
    return jsonError({ error: 'Session required.', status: 401, requestId })
  }

  const url = new URL(request.url)
  const planId = String(url.searchParams.get('planId') || '').trim()
  const dayNumber = parsePlanDayNumber(url.searchParams.get('dayNumber'))

  if (!planId || dayNumber === null) {
    return jsonError({
      error: 'planId (string) and dayNumber (0-7) are required.',
      status: 400,
      requestId,
      code: 'INVALID_FIELDS',
    })
  }

  const supabase = createAdminClient() as any

  // The plan must belong to this session. Without this an undo would be a way
  // to reach into someone else's plan.
  const { data: plan, error: planError } = await supabase
    .from('devotional_plan_instances')
    .select('plan_token')
    .eq('plan_token', planId)
    .eq('session_token', sessionToken)
    .single()

  if (planError || !plan) {
    return jsonError({
      error: 'Plan not found or access denied.',
      status: 403,
      requestId,
      code: 'PLAN_NOT_FOUND',
    })
  }

  const { error: updateError } = await supabase
    .from('devotional_plan_days')
    .update({ completed_at: null })
    .eq('plan_token', planId)
    .eq('day_number', dayNumber)

  if (updateError) {
    logApiError({
      scope: 'soul-audit-complete-day',
      requestId,
      error: updateError,
      method: request.method,
      path: '/api/soul-audit/complete-day',
      context: { reason: 'uncomplete-day-failed', planId, dayNumber },
    })
    return jsonError({
      error: 'Failed to mark day as unread.',
      status: 500,
      requestId,
      code: 'UNCOMPLETE_DAY_DB_FAILURE',
    })
  }

  return NextResponse.json({ ok: true, dayNumber, requestId })
}
