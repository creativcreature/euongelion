/**
 * POST /api/soul-audit/generate-next
 *
 * Cascading day generation for generative plans.
 * Client calls this after selecting an ai_generative option to progressively
 * generate Days 2-7 one at a time. Each call generates the next pending day.
 *
 * Body: { planToken: string }
 * Returns the newly generated day + updated generation status.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  createRequestId,
  getClientKey,
  jsonError,
  logApiError,
  readJsonWithLimit,
  takeRateLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'
import {
  getAllPlanDaysWithFallback,
  getPlanInstanceWithFallback,
  getSelectionWithFallback,
  getAuditRunWithFallback,
  getAuditOptionsWithFallback,
  updatePlanDayContent,
  isDayStillPending,
} from '@/lib/soul-audit/repository'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
import {
  generateDevotionalDay,
  generateSabbathDay,
  generateReviewDay,
  buildFallbackSabbath,
  buildFallbackReview,
} from '@/lib/soul-audit/generative-builder'
import { brainFlags } from '@/lib/brain/flags'
import { reconstructPlanOutline } from '@/lib/soul-audit/outline-generator'
import type { CustomPlanDay } from '@/types/soul-audit'

interface GenerateNextBody {
  planToken?: string
}

const MAX_BODY_BYTES = 2_048
const MAX_GENERATES_PER_MINUTE = 10
// TODO(F-053): Replace with user's slider preference once stored on plan instance
const DEFAULT_DEVOTIONAL_LENGTH_MINUTES = 10

/** A day is "ready" if generationStatus is 'ready' or absent (pre-generative days). */
function isDayReady(d: CustomPlanDay): boolean {
  return d.generationStatus === 'ready' || d.generationStatus === undefined
}

// In-memory lock for same-instance concurrency prevention.
// Cross-instance protection is handled by isDayStillPending() which
// checks Supabase for the day's generationStatus before generating.
const generationLocks = new Map<string, boolean>()

function acquireLock(planToken: string): boolean {
  if (generationLocks.get(planToken)) return false
  generationLocks.set(planToken, true)
  return true
}

function releaseLock(planToken: string) {
  generationLocks.delete(planToken)
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)

  try {
    const parsed = await readJsonWithLimit<GenerateNextBody>({
      request,
      maxBytes: MAX_BODY_BYTES,
    })
    if (!parsed.ok) {
      return jsonError({
        error: parsed.error,
        status: parsed.status,
        requestId,
      })
    }

    const sessionToken = await getOrCreateAuditSessionToken()
    const limiter = await takeRateLimit({
      namespace: 'soul-audit-generate-next',
      key: `${sessionToken}:${clientKey}`,
      limit: MAX_GENERATES_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return jsonError({
        error: 'Too many generation requests. Please wait a moment.',
        status: 429,
        requestId,
        rateLimit: limiter,
      })
    }

    const planToken = String(parsed.data.planToken || '').trim()
    if (!planToken) {
      return jsonError({
        error: 'planToken is required.',
        status: 400,
        requestId,
      })
    }

    // Verify plan exists and belongs to session
    const planInstance = await getPlanInstanceWithFallback(planToken)
    if (!planInstance) {
      return jsonError({
        error: 'Plan not found.',
        status: 404,
        requestId,
      })
    }

    if (planInstance.session_token !== sessionToken) {
      return jsonError({
        error: 'Plan access denied.',
        status: 403,
        requestId,
      })
    }

    // Acquire lock to prevent concurrent generation
    if (!acquireLock(planToken)) {
      return withRequestIdHeaders(
        NextResponse.json(
          {
            ok: true,
            status: 'already_generating',
            message:
              'A day is already being generated for this plan. Please wait.',
          },
          { status: 200 },
        ),
        requestId,
      )
    }

    try {
      // Get existing plan days
      const existingDays = await getAllPlanDaysWithFallback(planToken)
      const existingDayContent = existingDays
        .map((d) => d.content)
        .sort((a, b) => a.day - b.day)

      // Find the next pending day
      const nextPendingDay = existingDayContent.find(
        (d) => d.generationStatus === 'pending',
      )

      if (!nextPendingDay) {
        return withRequestIdHeaders(
          NextResponse.json(
            {
              ok: true,
              status: 'complete',
              message: 'All days have been generated.',
              totalDays: existingDayContent.length,
              completedDays: existingDayContent.filter(
                (d) => isDayReady(d),
              ).length,
            },
            { status: 200 },
          ),
          requestId,
        )
      }

      // Cross-instance guard: verify the day is still pending in Supabase
      // before spending tokens on LLM generation. Another Vercel instance
      // may have already generated this day.
      const stillPending = await isDayStillPending(planToken, nextPendingDay.day)
      if (!stillPending) {
        // Day was already generated by another instance — re-fetch status
        const refreshedDays = await getAllPlanDaysWithFallback(planToken)
        const refreshedContent = refreshedDays
          .map((d) => d.content)
          .sort((a, b) => a.day - b.day)
        const completed = refreshedContent.filter(
          (d) => isDayReady(d),
        ).length
        const next = refreshedContent.find(
          (d) => d.generationStatus === 'pending',
        )
        return withRequestIdHeaders(
          NextResponse.json(
            {
              ok: true,
              status: next ? 'partial' : 'complete',
              generatedDay: refreshedContent.find(
                (d) => d.day === nextPendingDay.day,
              ),
              totalDays: refreshedContent.length,
              completedDays: completed,
              nextPendingDay: next?.day ?? null,
            },
            { status: 200 },
          ),
          requestId,
        )
      }

      // Get the audit run + option to reconstruct the plan outline
      const selection = await getSelectionWithFallback(
        planInstance.audit_run_id,
      )
      if (!selection) {
        return jsonError({
          error: 'Selection not found for this plan.',
          status: 404,
          requestId,
        })
      }

      const run = await getAuditRunWithFallback(planInstance.audit_run_id)
      if (!run) {
        return jsonError({
          error: 'Audit run not found.',
          status: 404,
          requestId,
        })
      }

      const options = await getAuditOptionsWithFallback(
        planInstance.audit_run_id,
      )
      const option = options.find((o) => o.id === selection.option_id)
      if (!option?.planOutline) {
        return jsonError({
          error: 'Plan outline not found on the selected option.',
          code: 'OUTLINE_MISSING',
          status: 422,
          requestId,
        })
      }

      // Reconstruct PlanOutline from stored preview
      const planOutline = reconstructPlanOutline({
        id: option.slug,
        title: option.title,
        question: option.question,
        reasoning: option.reasoning,
        preview: option.planOutline,
      })

      const dayOutline = planOutline.dayOutlines.find(
        (d) => d.day === nextPendingDay.day,
      )
      if (!dayOutline) {
        return jsonError({
          error: `No outline found for day ${nextPendingDay.day}.`,
          status: 422,
          requestId,
        })
      }

      // Collect ready days for context
      const readyDays = existingDayContent.filter(
        (d) => isDayReady(d),
      )
      const previousModules = readyDays
        .filter((d) => d.modules)
        .map((d) => d.modules!.map((m) => m.type))
      const usedChunkIds = readyDays
        .flatMap((d) => d.endnotes || [])
        .filter((e) => e.source === 'Reference')
        .map((e) => e.note)

      let generatedDay: CustomPlanDay

      if (dayOutline.dayType === 'sabbath') {
        // Token optimization: use deterministic builder by default (saves 1 LLM call).
        // Sabbath explicitly has "no new teaching" — summaries don't need LLM.
        if (brainFlags.generativeSabbathReview) {
          generatedDay = await generateSabbathDay({
            planOutline,
            previousDays: readyDays,
            userResponse: run.response_text,
            devotionalLengthMinutes: DEFAULT_DEVOTIONAL_LENGTH_MINUTES,
          })
        } else {
          generatedDay = buildFallbackSabbath({
            planOutline,
            previousDays: readyDays,
            userResponse: run.response_text,
          })
        }
      } else if (dayOutline.dayType === 'review') {
        // Token optimization: deterministic builder by default (saves 1 LLM call).
        if (brainFlags.generativeSabbathReview) {
          generatedDay = await generateReviewDay({
            planOutline,
            previousDays: readyDays,
            userResponse: run.response_text,
            devotionalLengthMinutes: DEFAULT_DEVOTIONAL_LENGTH_MINUTES,
          })
        } else {
          generatedDay = buildFallbackReview({
            planOutline,
            previousDays: readyDays,
            userResponse: run.response_text,
          })
        }
      } else {
        const result = await generateDevotionalDay({
          dayOutline,
          planOutline,
          userResponse: run.response_text,
          devotionalLengthMinutes: DEFAULT_DEVOTIONAL_LENGTH_MINUTES,
          previousDaysModules: previousModules,
          excludeChunkIds: usedChunkIds,
        })
        generatedDay = result.day
      }

      // Persist generated day to both in-memory store and Supabase.
      // Supabase persistence is critical for Vercel where each serverless
      // invocation has isolated memory.
      await updatePlanDayContent(planToken, nextPendingDay.day, generatedDay)

      // Calculate updated status
      const updatedDays = await getAllPlanDaysWithFallback(planToken)
      const updatedContent = updatedDays
        .map((d) => d.content)
        .sort((a, b) => a.day - b.day)
      const completedCount = updatedContent.filter(
        (d) => isDayReady(d),
      ).length
      const totalCount = updatedContent.length

      return withRequestIdHeaders(
        NextResponse.json(
          {
            ok: true,
            status: completedCount >= totalCount ? 'complete' : 'partial',
            generatedDay,
            totalDays: totalCount,
            completedDays: completedCount,
            nextPendingDay:
              updatedContent.find((d) => d.generationStatus === 'pending')
                ?.day ?? null,
          },
          { status: 200 },
        ),
        requestId,
      )
    } finally {
      releaseLock(planToken)
    }
  } catch (error) {
    logApiError({
      scope: 'soul-audit-generate-next',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl?.pathname ?? new URL(request.url).pathname,
      clientKey,
    })
    return jsonError({
      error: 'Unable to generate next devotional day right now.',
      status: 500,
      requestId,
    })
  }
}
