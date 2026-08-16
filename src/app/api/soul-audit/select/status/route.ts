import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isCallerAuthorizedForSession } from '@/lib/soul-audit/plan-ownership'
import { internalFetchHeaders } from '@/lib/internal-auth'
import { reconstructGenerationState } from '@/lib/soul-audit/plan-queries'
import {
  STALL_TIMEOUT_MS,
  GENERATING_LOCK_TIMEOUT_MS,
  INTERACTIVE_ROTATION,
  USING_QUEUE_FALLBACK,
} from '@/lib/soul-audit/constants'
import { determineMetaStoryPosition } from '@/lib/soul-audit/plan-utils'
import type { JobRecord } from '@/types/soul-audit-plan'

const ALLOWED_ORIGINS = [
  'http://localhost:3333',
  'http://localhost:3000',
  'https://euangelion.app',
]

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  })
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  const cors = corsHeaders(origin)

  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')

  if (!jobId) {
    return NextResponse.json(
      { error: 'jobId query parameter is required.' },
      { status: 400, headers: cors },
    )
  }

  // soul_audit_jobs is not yet in the generated DB types, so we cast
  // the client to `any` for this table. The query still works at runtime.

  const supabase = createAdminClient() as any

  // ─── Fetch job record ──────────────────────────────────────────────
  const { data: job, error: jobError } = await supabase
    .from('soul_audit_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    return NextResponse.json(
      { error: 'Job not found.' },
      { status: 404, headers: cors },
    )
  }

  const record = job as JobRecord

  // ─── Ownership scoping (§12.3 IDOR) ───────────────────────────────
  // A job may only be polled by the session that created it, or by the
  // signed-in user that session belongs to (post-merge). Anyone else
  // gets 404 — indistinguishable from a nonexistent job. Legacy rows
  // without a session_id (pre-formalization) are exempt; they age out
  // in minutes. Shared policy: src/lib/soul-audit/plan-ownership.ts.
  if (!(await isCallerAuthorizedForSession(record.session_id))) {
    return NextResponse.json(
      { error: 'Job not found.' },
      { status: 404, headers: cors },
    )
  }
  const now = Date.now()
  const updatedAt = new Date(record.updated_at).getTime()

  // ─── Stall detection ──────────────────────────────────────────────
  if (record.status === 'generating' && now - updatedAt > STALL_TIMEOUT_MS) {
    return NextResponse.json(
      {
        jobId: record.id,
        status: 'stalled' as const,
        progress: record.progress,
        currentDay: record.current_day,
        totalDays: 7,
        planId: record.plan_id,
        route: null,
        error: 'Generation stalled. Please retry.',
      },
      { status: 200, headers: cors },
    )
  }

  // ─── Queue fallback: kick or re-kick generation ──────────────────
  // Handles both 'pending' (initial kick) and stale 'generating' (re-kick).
  const shouldKick =
    USING_QUEUE_FALLBACK &&
    (record.status === 'pending' ||
      (record.status === 'generating' && (record.current_day ?? 0) < 5))

  if (shouldKick) {
    const generatingSince = record.generating_since
      ? new Date(record.generating_since).getTime()
      : 0
    const isStale =
      !generatingSince || now - generatingSince > GENERATING_LOCK_TIMEOUT_MS

    if (record.status === 'pending' || isStale) {
      // Transition pending→generating and claim the lock
      const updatePayload: Record<string, unknown> = {
        generating_since: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      if (record.status === 'pending') {
        updatePayload.status = 'generating'
        updatePayload.current_day = 0
      }

      await supabase
        .from('soul_audit_jobs')
        .update(updatePayload)
        .eq('id', record.id)

      // Reconstruct state from saved days
      const planToken = record.plan_id
      if (planToken) {
        const state = await reconstructGenerationState(planToken)
        const nextDay = state.lastSavedDay + 1

        // Determine context for the next day
        const interactiveType = INTERACTIVE_ROTATION[nextDay] ?? 'breath_prayer'
        const metaStoryPosition = determineMetaStoryPosition(
          record.scripture_anchor ?? '',
          record.theme ?? '',
        )

        const selfUrl = new URL(request.url).origin

        // Executor resolution: when SOUL_AUDIT_GENERATOR_URL is set, the kick
        // goes to the off-request executor (Supabase Edge function / local dev
        // generator shim), which generates the day WITHOUT the Workers 30s cap
        // and then SELF-CHAINS the remaining days. When unset, fall back to
        // the in-app route, where /status polling drives day-by-day chaining.
        const generatorUrl = process.env.SOUL_AUDIT_GENERATOR_URL
        const executorUrl =
          generatorUrl || `${selfUrl}/api/soul-audit/generate-day`
        const executorHeaders: Record<string, string> = {
          ...(internalFetchHeaders() as Record<string, string>),
        }
        if (generatorUrl && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          // Supabase functions deployed with verify-jwt expect a bearer token.
          executorHeaders.Authorization = `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }

        // Fire-and-forget: kick the executor
        // Field names must match GenerateDayJob in generation-runner.ts
        // Use waitUntil on Workers so the fetch survives after response is sent
        const generatePromise = fetch(executorUrl, {
          method: 'POST',
          headers: executorHeaders,
          body: JSON.stringify({
            jobId: record.id,
            planId: planToken,
            runId: record.run_id,
            dayNumber: nextDay,
            totalContentDays: 5,
            theme: record.theme,
            scriptureAnchor: record.scripture_anchor,
            userInput: record.user_input,
            timezone: record.timezone,
            timezoneOffsetMinutes: record.timezone_offset_minutes,
            usedChunkIds: state.usedChunkIds,
            previousDaysSummary: state.previousDaysSummary,
            interactiveElement: interactiveType,
            metaStoryPosition,
            sessionId: record.session_id,
          }),
        }).catch((err) => {
          console.error(
            `[select/status] Fire-and-forget generate-day failed for job ${record.id}:`,
            err,
          )
        })

        // On Cloudflare Workers, keep the fetch alive after response is sent
        try {
          const { getCloudflareContext } =
            await import('@opennextjs/cloudflare')
          const { ctx } = await getCloudflareContext({ async: true })
          ctx.waitUntil(generatePromise)
        } catch {
          // Not on Workers (local dev / Vercel) — fetch runs in background naturally
        }
      }
    }

    // Day-1-first: with a self-chaining executor configured, the reader can
    // start as soon as Day 1 is saved — the executor finishes Days 2-7 in the
    // background and the remaining days are date-gated anyway. Without the
    // executor (in-app chaining), polling must continue, so no early route.
    const dayOneReady =
      !!process.env.SOUL_AUDIT_GENERATOR_URL &&
      (record.current_day ?? 0) >= 1 &&
      !!record.plan_id

    return NextResponse.json(
      {
        jobId: record.id,
        status: record.status === 'pending' ? 'generating' : record.status,
        progress: record.progress ?? 'Preparing day 1…',
        currentDay: record.current_day ?? 0,
        totalDays: 7,
        planId: record.plan_id,
        route: dayOneReady ? '/today' : null,
        error: null,
      },
      { status: 200, headers: cors },
    )
  }

  // ─── Complete (or Day-1-ready with a self-chaining executor): route ──
  const dayOneReady =
    !!process.env.SOUL_AUDIT_GENERATOR_URL &&
    record.status === 'generating' &&
    (record.current_day ?? 0) >= 1 &&
    !!record.plan_id
  const route =
    record.status === 'complete' || dayOneReady ? '/today' : null

  return NextResponse.json(
    {
      jobId: record.id,
      status: record.status,
      progress: record.progress,
      currentDay: record.current_day,
      totalDays: 7,
      planId: record.plan_id,
      route,
      error: record.error,
    },
    { status: 200, headers: cors },
  )
}
