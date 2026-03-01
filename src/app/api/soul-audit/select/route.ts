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
import {
  buildDeterministicDay,
  composeRecap,
  composeSabbath,
  retrieveIngredientsForDay,
  WEEK_CHIASTIC,
  WEEK_PARDES,
} from '@/lib/soul-audit/composer'
import {
  findCandidateBySeed,
  getCuratedDayCandidates,
  rankCandidatesForInput,
} from '@/lib/soul-audit/curation-engine'
import { parseAuditIntent } from '@/lib/brain/intent-parser'
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
const DEFAULT_WORD_TARGET = 4500

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

    // ─── Resolve curation seed → anchor candidate ───
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

    if (!curationSeed) {
      return jsonError({
        error:
          'This option is missing curation data. Please choose another option or retry.',
        code: 'CURATION_SEED_MISSING',
        status: 422,
        requestId,
      })
    }

    const anchorCandidate = findCandidateBySeed(curationSeed)
    if (!anchorCandidate) {
      return jsonError({
        error:
          'Curated content for this direction could not be found. Please choose another option or retry.',
        code: 'ANCHOR_CANDIDATE_NOT_FOUND',
        status: 422,
        requestId,
      })
    }

    // ─── Gather candidates for Days 1-5 ───
    const allCandidates = getCuratedDayCandidates()
    const seriesCandidates = allCandidates
      .filter((c) => c.seriesSlug === anchorCandidate.seriesSlug)
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .slice(0, CANDIDATES_PER_DIRECTION)

    // Supplement from ranked candidates if series has fewer than 5 days
    if (seriesCandidates.length < CANDIDATES_PER_DIRECTION) {
      const intent = parseAuditIntent(run.response_text)
      const ranked = rankCandidatesForInput({
        input: run.response_text,
        aiThemes: intent.themes,
      })
      const usedKeys = new Set(seriesCandidates.map((c) => c.key))
      for (const entry of ranked) {
        if (seriesCandidates.length >= CANDIDATES_PER_DIRECTION) break
        if (usedKeys.has(entry.candidate.key)) continue
        seriesCandidates.push(entry.candidate)
        usedKeys.add(entry.candidate.key)
      }
    }

    // ─── Compose ALL days from reference library ───
    // Uses composeDay which tries LLM first, then falls back to deterministic
    // composition from reference chunks. Either path uses real theological
    // sources from reference-index.json (Augustine, Calvin, Luther, etc.)
    const intent = parseAuditIntent(run.response_text)
    const usedChunkIds: string[] = []
    const composedDays: CustomPlanDay[] = []

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
        excludeChunkIds: usedChunkIds,
      })

      console.info(
        `[soul-audit:select] Composing Day ${dayNumber} — candidate: ${candidate.key}, ` +
          `chunks: ${chunks.length}, target: ${DEFAULT_WORD_TARGET}w`,
      )

      // Deterministic composition from reference library — instant, no LLM,
      // no timeout risk. Each day assembled from 15-20 real theological
      // source chunks (Augustine, Calvin, Luther, etc.)
      const day = buildDeterministicDay({
        dayNumber,
        chiasticPosition: WEEK_CHIASTIC[i] ?? ("B'" as const),
        pardesLevel: WEEK_PARDES[i] ?? 'integrated',
        candidate,
        userResponse: run.response_text,
        intent,
        targetWordCount: DEFAULT_WORD_TARGET,
        referenceChunks: chunks,
        planTitle: option.title,
      })

      usedChunkIds.push(...chunks.map((c) => c.id))
      composedDays.push(day)
    }

    // ─── Days 6-7: sabbath + recap (deterministic, use composed days) ───
    const sabbathDay = composeSabbath({
      previousDays: composedDays,
      planTitle: option.title,
      userResponse: run.response_text,
    })

    const recapDay = composeRecap({
      previousDays: composedDays,
      planTitle: option.title,
      userResponse: run.response_text,
    })

    const allDays = [...composedDays, sabbathDay, recapDay]

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
      optionKind: 'ai_primary',
      seriesSlug: option.slug,
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
