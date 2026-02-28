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
import {
  buildCuratedFirstPlan,
  buildOnboardingDay,
  MissingCuratedModuleError,
  MissingReferenceGroundingError,
} from '@/lib/soul-audit/curated-builder'
import { reconstructPlanOutline } from '@/lib/soul-audit/outline-generator'
import {
  createPlan,
  getAllPlanDays,
  getAuditOptionsWithFallback,
  getPlanInstanceWithFallback,
  getAuditRunWithFallback,
  getConsentWithFallback,
  getSelectionWithFallback,
  saveConsent,
  saveSelection,
} from '@/lib/soul-audit/repository'
import { resolveStartPolicy } from '@/lib/soul-audit/schedule'
import { verifyConsentToken } from '@/lib/soul-audit/consent-token'
import { verifyRunToken } from '@/lib/soul-audit/run-token'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
import { crisisRequirement } from '@/lib/soul-audit/crisis'
import { SERIES_DATA } from '@/data/series'
import type {
  CustomPlanDay,
  SoulAuditSelectRequest,
  SoulAuditSelectResponse,
} from '@/types/soul-audit'

const MAX_SELECT_BODY_BYTES = 32_768
const MAX_SELECT_REQUESTS_PER_MINUTE = 30
const CURRENT_ROUTE_COOKIE = 'euangelion_current_route'
const CURRENT_ROUTE_MAX_AGE = 30 * 24 * 60 * 60

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

function curatedSelectionRoute(seriesSlug: string): string {
  const firstDay = SERIES_DATA[seriesSlug]?.days?.[0]
  if (firstDay?.slug) {
    return `/devotional/${firstDay.slug}`
  }
  return `/series/${seriesSlug}`
}

function getInitialPlanDayNumber(
  days: Array<
    | {
        day: number
      }
    | {
        day_number: number
      }
  >,
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

    let consent = await getConsentWithFallback(runId)
    if (!consent) {
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

    const existingSelection = await getSelectionWithFallback(runId)
    if (existingSelection) {
      const isAiWithPlan =
        existingSelection.plan_token &&
        (existingSelection.option_kind === 'ai_primary' ||
          existingSelection.option_kind === 'ai_generative')
      const existingPlan = isAiWithPlan
        ? await getPlanInstanceWithFallback(existingSelection.plan_token!)
        : null
      const existingPlanDays = isAiWithPlan
        ? await getAllPlanDays(existingSelection.plan_token!)
        : []
      const existingInitialDay = getInitialPlanDayNumber(existingPlanDays)
      const existingAiRoute = existingSelection.plan_token
        ? buildAiResultsRoute(existingSelection.plan_token, existingInitialDay)
        : '/soul-audit/results'
      const existingPlanDayContent = existingPlanDays
        .map((day) => day.content)
        .sort((a, b) => a.day - b.day)
      const isExistingGenerative =
        existingSelection.option_kind === 'ai_generative'
      const existingPayload: SoulAuditSelectResponse = {
        ok: true,
        auditRunId: runId,
        selectionType: existingSelection.option_kind,
        route:
          existingSelection.option_kind === 'curated_prefab'
            ? curatedSelectionRoute(existingSelection.series_slug)
            : existingAiRoute,
        planToken: existingSelection.plan_token ?? undefined,
        seriesSlug: existingSelection.series_slug,
        planDays: isAiWithPlan ? existingPlanDayContent : undefined,
        onboardingMeta: existingPlan
          ? toOnboardingMeta(existingPlan)
          : undefined,
        ...(isExistingGenerative
          ? {
              generationStatus:
                existingPlanDayContent.length >= 7 ? 'complete' : 'partial',
              planType: 'generative' as const,
            }
          : {}),
      }
      return withCurrentRouteCookie(
        withRequestIdHeaders(
          NextResponse.json(existingPayload, { status: 200 }),
          requestId,
        ),
        existingPayload.route,
      )
    }

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

    if (option.kind === 'curated_prefab') {
      await saveSelection({
        runId,
        optionId: option.id,
        optionKind: option.kind,
        seriesSlug: option.slug,
        planToken: null,
      })

      const payload: SoulAuditSelectResponse = {
        ok: true,
        auditRunId: runId,
        selectionType: 'curated_prefab',
        route: curatedSelectionRoute(option.slug),
        seriesSlug: option.slug,
      }
      return withCurrentRouteCookie(
        withRequestIdHeaders(
          NextResponse.json(payload, { status: 200 }),
          requestId,
        ),
        payload.route,
      )
    }

    // ─── ai_generative: Return immediately, generate all days progressively ───
    // F-058: No synchronous LLM call at selection time. All days start as
    // "pending" and the cascade generator (generate-next) handles them.
    // This prevents Vercel function timeouts that caused GENERATIVE_DAY1_FAILED.
    if (option.kind === 'ai_generative') {
      const outlinePreview = option.planOutline
      if (!outlinePreview || !outlinePreview.dayOutlines?.length) {
        return jsonError({
          error:
            'This generative pathway is missing its plan outline. Please choose another option or retry.',
          code: 'GENERATIVE_OUTLINE_MISSING',
          status: 422,
          requestId,
        })
      }

      const planOutline = reconstructPlanOutline({
        id: option.slug,
        title: option.title,
        question: option.question,
        reasoning: option.reasoning,
        preview: outlinePreview,
      })

      if (!planOutline.dayOutlines.length) {
        return jsonError({
          error: 'Generative plan has no day outlines.',
          code: 'GENERATIVE_DAY_OUTLINE_MISSING',
          status: 422,
          requestId,
        })
      }

      // All days start as pending — cascade generation handles each one
      // via /api/soul-audit/generate-next using real RAG references.
      const allDays: CustomPlanDay[] = planOutline.dayOutlines.map(
        (outline) => ({
          day: outline.day,
          dayType: outline.dayType,
          title: outline.title,
          scriptureReference: outline.scriptureReference,
          scriptureText: '',
          reflection: '',
          prayer: '',
          nextStep: '',
          journalPrompt: '',
          chiasticPosition: outline.chiasticPosition,
          generationStatus: 'pending' as const,
        }),
      )

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

      const plan = await createPlan({
        runId,
        sessionToken,
        seriesSlug: option.slug,
        timezone,
        timezoneOffsetMinutes: offsetMinutes,
        startPolicy: schedule.startPolicy,
        startedAt: schedule.startedAt,
        cycleStartAt: schedule.cycleStartAt,
        onboardingVariant: schedule.onboardingVariant,
        onboardingDays: schedule.onboardingDays,
        days: allDays,
      })

      await saveSelection({
        runId,
        optionId: option.id,
        optionKind: 'ai_generative',
        seriesSlug: option.slug,
        planToken: plan.token,
      })

      const generativePayload: SoulAuditSelectResponse = {
        ok: true,
        auditRunId: runId,
        selectionType: 'ai_generative',
        route: buildAiResultsRoute(plan.token, 1),
        planToken: plan.token,
        seriesSlug: option.slug,
        planDays: allDays,
        onboardingMeta: toOnboardingMeta({
          startPolicy: schedule.startPolicy,
          onboardingVariant: schedule.onboardingVariant,
          onboardingDays: schedule.onboardingDays,
          cycleStartAt: schedule.cycleStartAt,
          timezone,
          timezoneOffsetMinutes: offsetMinutes,
        }),
        generationStatus: 'partial',
        planType: 'generative',
      }

      // Warm cache path for immediate UI fetches.
      getAllPlanDays(plan.token)

      return withCurrentRouteCookie(
        withRequestIdHeaders(
          NextResponse.json(generativePayload, { status: 200 }),
          requestId,
        ),
        generativePayload.route,
      )
    }

    // ─── ai_primary: Curated-first plan (existing path) ───
    const curationSeed =
      option.preview &&
      typeof option.preview === 'object' &&
      option.preview.curationSeed &&
      typeof option.preview.curationSeed === 'object' &&
      typeof option.preview.curationSeed.seriesSlug === 'string' &&
      typeof option.preview.curationSeed.dayNumber === 'number' &&
      typeof option.preview.curationSeed.candidateKey === 'string'
        ? option.preview.curationSeed
        : null

    let planDays
    try {
      planDays = buildCuratedFirstPlan({
        seriesSlug: option.slug,
        userResponse: run.response_text,
        anchorSeed: curationSeed,
      })
    } catch (error) {
      if (
        error instanceof MissingCuratedModuleError ||
        error instanceof MissingReferenceGroundingError
      ) {
        return jsonError({
          error:
            'This AI pathway could not be curated with grounded modules right now. Please choose another AI option or retry in a moment.',
          code: 'AI_PATHWAY_GROUNDING_UNAVAILABLE',
          status: 422,
          requestId,
        })
      } else {
        throw error
      }
    }

    if (!Array.isArray(planDays) || planDays.length === 0) {
      return jsonError({
        error: 'Unable to start devotional plan right now.',
        status: 500,
        requestId,
      })
    }

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
    const daysForPlan =
      schedule.startPolicy === 'wed_sun_onboarding' && planDays[0]
        ? [
            buildOnboardingDay({
              userResponse: run.response_text,
              firstDay: planDays[0],
              variant: schedule.onboardingVariant,
              onboardingDays: schedule.onboardingDays,
            }),
            ...planDays,
          ]
        : planDays

    const plan = await createPlan({
      runId,
      sessionToken,
      seriesSlug: option.slug,
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
      optionKind: option.kind,
      seriesSlug: option.slug,
      planToken: plan.token,
    })

    const payload: SoulAuditSelectResponse = {
      ok: true,
      auditRunId: runId,
      selectionType: 'ai_primary',
      route: buildAiResultsRoute(
        plan.token,
        getInitialPlanDayNumber(daysForPlan),
      ),
      planToken: plan.token,
      seriesSlug: option.slug,
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

    // Warm in-memory cache for immediate UI fetches.
    getAllPlanDays(plan.token)

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
