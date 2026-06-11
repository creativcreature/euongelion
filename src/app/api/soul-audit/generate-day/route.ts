/**
 * /api/soul-audit/generate-day
 *
 * INTERNAL-ONLY route protected by X-Internal-Secret header.
 * Thin transport wrapper over the shared generation runner
 * (src/lib/soul-audit/generation-runner.ts) — the same orchestration that
 * the local dev generator shim and the Supabase Edge function execute, so
 * behavior never drifts between runtimes.
 *
 * On Cloudflare Workers this route is deadline-bound (LLM_ROUTE_DEADLINE_MS
 * under the 30s request cap), which is too tight for Sonnet's ~40s grounded
 * readings — production generation should run through the off-request
 * executor (SOUL_AUDIT_GENERATOR_URL → Supabase Edge function). This route
 * remains the dev-default and the documented fallback.
 *
 * No fire-and-forget chaining here (USING_QUEUE_FALLBACK=true): the /status
 * polling handler triggers the next day.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateInternalSecret } from '@/lib/internal-auth'
import {
  runGenerationDay,
  type GenerateDayJob,
} from '@/lib/soul-audit/generation-runner'
import {
  createRequestId,
  jsonError,
  LLM_ROUTE_DEADLINE_MS,
  withAbortDeadline,
} from '@/lib/api-security'

// ─── Request shape ───────────────────────────────────────────────────

interface GenerateDayRequest {
  jobId: string
  planId: string // This is actually plan_token
  runId: string
  dayNumber: number
  totalContentDays: number // 5
  theme: string
  scriptureAnchor: string
  userInput: string
  previousDaysSummary: string
  usedChunkIds: string[]
  interactiveElement: string
  metaStoryPosition: string
  timezone: string
  timezoneOffsetMinutes: number
  sessionId: string // session_token
}

// ─── POST handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  if (!validateInternalSecret(request)) {
    return jsonError({
      error: 'Forbidden',
      status: 403,
      requestId,
      code: 'INTERNAL_SECRET_REQUIRED',
    })
  }

  let body: GenerateDayRequest
  try {
    body = (await request.json()) as GenerateDayRequest
  } catch {
    return jsonError({
      error: 'Invalid JSON body',
      status: 400,
      requestId,
      code: 'INVALID_JSON_BODY',
    })
  }

  if (
    !body.jobId ||
    !body.planId ||
    !body.runId ||
    !body.dayNumber ||
    !body.userInput
  ) {
    return jsonError({
      error: 'Missing required fields',
      status: 400,
      requestId,
      code: 'INVALID_FIELDS',
    })
  }

  // Run the shared orchestration under the route's wall-clock deadline so a
  // slow provider surfaces a structured 504 instead of being silently killed
  // by the Workers 30s request cap.
  const result = await withAbortDeadline(LLM_ROUTE_DEADLINE_MS, (signal) => {
    const job: GenerateDayJob = {
      jobId: body.jobId,
      planId: body.planId,
      runId: body.runId,
      dayNumber: body.dayNumber,
      totalContentDays: body.totalContentDays || 5,
      theme: body.theme,
      scriptureAnchor: body.scriptureAnchor,
      userInput: body.userInput,
      previousDaysSummary: body.previousDaysSummary,
      usedChunkIds: body.usedChunkIds,
      sessionId: body.sessionId,
      signal,
    }
    return runGenerationDay(job)
  }).catch((error) => {
    // withAbortDeadline rejects with the AbortError itself when the deadline
    // fires mid-runner; the runner has already recorded job error state for
    // weave aborts, so map to the deadline contract here.
    const msg = error instanceof Error ? error.message : 'generation failed'
    return {
      ok: false as const,
      status: 504,
      error: `Day ${body.dayNumber} generation took too long (${msg}).`,
    }
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, requestId },
      { status: result.status },
    )
  }

  return NextResponse.json({
    ok: true,
    dayNumber: body.dayNumber,
    complete: result.complete,
    ...(result.nextDay ? { nextDay: result.nextDay } : {}),
    ...(result.complete ? { totalDaysGenerated: 7 } : {}),
  })
}
