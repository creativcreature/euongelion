import { NextRequest, NextResponse } from 'next/server'
import {
  createRequestId,
  getClientKey,
  isSafeAuditOptionId,
  isSafeAuditRunId,
  jsonError,
  logApiError,
  normalizeTimezoneOffsetMinutes,
  readJsonWithLimit,
  sanitizeTimezone,
  takeRateLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'
import { buildOnboardingDay } from '@/lib/soul-audit/curated-builder'
import { parseAuditIntent } from '@/lib/brain/intent-parser'
import {
  buildDeterministicDay,
  composeDay,
  composeRecap,
  composeSabbath,
  retrieveIngredientsForDay,
  WEEK_CHIASTIC,
  WEEK_PARDES,
} from '@/lib/soul-audit/composer'
import {
  selectIngredients,
  type IngredientDirection,
} from '@/lib/soul-audit/ingredient-selector'
import {
  createPlan,
  getAllPlanDays,
  getAuditOptionsWithFallback,
  getAuditRunWithFallback,
  getConsentWithFallback,
  getPlanInstanceWithFallback,
  getSelectionWithFallback,
  saveConsent,
  saveSelection,
} from '@/lib/soul-audit/repository'
import { resolveStartPolicy } from '@/lib/soul-audit/schedule'
import { verifyConsentToken } from '@/lib/soul-audit/consent-token'
import { verifyRunToken } from '@/lib/soul-audit/run-token'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
import { crisisRequirement } from '@/lib/soul-audit/crisis'
import type {
  CustomPlanDay,
  SoulAuditSelectRequest,
  SoulAuditSelectResponse,
} from '@/types/soul-audit'

const MAX_SELECT_BODY_BYTES = 32_768
const MAX_SELECT_REQUESTS_PER_MINUTE = 30
const CURRENT_ROUTE_COOKIE = 'euangelion_current_route'
const CURRENT_ROUTE_MAX_AGE = 30 * 24 * 60 * 60
const CANDIDATES_PER_DIRECTION = 5

type RagCandidate = {
  key: string
  seriesSlug: string
  seriesTitle: string
  sourcePath: string
  dayNumber: number
  dayTitle: string
  scriptureReference: string
  scriptureText: string
  teachingText: string
  reflectionPrompt: string
  prayerText: string
  takeawayText: string
  searchText: string
}

type DevotionalDepthPreference =
  | 'short_5_7'
  | 'medium_20_30'
  | 'long_45_60'
  | 'variable'

// ─── Helpers ─────────────────────────────────────────────────────────

function toOnboardingMeta(
  plan:
    | {
        start_policy:
          | 'monday_cycle'
          | 'tuesday_archived_monday'
          | 'wed_sun_onboarding'
        onboarding_variant?:
          | 'none'
          | 'wednesday_3_day'
          | 'thursday_2_day'
          | 'friday_1_day'
          | 'weekend_bridge'
        onboarding_days?: number
        cycle_start_at: string
        timezone: string
        timezone_offset_minutes: number
      }
    | {
        startPolicy:
          | 'monday_cycle'
          | 'tuesday_archived_monday'
          | 'wed_sun_onboarding'
        onboardingVariant?:
          | 'none'
          | 'wednesday_3_day'
          | 'thursday_2_day'
          | 'friday_1_day'
          | 'weekend_bridge'
        onboardingDays?: number
        cycleStartAt: string
        timezone: string
        timezoneOffsetMinutes: number
      },
) {
  if ('start_policy' in plan) {
    return {
      startPolicy: plan.start_policy,
      onboardingVariant: plan.onboarding_variant ?? 'none',
      onboardingDays: plan.onboarding_days ?? 0,
      cycleStartAt: plan.cycle_start_at,
      timezone: plan.timezone,
      timezoneOffsetMinutes: plan.timezone_offset_minutes,
    }
  }

  return {
    startPolicy: plan.startPolicy,
    onboardingVariant: plan.onboardingVariant ?? 'none',
    onboardingDays: plan.onboardingDays ?? 0,
    cycleStartAt: plan.cycleStartAt,
    timezone: plan.timezone,
    timezoneOffsetMinutes: plan.timezoneOffsetMinutes,
  }
}

function withCurrentRouteCookie(response: NextResponse, route: string) {
  response.cookies.set(CURRENT_ROUTE_COOKIE, route, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: CURRENT_ROUTE_MAX_AGE,
    path: '/',
  })
  return response
}

function getInitialPlanDayNumber(
  days: Array<{ day: number } | { day_number: number }>,
): number {
  const dayNumbers = days
    .map((day) => ('day' in day ? day.day : day.day_number))
    .filter((day): day is number => Number.isFinite(day))
    .sort((a, b) => a - b)

  if (dayNumbers.length === 0) return 1
  return dayNumbers.includes(0) ? 0 : dayNumbers[0]
}

function buildAiResultsRoute(planToken: string, day: number): string {
  return `/soul-audit/plan/${planToken}?day=${day}`
}

function normalizeDepthPreference(
  value: unknown,
): DevotionalDepthPreference | null {
  if (
    value === 'short_5_7' ||
    value === 'medium_20_30' ||
    value === 'long_45_60' ||
    value === 'variable'
  ) {
    return value
  }
  return null
}

function wordTargetForDepth(params: {
  intentDepth: 'introductory' | 'intermediate' | 'deep-study'
  preference: DevotionalDepthPreference | null
}): number {
  const preference = params.preference
  if (preference === 'short_5_7') return 4000
  if (preference === 'medium_20_30') return 5000
  if (preference === 'long_45_60') return 6000

  if (params.intentDepth === 'introductory') return 4000
  if (params.intentDepth === 'deep-study') return 6000
  return 5000
}

function buildRagCandidates(params: {
  runId: string
  responseText: string
  intent: ReturnType<typeof parseAuditIntent>
  direction: IngredientDirection
}): RagCandidate[] {
  const scripturePlan = Array.from(
    new Set([
      params.direction.scriptureAnchor,
      ...params.intent.scriptureAnchors,
      'Psalm 119:105',
      'Philippians 4:6-7',
      'Romans 8:1',
      'James 1:5',
      'Psalm 46:10',
    ]),
  )

  return Array.from({ length: CANDIDATES_PER_DIRECTION }, (_, index) => {
    const dayNumber = index + 1
    const scriptureReference =
      scripturePlan[index % scripturePlan.length] ?? scripturePlan[0]
    const chiastic = WEEK_CHIASTIC[index] ?? "A'"
    const pardes = WEEK_PARDES[index] ?? 'integrated'
    const focus =
      params.direction.matchedKeywords[
        index % Math.max(1, params.direction.matchedKeywords.length)
      ] ??
      params.intent.themes[index % Math.max(1, params.intent.themes.length)] ??
      'faithful endurance'
    const scripture = scriptureReference

    return {
      key: `rag:${params.runId}:${params.direction.directionSlug}:${dayNumber}`,
      seriesSlug: params.direction.directionSlug,
      seriesTitle: params.direction.title,
      sourcePath: 'reference-rag',
      dayNumber,
      dayTitle: `Day ${dayNumber}: ${focus}`,
      scriptureReference: scripture,
      scriptureText:
        dayNumber === 1
          ? params.direction.day1Preview.scriptureText
          : `Read ${scripture} slowly. Mark one phrase that names the tension and one phrase that names the promise.`,
      teachingText: `RAG-composed day (${chiastic}, ${pardes}) grounded in reference witnesses around ${focus}.`,
      reflectionPrompt: `Where does ${scripture} challenge or clarify ${focus}?`,
      prayerText:
        'Lord, form truth and courage in me as I read, reflect, and obey.',
      takeawayText:
        'Write one concrete act of obedience from today’s reading and complete it before the day ends.',
      searchText: `${params.responseText} ${focus} ${scripture}`.toLowerCase(),
    }
  })
}

// ─── POST Handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)
  try {
    const parsed = await readJsonWithLimit<SoulAuditSelectRequest>({
      request,
      maxBytes: MAX_SELECT_BODY_BYTES,
    })
    if (!parsed.ok) {
      return jsonError({
        error: parsed.error,
        status: parsed.status,
        requestId,
      })
    }

    const limiter = await takeRateLimit({
      namespace: 'soul-audit-select',
      key: clientKey,
      limit: MAX_SELECT_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return jsonError({
        error: 'Too many selection attempts. Please retry shortly.',
        status: 429,
        requestId,
        rateLimit: limiter,
      })
    }

    const body = parsed.data
    const runId = String(body.auditRunId || '').trim()
    const optionId = String(body.optionId || '').trim()

    if (!runId || !optionId) {
      return jsonError({
        error: 'auditRunId and optionId are required.',
        status: 400,
        requestId,
      })
    }

    if (!isSafeAuditRunId(runId) || !isSafeAuditOptionId(optionId)) {
      return jsonError({
        error: 'Invalid auditRunId or optionId format.',
        status: 400,
        requestId,
      })
    }

    const sessionToken = await getOrCreateAuditSessionToken()

    // ─── Run verification ───
    let run = await getAuditRunWithFallback(runId)
    const verifiedToken = verifyRunToken({
      token: body.runToken,
      expectedRunId: runId,
      sessionToken,
    })
    if (!run && verifiedToken) {
      run = {
        id: runId,
        session_token: sessionToken,
        response_text: verifiedToken.responseText,
        crisis_detected: verifiedToken.crisisDetected,
        created_at: verifiedToken.issuedAt,
      }
    }

    if (!run) {
      return jsonError({
        error: 'Audit run not found.',
        code: 'RUN_NOT_FOUND',
        status: 404,
        requestId,
      })
    }

    if (run.session_token !== sessionToken && !verifiedToken) {
      return jsonError({
        error: 'Audit run access denied.',
        code: 'RUN_ACCESS_DENIED',
        status: 403,
        requestId,
      })
    }
    if (run.session_token !== sessionToken && verifiedToken) {
      run = {
        ...run,
        session_token: sessionToken,
        response_text: verifiedToken.responseText,
        crisis_detected: verifiedToken.crisisDetected,
      }
    }

    // ─── Consent verification (inline or via token) ───
    let consent = await getConsentWithFallback(runId)
    if (!consent) {
      // Try consentToken first (legacy path)
      const verifiedConsent = verifyConsentToken({
        token: body.consentToken,
        expectedRunId: runId,
        sessionToken,
      })
      if (verifiedConsent) {
        consent = await saveConsent({
          runId,
          sessionToken,
          essentialAccepted: verifiedConsent.essentialAccepted,
          analyticsOptIn: verifiedConsent.analyticsOptIn,
          crisisAcknowledged: verifiedConsent.crisisAcknowledged,
        })
      }
    }
    if (!consent && body.essentialAccepted) {
      // Inline consent — accepted as part of selection (no separate consent step)
      consent = await saveConsent({
        runId,
        sessionToken,
        essentialAccepted: true,
        analyticsOptIn: Boolean(body.analyticsOptIn),
        crisisAcknowledged: Boolean(body.crisisAcknowledged),
      })
    }

    if (!consent?.essential_accepted) {
      return jsonError({
        error: 'Essential consent is required before selection.',
        code: 'ESSENTIAL_CONSENT_REQUIRED',
        status: 400,
        requestId,
        details: {
          requiredActions: {
            essentialConsent: true,
            analyticsOptInOptional: true,
          },
        },
      })
    }

    if (run.crisis_detected && !consent.crisis_acknowledged) {
      return jsonError({
        error: 'Crisis resource acknowledgement is required before continuing.',
        code: 'CRISIS_ACK_REQUIRED',
        status: 400,
        requestId,
        details: {
          crisis: crisisRequirement(true),
        },
      })
    }

    // ─── Idempotency: return existing selection if already made ───
    const existingSelection = await getSelectionWithFallback(runId)
    if (existingSelection) {
      const hasPlan = !!existingSelection.plan_token
      const existingPlan = hasPlan
        ? await getPlanInstanceWithFallback(existingSelection.plan_token!)
        : null
      const existingPlanDays = hasPlan
        ? await getAllPlanDays(existingSelection.plan_token!)
        : []
      const existingInitialDay = getInitialPlanDayNumber(existingPlanDays)
      const existingRoute = existingSelection.plan_token
        ? buildAiResultsRoute(existingSelection.plan_token, existingInitialDay)
        : '/soul-audit/results'

      const existingPayload: SoulAuditSelectResponse = {
        ok: true,
        auditRunId: runId,
        selectionType: existingSelection.option_kind,
        route: existingRoute,
        planToken: existingSelection.plan_token ?? undefined,
        seriesSlug: existingSelection.series_slug,
        planDays: hasPlan
          ? existingPlanDays
              .map((day) => day.content)
              .sort((a, b) => a.day - b.day)
          : undefined,
        onboardingMeta: existingPlan
          ? toOnboardingMeta(existingPlan)
          : undefined,
      }
      return withCurrentRouteCookie(
        withRequestIdHeaders(
          NextResponse.json(existingPayload, { status: 200 }),
          requestId,
        ),
        existingPayload.route,
      )
    }

    // ─── Find selected option ───
    const options = await getAuditOptionsWithFallback(runId)
    const fallbackOptions = verifiedToken?.options ?? []
    const option = [...options, ...fallbackOptions].find(
      (item) => item.id === optionId,
    )
    if (!option) {
      return jsonError({
        error: 'Option not found.',
        status: 404,
        requestId,
      })
    }

    // ─── Resolve selected RAG direction (no pre-authored devotional dependency) ───
    const intent = parseAuditIntent(run.response_text)
    const resolvedDirections = selectIngredients(run.response_text).directions
    const selectedDirection =
      resolvedDirections.find((direction) => direction.id === option.id) ??
      resolvedDirections.find(
        (direction) =>
          direction.directionSlug === option.slug &&
          direction.rank === option.rank,
      ) ??
      null

    if (!selectedDirection) {
      return jsonError({
        error:
          'This direction could not be reconstructed from your reflection. Please retry submission.',
        code: 'DIRECTION_RECONSTRUCTION_FAILED',
        status: 422,
        requestId,
      })
    }

    const seriesCandidates = buildRagCandidates({
      runId,
      responseText: run.response_text,
      intent,
      direction: selectedDirection,
    })

    // ─── Compose days from reference library ───
    // Day 1: LLM-composed (one call, 5-8s) — produces flowing prose from
    //   reference chunks. Falls back to deterministic if LLM unavailable.
    // Days 2-5: Deterministic (instant) — stored with reference chunks,
    //   can be LLM-upgraded later when user navigates to them.
    const usedChunkIds: string[] = []
    const composedDays: CustomPlanDay[] = []
    const targetWordCount = wordTargetForDepth({
      intentDepth: intent.depthPreference,
      preference: normalizeDepthPreference(body.devotionalDepthPreference),
    })

    for (
      let i = 0;
      i < seriesCandidates.length && i < CANDIDATES_PER_DIRECTION;
      i++
    ) {
      const candidate = seriesCandidates[i]
      const dayNumber = i + 1
      const chunks = retrieveIngredientsForDay({
        candidate,
        userResponse: run.response_text,
        intent,
        chiasticPosition: WEEK_CHIASTIC[i] ?? "B'",
        pardesLevel: WEEK_PARDES[i] ?? 'integrated',
        excludeChunkIds: usedChunkIds,
        limit: 20,
      })

      if (chunks.length === 0 && process.env.NODE_ENV !== 'test') {
        return jsonError({
          error:
            'Reference library is unavailable right now. Please retry in a moment.',
          code: 'REFERENCE_LIBRARY_UNAVAILABLE',
          status: 503,
          requestId,
        })
      }

      console.info(
        `[soul-audit:select] Composing Day ${dayNumber} — candidate: ${candidate.key}, ` +
          `chunks: ${chunks.length}, target: ${targetWordCount}w`,
      )

      const dayParams = {
        dayNumber,
        chiasticPosition: WEEK_CHIASTIC[i] ?? ("B'" as const),
        pardesLevel: WEEK_PARDES[i] ?? 'integrated',
        candidate,
        userResponse: run.response_text,
        intent,
        targetWordCount,
        referenceChunks: chunks,
        planTitle: selectedDirection.title,
      }

      if (dayNumber === 1) {
        // Day 1: LLM-composed — the user reads this immediately.
        // composeDay tries LLM first, falls back to deterministic.
        const result = await composeDay(dayParams)
        usedChunkIds.push(...result.usedChunkIds)
        composedDays.push(result.day)
      } else {
        // Days 2-5: deterministic from reference chunks (instant).
        const day = buildDeterministicDay(dayParams)
        usedChunkIds.push(...chunks.map((c) => c.id))
        composedDays.push(day)
      }
    }

    // ─── Days 6-7: recap (Sat) + sabbath (Sun), deterministic ───
    const recapDay = composeRecap({
      previousDays: composedDays,
      planTitle: selectedDirection.title,
      userResponse: run.response_text,
    })

    const sabbathDay = composeSabbath({
      previousDays: composedDays,
      planTitle: selectedDirection.title,
      userResponse: run.response_text,
    })

    const allDays = [...composedDays, recapDay, sabbathDay]

    // ─── Timezone + schedule ───
    const timezone =
      sanitizeTimezone(body.timezone) ??
      sanitizeTimezone(request.headers.get('x-timezone')) ??
      Intl.DateTimeFormat().resolvedOptions().timeZone ??
      'UTC'
    const offsetMinutes =
      normalizeTimezoneOffsetMinutes(body.timezoneOffsetMinutes) ??
      normalizeTimezoneOffsetMinutes(
        request.headers.get('x-timezone-offset'),
      ) ??
      0

    const schedule = resolveStartPolicy(new Date(), offsetMinutes)

    // Mid-week onboarding: prepend an onboarding day if needed
    const daysForPlan =
      schedule.startPolicy === 'wed_sun_onboarding' && allDays[0]
        ? [
            buildOnboardingDay({
              userResponse: run.response_text,
              firstDay: allDays[0],
              variant: schedule.onboardingVariant,
              onboardingDays: schedule.onboardingDays,
            }),
            ...allDays,
          ]
        : allDays

    // ─── Create plan + save selection ───
    const plan = await createPlan({
      runId,
      sessionToken,
      seriesSlug: selectedDirection.directionSlug,
      timezone,
      timezoneOffsetMinutes: offsetMinutes,
      startPolicy: schedule.startPolicy,
      startedAt: schedule.startedAt,
      cycleStartAt: schedule.cycleStartAt,
      onboardingVariant: schedule.onboardingVariant,
      onboardingDays: schedule.onboardingDays,
      days: daysForPlan,
    })

    await saveSelection({
      runId,
      optionId: option.id,
      optionKind: 'ai_primary',
      seriesSlug: selectedDirection.directionSlug,
      planToken: plan.token,
    })

    // Warm cache for immediate UI fetches
    getAllPlanDays(plan.token)

    const payload: SoulAuditSelectResponse = {
      ok: true,
      auditRunId: runId,
      selectionType: 'ai_primary',
      route: buildAiResultsRoute(
        plan.token,
        getInitialPlanDayNumber(daysForPlan),
      ),
      planToken: plan.token,
      seriesSlug: selectedDirection.directionSlug,
      planDays: daysForPlan,
      onboardingMeta: toOnboardingMeta({
        startPolicy: schedule.startPolicy,
        onboardingVariant: schedule.onboardingVariant,
        onboardingDays: schedule.onboardingDays,
        cycleStartAt: schedule.cycleStartAt,
        timezone,
        timezoneOffsetMinutes: offsetMinutes,
      }),
    }

    return withCurrentRouteCookie(
      withRequestIdHeaders(
        NextResponse.json(payload, { status: 200 }),
        requestId,
      ),
      payload.route,
    )
  } catch (error) {
    logApiError({
      scope: 'soul-audit-select',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl?.pathname ?? '/api/soul-audit/select',
      clientKey,
    })
    return jsonError({
      error: 'Unable to start devotional plan right now.',
      status: 500,
      requestId,
    })
  }
}
