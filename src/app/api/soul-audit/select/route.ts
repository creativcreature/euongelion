import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  createRequestId,
  getClientKey,
  getDeploymentFingerprint,
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
import { crisisRequirement } from '@/lib/soul-audit/crisis'
import {
  STALL_TIMEOUT_MS,
  TOTAL_PLAN_DAYS,
  USING_QUEUE_FALLBACK,
} from '@/lib/soul-audit/constants'
import { verifyConsentToken } from '@/lib/soul-audit/consent-token'
import { buildSchedule, calculateStartDate } from '@/lib/soul-audit/plan-utils'
import {
  resolveStartPolicy,
  withOnboardingDayZero,
} from '@/lib/soul-audit/schedule'
import { buildOnboardingDay } from '@/lib/soul-audit/curated-builder'
import type { CustomPlanDay } from '@/types/soul-audit'
import type { DayContent, DayScheduleEntry } from '@/types/soul-audit-plan'
import {
  getAuditOptionsWithFallback,
  getAuditRunWithFallback,
  getConsentWithFallback,
  getSelectionWithFallback,
  saveConsent,
  saveSelection,
} from '@/lib/soul-audit/repository'
import { verifyRunToken } from '@/lib/soul-audit/run-token'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
import { takeSoulAuditDailyLimit } from '@/lib/soul-audit/rate-limit'
import { checkDailyBudget } from '@/lib/soul-audit/budget-cap'
import { PASTORAL_MESSAGES } from '@/lib/soul-audit/messages'
import { createAdminClient } from '@/lib/supabase/admin'
import type { JobRecord } from '@/types/soul-audit-plan'
import type { SoulAuditSelectRequest } from '@/types/soul-audit'

// ─── Constants ──────────────────────────────────────────────────────

const MAX_SELECT_BODY_BYTES = 32_768
const MAX_SELECT_REQUESTS_PER_MINUTE = 30

// ─── Helpers ────────────────────────────────────────────────────────

function maybeSupabase() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null
  }
  try {
    return createAdminClient()
  } catch {
    return null
  }
}

/**
 * Look up an existing job row by run_id.
 * Returns the first matching job or null.
 */
async function findJobByRunId(runId: string): Promise<JobRecord | null> {
  const supabase = maybeSupabase()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('soul_audit_jobs' as any)
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) return null
    return data as unknown as JobRecord
  } catch {
    return null
  }
}

/**
 * Insert a new job row into soul_audit_jobs.
 */
async function insertJob(job: JobRecord): Promise<boolean> {
  const supabase = maybeSupabase()
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from('soul_audit_jobs' as any)
      .insert(job as any)

    if (error) {
      console.error('[soul-audit:select] Job insert failed:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error(
      '[soul-audit:select] Job insert threw:',
      err instanceof Error ? err.message : err,
    )
    return false
  }
}

/**
 * Archive any currently-active plan(s) for a session before a new plan is
 * activated. Keeps "one active plan per session" so Daily Bread resolves
 * deterministically to the most recently activated plan and stale plans do
 * not accumulate as `active`.
 */
async function archivePriorActivePlans(sessionToken: string): Promise<void> {
  const supabase = maybeSupabase()
  if (!supabase) return

  try {
    const { error } = await supabase
      .from('devotional_plan_instances' as any)
      .update({ status: 'archived' } as any)
      .eq('session_token', sessionToken)
      .eq('status', 'active')

    if (error) {
      console.error(
        '[soul-audit:select] Archiving prior active plans failed:',
        error.message,
      )
    }
  } catch (err) {
    console.error(
      '[soul-audit:select] Archiving prior active plans threw:',
      err instanceof Error ? err.message : err,
    )
  }
}

/**
 * Insert a plan record into devotional_plan_instances.
 * Uses existing column names: session_token, audit_run_id, plan_token.
 */
async function insertPlanInstance(params: {
  id: string
  planToken: string
  auditRunId: string
  sessionToken: string
  seriesSlug: string
  timezone: string
  timezoneOffsetMinutes: number
  startPolicy: string
  onboardingVariant: string
  onboardingDays: number
  startedAt: string
  cycleStartAt: string
  theme: string | null
  scriptureAnchor: string | null
  schedule: unknown
  status: string
}): Promise<boolean> {
  const supabase = maybeSupabase()
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from('devotional_plan_instances' as any)
      .insert({
        id: params.id,
        plan_token: params.planToken,
        audit_run_id: params.auditRunId,
        session_token: params.sessionToken,
        series_slug: params.seriesSlug,
        timezone: params.timezone,
        timezone_offset_minutes: params.timezoneOffsetMinutes,
        start_policy: params.startPolicy,
        onboarding_variant: params.onboardingVariant,
        onboarding_days: params.onboardingDays,
        started_at: params.startedAt,
        cycle_start_at: params.cycleStartAt,
        theme: params.theme,
        scripture_anchor: params.scriptureAnchor,
        schedule: params.schedule,
        status: params.status,
        created_at: new Date().toISOString(),
      } as any)

    if (error) {
      console.error(
        '[soul-audit:select] Plan instance insert failed:',
        error.message,
      )
      return false
    }
    return true
  } catch (err) {
    console.error(
      '[soul-audit:select] Plan instance insert threw:',
      err instanceof Error ? err.message : err,
    )
    return false
  }
}

/**
 * Map an onboarding CustomPlanDay (reflection/prayer/scripture) into the
 * DayContent shape the Daily Bread reader renders (textB = the woven body).
 * Pure structural mapping — no invented content; the Scripture is the verbatim
 * anchor carried from the selected (grounded) option.
 */
function onboardingDayToContent(day: CustomPlanDay): DayContent {
  return {
    title: day.title,
    hookA: '',
    textB: day.reflection ?? '',
    textBPreview: (day.reflection ?? '').slice(0, 240),
    centerC: '',
    christConnectionBPrime: '',
    returnAPrime: '',
    scriptureReference: day.scriptureReference,
    scriptureText: day.scriptureText,
    hebrewGreekStudy: null,
    interactiveElement: { type: 'reflection', content: '' },
    metaStoryPlacement: '',
    backwardLink: '',
    forwardLink: '',
    reflectionQuestions: day.journalPrompt
      ? day.journalPrompt.split('\n').filter(Boolean)
      : [],
    prayer: day.prayer ?? '',
    endnotes: (day.endnotes ?? []).map((n) => ({
      id: n.id,
      source: n.source,
      note: n.note,
    })),
    previousDaysSummaryForNext: '',
    tier3Extended: null,
  }
}

/**
 * Persist the onboarding day-0 row so a Wed-Sun starter has a readable
 * devotional NOW, before the Monday cycle unlocks (SOURCE-OF-TRUTH #22).
 * The Scripture is verbatim from the selected option (grounded); the body is
 * the variant primer copy. Best-effort: a failure here must not block the plan.
 */
async function insertOnboardingDay(params: {
  planToken: string
  runId: string
  content: DayContent
}): Promise<boolean> {
  const supabase = maybeSupabase()
  if (!supabase) return false
  try {
    const { error } = await supabase.from('devotional_plan_days' as any).upsert(
      {
        plan_token: params.planToken,
        day_number: 0,
        content: params.content as unknown as Record<string, unknown>,
        used_chunk_ids: [],
        run_id: params.runId,
      } as any,
      { onConflict: 'plan_token,day_number' } as any,
    )
    if (error) {
      console.error(
        '[soul-audit:select] Onboarding day insert failed:',
        error.message,
      )
      return false
    }
    return true
  } catch (err) {
    console.error(
      '[soul-audit:select] Onboarding day insert threw:',
      err instanceof Error ? err.message : err,
    )
    return false
  }
}

/**
 * Reset a stalled job back to pending so the /status endpoint can resume it.
 */
async function resetStalledJob(jobId: string): Promise<boolean> {
  const supabase = maybeSupabase()
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from('soul_audit_jobs' as any)
      .update({
        status: 'pending',
        error: null,
        generating_since: null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', jobId)

    return !error
  } catch {
    return false
  }
}

// ─── POST Handler ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)

  try {
    // ─── Parse body ───
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

    // ─── Rate limit ───
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

    // ─── Session ───
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

    // Extract theme and scripture anchor from the selected option
    const theme = option.title
    const scriptureAnchor = option.preview?.verse?.trim() ?? ''
    const userInput = run.response_text

    if (!scriptureAnchor) {
      return jsonError({
        error: 'Selected option is missing scripture focus. Please retry.',
        code: 'DIRECTION_SCRIPTURE_MISSING',
        status: 422,
        requestId,
      })
    }

    // ─── Timezone resolution ───
    const timezone =
      sanitizeTimezone(body.timezone) ??
      sanitizeTimezone(request.headers.get('x-timezone')) ??
      'UTC'
    const offsetMinutes =
      normalizeTimezoneOffsetMinutes(body.timezoneOffsetMinutes) ??
      normalizeTimezoneOffsetMinutes(
        request.headers.get('x-timezone-offset'),
      ) ??
      0

    // ─── Idempotency: check for existing job ───
    const existingJob = await findJobByRunId(runId)

    if (existingJob) {
      const now = Date.now()
      const updatedAt = new Date(existingJob.updated_at).getTime()
      const age = now - updatedAt

      // ── complete: plan fully generated ──
      if (existingJob.status === 'complete') {
        return withRequestIdHeaders(
          NextResponse.json(
            {
              ok: true,
              auditRunId: runId,
              requestId,
              deploymentFingerprint: getDeploymentFingerprint(),
              jobId: existingJob.id,
              status: 'complete' as const,
              planId: existingJob.plan_id,
              route: '/daily-bread',
            },
            { status: 200 },
          ),
          requestId,
        )
      }

      // ── generating + recent: still in progress ──
      if (existingJob.status === 'generating' && age < STALL_TIMEOUT_MS) {
        return withRequestIdHeaders(
          NextResponse.json(
            {
              ok: true,
              auditRunId: runId,
              requestId,
              deploymentFingerprint: getDeploymentFingerprint(),
              jobId: existingJob.id,
              status: 'generating' as const,
              progress: existingJob.progress,
              currentDay: existingJob.current_day,
              totalDays: existingJob.total_days,
              pollUrl: `/api/soul-audit/select/status?jobId=${existingJob.id}`,
            },
            { status: 200 },
          ),
          requestId,
        )
      }

      // ── stalled: generating but no update for > STALL_TIMEOUT ──
      if (
        (existingJob.status === 'generating' && age >= STALL_TIMEOUT_MS) ||
        existingJob.status === 'stalled'
      ) {
        console.warn(
          `[soul-audit:select] Job ${existingJob.id} is stalled (age: ${Math.round(age / 1000)}s). ` +
            `Resetting to pending for /status to resume.`,
        )
        await resetStalledJob(existingJob.id)

        return withRequestIdHeaders(
          NextResponse.json(
            {
              ok: true,
              auditRunId: runId,
              requestId,
              deploymentFingerprint: getDeploymentFingerprint(),
              jobId: existingJob.id,
              status: 'pending' as const,
              pollUrl: `/api/soul-audit/select/status?jobId=${existingJob.id}`,
            },
            { status: 200 },
          ),
          requestId,
        )
      }

      // ── pending + recent: still waiting for /status to pick it up ──
      if (existingJob.status === 'pending' && age < STALL_TIMEOUT_MS) {
        return withRequestIdHeaders(
          NextResponse.json(
            {
              ok: true,
              auditRunId: runId,
              requestId,
              deploymentFingerprint: getDeploymentFingerprint(),
              jobId: existingJob.id,
              status: 'pending' as const,
              pollUrl: `/api/soul-audit/select/status?jobId=${existingJob.id}`,
            },
            { status: 200 },
          ),
          requestId,
        )
      }

      // ── error or stale pending: fall through to create new job ──
      console.info(
        `[soul-audit:select] Existing job ${existingJob.id} has status='${existingJob.status}'. Creating new job.`,
      )
    }

    // ─── Per-day plan cap (cost control) ───
    // We only reach here when a BRAND-NEW plan + generation job is about to be
    // created (idempotent re-selects of an in-flight/complete job returned
    // above and do NOT consume quota). Cap new plans per day, session-keyed
    // with a hashed-IP fallback. 429 + honest copy on exceed.
    const planLimit = await takeSoulAuditDailyLimit({
      scope: 'plan',
      sessionToken,
      clientKey,
    })
    if (!planLimit.ok) {
      return jsonError({
        error: PASTORAL_MESSAGES.DAILY_PLAN_LIMIT,
        code: 'DAILY_PLAN_LIMIT_REACHED',
        status: 429,
        requestId,
        rateLimit: {
          limit: planLimit.limit,
          remaining: 0,
          retryAfterSeconds: planLimit.retryAfterSeconds,
          resetAtSeconds:
            Math.ceil(Date.now() / 1000) + planLimit.retryAfterSeconds,
        },
      })
    }

    // ─── Global daily budget pre-check ───
    // Surface a paused state at SELECTION time when the day's spend ceiling is
    // already hit, instead of starting a plan whose first generate-day would
    // immediately fail. The runner re-checks before every LLM call (the real
    // wall); this is the early, honest signal. Never canned content.
    const budget = await checkDailyBudget()
    if (!budget.ok) {
      return jsonError({
        error: PASTORAL_MESSAGES.GENERATION_PAUSED,
        code: 'GENERATION_BUDGET_PAUSED',
        status: 429,
        requestId,
      })
    }

    // ─── Calculate start date + build schedule ───
    // Days 1-7 anchor on calculateStartDate (preserves Mon/Tue immediate-start
    // semantics exactly: day 1 unlocked now). resolveStartPolicy then layers on
    // the real start policy + onboarding variant (SOURCE-OF-TRUTH #19-22): a
    // Wed-Sun start gets an onboarding day FIRST, with the full cycle gated to
    // the next Monday at 7:00 AM local.
    const nowUTC = new Date()
    const { startDateUTC } = calculateStartDate(nowUTC, offsetMinutes)
    const policy = resolveStartPolicy(nowUTC, offsetMinutes)
    const isOnboarding = policy.startPolicy === 'wed_sun_onboarding'

    const cycleSchedule = buildSchedule(startDateUTC, offsetMinutes)
    // Wed-Sun: prepend an immediately-unlocked onboarding day-0 entry so the
    // reader serves the primer NOW rather than the bare "Day 1 unlocks Monday"
    // holding screen. Mon/Tue starts are unchanged (no day 0).
    const schedule: DayScheduleEntry[] = withOnboardingDayZero({
      cycleSchedule,
      startPolicy: policy.startPolicy,
      nowUtc: nowUTC,
    })

    // ─── Create plan instance ───
    const planToken = randomUUID()
    const planInstanceId = randomUUID()

    // Archive any prior active plan for this session so Daily Bread always
    // resolves to the plan the user just activated (one active plan per
    // session). Prevents stale plans from shadowing the new one.
    await archivePriorActivePlans(sessionToken)

    const planInserted = await insertPlanInstance({
      id: planInstanceId,
      planToken,
      auditRunId: runId,
      sessionToken,
      seriesSlug: option.slug,
      timezone,
      timezoneOffsetMinutes: offsetMinutes,
      startPolicy: policy.startPolicy,
      onboardingVariant: policy.onboardingVariant,
      onboardingDays: policy.onboardingDays,
      startedAt: nowUTC.toISOString(),
      cycleStartAt: policy.cycleStartAt,
      theme,
      scriptureAnchor,
      schedule,
      status: 'active',
    })

    if (!planInserted) {
      return jsonError({
        error: 'Unable to create devotional plan. Please retry.',
        code: 'PLAN_CREATE_FAILED',
        status: 500,
        requestId,
      })
    }

    // ─── Onboarding day-0 (Wed-Sun starts only) ───
    // Persist a readable onboarding devotional NOW, anchored on the selected
    // option's verbatim Scripture (grounded — never canned catalog content).
    // The full cycle (days 1-5) still generates and stays gated to Monday.
    if (isOnboarding) {
      const anchorDay: CustomPlanDay = {
        day: 1,
        title: theme,
        scriptureReference: scriptureAnchor,
        scriptureText: option.preview?.verseText?.trim() || scriptureAnchor,
        reflection: '',
        prayer: '',
        nextStep: '',
        journalPrompt: '',
      }
      const onboarding = buildOnboardingDay({
        userResponse: userInput,
        firstDay: anchorDay,
        variant: policy.onboardingVariant,
        onboardingDays: policy.onboardingDays,
      })
      await insertOnboardingDay({
        planToken,
        runId,
        content: onboardingDayToContent(onboarding),
      })
    }

    // ─── Create job ───
    const jobId = randomUUID()
    const jobNow = new Date().toISOString()
    const job: JobRecord = {
      id: jobId,
      run_id: runId,
      session_id: sessionToken,
      plan_id: planToken,
      status: 'pending',
      progress: null,
      current_day: null,
      total_days: TOTAL_PLAN_DAYS,
      theme,
      scripture_anchor: scriptureAnchor,
      user_input: userInput,
      timezone,
      timezone_offset_minutes: offsetMinutes,
      error: null,
      generating_since: null,
      created_at: jobNow,
      updated_at: jobNow,
    }

    const jobInserted = await insertJob(job)
    if (!jobInserted) {
      return jsonError({
        error: 'Unable to create generation job. Please retry.',
        code: 'JOB_CREATE_FAILED',
        status: 500,
        requestId,
      })
    }

    // ─── Save selection ───
    await saveSelection({
      runId,
      optionId: option.id,
      optionKind: 'ai_primary',
      seriesSlug: option.slug,
      planToken,
    })

    console.info(
      `[soul-audit:select] Created job=${jobId}, plan=${planToken} for run=${runId}. ` +
        `USING_QUEUE_FALLBACK=${USING_QUEUE_FALLBACK} — /status endpoint will drive generation.`,
    )

    // With USING_QUEUE_FALLBACK=true, we do NOT fire generate-day from here.
    // The client polls /status, which triggers generation on demand.

    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          auditRunId: runId,
          requestId,
          deploymentFingerprint: getDeploymentFingerprint(),
          jobId,
          status: 'pending' as const,
          planId: planToken,
          pollUrl: `/api/soul-audit/select/status?jobId=${jobId}`,
        },
        { status: 200 },
      ),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'soul-audit-select',
      requestId,
      error,
      method: request.method,
      path: new URL(request.url).pathname ?? '/api/soul-audit/select',
      clientKey,
    })
    return jsonError({
      error: 'Unable to start devotional plan right now.',
      status: 500,
      requestId,
    })
  }
}
