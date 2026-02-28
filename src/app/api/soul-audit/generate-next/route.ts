/**
 * POST /api/soul-audit/generate-next
 *
 * Cascading day generation for generative plans.
 * Client calls this after selecting an ai_generative option to progressively
 * generate days one at a time. Each call generates the next pending day.
 *
 * Body: {
 *   planToken: string,
 *   // Client-side context (used when Supabase tables don't have the data):
 *   planOutline?: PlanOutlinePreview,
 *   optionMeta?: { slug, title, question, reasoning },
 *   userResponse?: string,
 *   currentDays?: CustomPlanDay[],
 * }
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
import type {
  CustomPlanDay,
  PlanOutline,
  PlanOutlinePreview,
} from '@/types/soul-audit'

// Allow up to 120s for LLM generation (requires Vercel Pro).
// Without this, Vercel Hobby defaults to 10s which kills every LLM call.
export const maxDuration = 120

interface GenerateNextBody {
  planToken?: string
  // Client-side context fallback — used when Supabase tables are unavailable
  planOutline?: PlanOutlinePreview
  optionMeta?: {
    slug: string
    title: string
    question: string
    reasoning: string
  }
  userResponse?: string
  currentDays?: CustomPlanDay[]
}

// Plan outline + 7 days of pending content can be ~50KB
const MAX_BODY_BYTES = 128_000
const MAX_GENERATES_PER_MINUTE = 30
// TODO(F-053): Replace with user's slider preference once stored on plan instance
const DEFAULT_DEVOTIONAL_LENGTH_MINUTES = 10

/** A day is "ready" if generationStatus is 'ready' or absent (pre-generative days). */
function isDayReady(d: CustomPlanDay): boolean {
  return d.generationStatus === 'ready' || d.generationStatus === undefined
}

// In-memory lock for same-instance concurrency prevention.
// Cross-instance protection is handled by isDayStillPending() which
// checks Supabase for the day's generationStatus before generating.
// Stores a timestamp so stale locks auto-expire (e.g. if Vercel kills
// the function mid-generation, the finally block never runs).
const LOCK_TTL_MS = 90_000
const generationLocks = new Map<string, number>()

function acquireLock(planToken: string): boolean {
  const existing = generationLocks.get(planToken)
  if (existing && Date.now() - existing < LOCK_TTL_MS) return false
  // Either no lock or stale lock — acquire
  generationLocks.set(planToken, Date.now())
  return true
}

function releaseLock(planToken: string) {
  generationLocks.delete(planToken)
}

/**
 * Try to resolve the plan outline from Supabase records.
 * Returns null if any required piece is missing (tables don't exist, etc.).
 */
async function resolveOutlineFromSupabase(auditRunId: string): Promise<{
  planOutline: PlanOutline
  userResponse: string
} | null> {
  try {
    const selection = await getSelectionWithFallback(auditRunId)
    if (!selection) return null

    const run = await getAuditRunWithFallback(auditRunId)
    if (!run) return null

    const options = await getAuditOptionsWithFallback(auditRunId)
    const option = options.find((o) => o.id === selection.option_id)
    if (!option?.planOutline) return null

    const planOutline = reconstructPlanOutline({
      id: option.slug,
      title: option.title,
      question: option.question,
      reasoning: option.reasoning,
      preview: option.planOutline,
    })

    return { planOutline, userResponse: run.response_text }
  } catch {
    return null
  }
}

/**
 * Resolve plan outline from the client-supplied body.
 * This is the fallback when Supabase tables don't exist yet.
 */
function resolveOutlineFromBody(
  body: GenerateNextBody,
): { planOutline: PlanOutline; userResponse: string } | null {
  if (!body.planOutline || !body.optionMeta || !body.userResponse) return null

  try {
    const planOutline = reconstructPlanOutline({
      id: body.optionMeta.slug,
      title: body.optionMeta.title,
      question: body.optionMeta.question,
      reasoning: body.optionMeta.reasoning,
      preview: body.planOutline,
    })
    return { planOutline, userResponse: body.userResponse }
  } catch {
    return null
  }
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

    const body = parsed.data
    const planToken = String(body.planToken || '').trim()
    if (!planToken) {
      return jsonError({
        error: 'planToken is required.',
        status: 400,
        requestId,
      })
    }

    // Try Supabase first for plan instance verification
    const planInstance = await getPlanInstanceWithFallback(planToken)

    // If Supabase has the plan, verify session ownership
    if (planInstance && planInstance.session_token !== sessionToken) {
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
      // Get existing plan days — try Supabase first, fall back to client data.
      // Track the data source so we can skip Supabase-only guards when using
      // client-supplied data (Supabase tables may not exist yet).
      let existingDayContent: CustomPlanDay[]
      let usingClientData = false

      const supabaseDays = await getAllPlanDaysWithFallback(planToken)
      const supabaseContent =
        supabaseDays.length > 0
          ? supabaseDays.map((d) => d.content).sort((a, b) => a.day - b.day)
          : []
      const clientDays =
        Array.isArray(body.currentDays) && body.currentDays.length > 0
          ? [...body.currentDays].sort((a, b) => a.day - b.day)
          : []

      if (supabaseContent.length > 0 && clientDays.length > supabaseContent.length) {
        // Partial in-memory/Supabase data (e.g. only the generated day) but
        // client has the full 7-day set. Merge: prefer server data (may have
        // generated content) but fill in pending days from the client.
        const serverDayNumbers = new Set(supabaseContent.map((d) => d.day))
        const missingClientDays = clientDays.filter(
          (d) => !serverDayNumbers.has(d.day),
        )
        existingDayContent = [...supabaseContent, ...missingClientDays].sort(
          (a, b) => a.day - b.day,
        )
        usingClientData = true
      } else if (supabaseContent.length > 0) {
        existingDayContent = supabaseContent
      } else if (clientDays.length > 0) {
        // Supabase has no days — use client-supplied day state
        existingDayContent = clientDays
        usingClientData = true
      } else {
        // Neither Supabase nor client has day data
        return jsonError({
          error: 'No plan days found. Please start a new Soul Audit.',
          code: 'NO_PLAN_DAYS',
          status: 404,
          requestId,
        })
      }

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
              completedDays: existingDayContent.filter((d) => isDayReady(d))
                .length,
            },
            { status: 200 },
          ),
          requestId,
        )
      }

      // Cross-instance guard: verify the day is still pending in Supabase
      // before spending tokens on LLM generation. Another Vercel instance
      // may have already generated this day.
      // SKIP this check when using client-supplied data — Supabase tables
      // may not exist, causing isDayStillPending to incorrectly return false
      // (null data interpreted as "already generated").
      if (!usingClientData) {
        const stillPending = await isDayStillPending(
          planToken,
          nextPendingDay.day,
        )
        if (!stillPending) {
          // Day was already generated by another instance — re-fetch status
          const refreshedDays = await getAllPlanDaysWithFallback(planToken)
          const refreshedContent = refreshedDays
            .map((d) => d.content)
            .sort((a, b) => a.day - b.day)
          const completed = refreshedContent.filter((d) =>
            isDayReady(d),
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
      }

      // Resolve plan outline + user response.
      // Strategy: try Supabase first, fall back to client-supplied context.
      let resolved: { planOutline: PlanOutline; userResponse: string } | null =
        null

      if (planInstance) {
        resolved = await resolveOutlineFromSupabase(planInstance.audit_run_id)
      }

      if (!resolved) {
        resolved = resolveOutlineFromBody(body)
      }

      if (!resolved) {
        return jsonError({
          error: 'Plan outline not available. Please start a new Soul Audit.',
          code: 'OUTLINE_MISSING',
          status: 422,
          requestId,
        })
      }

      const { planOutline, userResponse } = resolved

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
      const readyDays = existingDayContent.filter((d) => isDayReady(d))
      const previousModules = readyDays
        .filter((d) => d.modules)
        .map((d) => d.modules!.map((m) => m.type))
      const usedChunkIds = readyDays
        .flatMap((d) => d.endnotes || [])
        .filter((e) => e.source === 'Reference')
        .map((e) => e.note)

      let generatedDay: CustomPlanDay

      if (dayOutline.dayType === 'sabbath') {
        if (brainFlags.generativeSabbathReview) {
          generatedDay = await generateSabbathDay({
            planOutline,
            previousDays: readyDays,
            userResponse,
            devotionalLengthMinutes: DEFAULT_DEVOTIONAL_LENGTH_MINUTES,
          })
        } else {
          generatedDay = buildFallbackSabbath({
            planOutline,
            previousDays: readyDays,
            userResponse,
          })
        }
      } else if (dayOutline.dayType === 'review') {
        if (brainFlags.generativeSabbathReview) {
          generatedDay = await generateReviewDay({
            planOutline,
            previousDays: readyDays,
            userResponse,
            devotionalLengthMinutes: DEFAULT_DEVOTIONAL_LENGTH_MINUTES,
          })
        } else {
          generatedDay = buildFallbackReview({
            planOutline,
            previousDays: readyDays,
            userResponse,
          })
        }
      } else {
        const result = await generateDevotionalDay({
          dayOutline,
          planOutline,
          userResponse,
          devotionalLengthMinutes: DEFAULT_DEVOTIONAL_LENGTH_MINUTES,
          previousDaysModules: previousModules,
          excludeChunkIds: usedChunkIds,
        })
        generatedDay = result.day
      }

      // Persist generated day to both in-memory store and Supabase.
      // If Supabase tables exist, this persists for cross-instance access.
      // If not, at least in-memory is updated for same-instance calls.
      await updatePlanDayContent(planToken, nextPendingDay.day, generatedDay)

      // Calculate updated status from current knowledge
      const updatedDayContent = existingDayContent.map((d) =>
        d.day === nextPendingDay.day ? generatedDay : d,
      )
      const completedCount = updatedDayContent.filter((d) =>
        isDayReady(d),
      ).length
      const totalCount = updatedDayContent.length

      return withRequestIdHeaders(
        NextResponse.json(
          {
            ok: true,
            status: completedCount >= totalCount ? 'complete' : 'partial',
            generatedDay,
            totalDays: totalCount,
            completedDays: completedCount,
            nextPendingDay:
              updatedDayContent.find((d) => d.generationStatus === 'pending')
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
      path: request.nextUrl?.pathname ?? '/api/soul-audit/generate-next',
      clientKey,
    })
    return jsonError({
      error: 'Unable to generate next devotional day right now.',
      status: 500,
      requestId,
    })
  }
}
