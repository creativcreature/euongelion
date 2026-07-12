/**
 * POST /api/devotional-plan/{token}/day/{n}/deepen
 *
 * Triggers on-demand generation of the grounded Deep Dive (~3,000-3,800 word
 * closed-RAG long-form, SA-020/F-026 tiering decision) for one generated day,
 * by firing the off-request executor (SOUL_AUDIT_GENERATOR_URL — the Supabase
 * Edge function in production, the dev generator shim locally) with
 * mode='deepdive'. The executor merges the result into the day's saved
 * content (tier3Extended.deepDiveBody); the reader polls the day API until
 * it lands.
 *
 * A Deep Dive takes ~2 minutes of Sonnet generation — far beyond the Workers
 * request cap — so there is deliberately NO inline fallback: without a
 * configured executor this returns 503 (explicit, not silent).
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  createRequestId,
  getClientKey,
  jsonError,
  takeRateLimit,
} from '@/lib/api-security'
import { isDayLockingEnabledForRequest } from '@/lib/day-locking'
import { internalFetchHeaders } from '@/lib/internal-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
import { getPlanInstanceWithFallback } from '@/lib/soul-audit/repository'
import { isPlanDayUnlocked } from '@/lib/soul-audit/schedule'
import type { DayContent } from '@/types/soul-audit-plan'

/**
 * Read a plan day's content FRESH from the DB (bypassing the repository's
 * in-memory cache) — required so the readiness poll sees the Deep Dive the
 * moment the executor merges it in.
 */
async function readDayContentFresh(
  token: string,
  dayNumber: number,
): Promise<DayContent | null> {
  const supabase = createAdminClient()

  const { data } = await (supabase as any)
    .from('devotional_plan_days')
    .select('content')
    .eq('plan_token', token)
    .eq('day_number', dayNumber)
    .maybeSingle()
  return (data?.content as DayContent | undefined) ?? null
}

/**
 * GET — lightweight readiness poll for the reader: returns { ready } and the
 * full updated day content once the Deep Dive has been merged in.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string; n: string }> },
) {
  const requestId = createRequestId()
  const { token, n } = await params
  const dayNumber = Number(n)
  if (!token || !Number.isFinite(dayNumber) || dayNumber < 1) {
    return jsonError({
      error: 'Invalid plan token or day number.',
      status: 400,
      requestId,
    })
  }
  const content = await readDayContentFresh(token, dayNumber)
  if (!content) {
    return jsonError({
      error: 'Plan day not generated yet.',
      status: 404,
      requestId,
    })
  }
  const ready = !!content.tier3Extended?.deepDiveBody
  return NextResponse.json({
    ready,
    ...(ready ? { content } : {}),
    requestId,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; n: string }> },
) {
  const requestId = createRequestId()
  const { token, n } = await params
  const dayNumber = Number(n)

  if (!token || !Number.isFinite(dayNumber) || dayNumber < 1) {
    return jsonError({
      error: 'Invalid plan token or day number.',
      status: 400,
      requestId,
    })
  }

  const generatorUrl = process.env.SOUL_AUDIT_GENERATOR_URL
  if (!generatorUrl) {
    return jsonError({
      error:
        'Deep Dive generation requires the off-request executor (SOUL_AUDIT_GENERATOR_URL) — not configured in this environment.',
      status: 503,
      requestId,
    })
  }

  // Rate limit the spend trigger (OWASP self-audit M-4, 2026-07-11): a
  // Deep Dive is ~2 minutes of Sonnet generation — the single most
  // expensive on-demand call — so its POST must not be free to spam.
  const limiter = await takeRateLimit({
    namespace: 'plan-deepen',
    key: getClientKey(request),
    limit: 5,
    windowMs: 60_000,
  })
  if (!limiter.ok) {
    return jsonError({
      error: 'Too many Deep Dive requests. Please wait a moment.',
      code: 'RATE_LIMITED',
      status: 429,
      requestId,
      rateLimit: limiter,
    })
  }

  const instance = await getPlanInstanceWithFallback(token)
  if (!instance) {
    return jsonError({ error: 'Plan not found.', status: 404, requestId })
  }

  // Ownership scoping (M-4, same policy as select/status): only the
  // session that owns the plan — or the signed-in user that session
  // belongs to — may trigger paid generation against it. Others see
  // 404, indistinguishable from a missing plan.
  if (instance.session_token) {
    let authorized = false
    try {
      const callerToken = await getOrCreateAuditSessionToken()
      authorized = callerToken === instance.session_token
    } catch {
      // no request-scoped cookie store — fall through to user check
    }
    if (!authorized) {
      try {
        const server = await createServerSupabase()
        const {
          data: { user },
        } = await server.auth.getUser()
        if (user) {
          const { data: link } = await (createAdminClient() as any)
            .from('user_sessions')
            .select('session_token')
            .eq('session_token', instance.session_token)
            .eq('user_id', user.id)
            .maybeSingle()
          authorized = Boolean(link)
        }
      } catch {
        // fall through to 404
      }
    }
    if (!authorized) {
      return jsonError({ error: 'Plan not found.', status: 404, requestId })
    }
  }

  // Mirror the day route's gating: only enforce the schedule lock when
  // day-locking is enabled for this request.
  if (isDayLockingEnabledForRequest(request)) {
    const unlock = isPlanDayUnlocked({
      nowUtc: new Date(),
      policy: instance.start_policy,
      cycleStartAtIso: instance.cycle_start_at,
      dayNumber,
      offsetMinutes: instance.timezone_offset_minutes,
    })
    if (!unlock.unlocked) {
      return jsonError({
        error: 'This day is not unlocked yet.',
        status: 423,
        requestId,
      })
    }
  }

  const content = await readDayContentFresh(token, dayNumber)
  if (!content) {
    return jsonError({
      error: 'Plan day not generated yet.',
      status: 404,
      requestId,
    })
  }
  if (content.tier3Extended?.deepDiveBody) {
    // Already deepened — idempotent success, no duplicate spend.
    return NextResponse.json({ ok: true, status: 'ready', requestId })
  }

  // The struggle text grounds the Deep Dive's pastoral voice. It lives on the
  // generation job; fall back to the plan theme (still fully grounded — the
  // closed weave only personalizes with it, never sources from it).
  const supabase = createAdminClient()

  const { data: job } = await (supabase as any)
    .from('soul_audit_jobs')
    .select('user_input, theme, scripture_anchor')
    .eq('plan_id', token)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const headers: Record<string, string> = {
    ...(internalFetchHeaders() as Record<string, string>),
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    headers.Authorization = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  }

  const deepDivePromise = fetch(generatorUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      mode: 'deepdive',
      planId: token,
      dayNumber,
      theme: job?.theme || '',
      scriptureAnchor:
        content.scriptureReference || job?.scripture_anchor || '',
      userInput: job?.user_input || job?.theme || '',
    }),
  }).catch((err) => {
    console.error(
      `[deepen] Executor call failed for plan ${token} day ${dayNumber}:`,
      err,
    )
  })

  // Keep the fetch alive after this response on Workers.
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { ctx } = await getCloudflareContext({ async: true })
    ctx.waitUntil(deepDivePromise)
  } catch {
    // Not on Workers (local dev) — fetch runs in background naturally.
  }

  return NextResponse.json(
    { ok: true, status: 'generating', requestId },
    { status: 202 },
  )
}
