import { NextRequest, NextResponse } from 'next/server'
import {
  buildCuratedFirstPlan,
  MissingCuratedModuleError,
} from '@/lib/soul-audit/curated-builder'
import {
  createPlan,
  getAllPlanDays,
  getAuditOptions,
  getAuditRun,
  getConsent,
  getSelection,
  saveSelection,
} from '@/lib/soul-audit/repository'
import { resolveStartPolicy } from '@/lib/soul-audit/schedule'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
import type {
  SoulAuditSelectRequest,
  SoulAuditSelectResponse,
} from '@/types/soul-audit'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SoulAuditSelectRequest
    const runId = String(body.auditRunId || '').trim()
    const optionId = String(body.optionId || '').trim()

    if (!runId || !optionId) {
      return NextResponse.json(
        { error: 'auditRunId and optionId are required.' },
        { status: 400 },
      )
    }

    const run = getAuditRun(runId)
    if (!run) {
      return NextResponse.json(
        { error: 'Audit run not found.' },
        { status: 404 },
      )
    }

    const sessionToken = await getOrCreateAuditSessionToken()
    if (run.session_token !== sessionToken) {
      return NextResponse.json(
        { error: 'Audit run access denied.' },
        { status: 403 },
      )
    }

    const consent = getConsent(runId)
    if (!consent?.essential_accepted) {
      return NextResponse.json(
        {
          error: 'Essential consent is required before selection.',
          code: 'ESSENTIAL_CONSENT_REQUIRED',
        },
        { status: 400 },
      )
    }

    if (run.crisis_detected && !consent.crisis_acknowledged) {
      return NextResponse.json(
        {
          error:
            'Crisis resource acknowledgement is required before continuing.',
          code: 'CRISIS_ACK_REQUIRED',
        },
        { status: 400 },
      )
    }

    const existingSelection = getSelection(runId)
    if (existingSelection) {
      const existingPayload: SoulAuditSelectResponse = {
        ok: true,
        auditRunId: runId,
        selectionType: existingSelection.option_kind,
        route:
          existingSelection.option_kind === 'curated_prefab'
            ? `/wake-up/series/${existingSelection.series_slug}`
            : `/soul-audit/results?planToken=${existingSelection.plan_token}`,
        planToken: existingSelection.plan_token ?? undefined,
        seriesSlug: existingSelection.series_slug,
      }
      return NextResponse.json(existingPayload, { status: 200 })
    }

    const option = getAuditOptions(runId).find((item) => item.id === optionId)
    if (!option) {
      return NextResponse.json({ error: 'Option not found.' }, { status: 404 })
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
        route: `/wake-up/series/${option.slug}`,
        seriesSlug: option.slug,
      }
      return NextResponse.json(payload, { status: 200 })
    }

    const planDays = buildCuratedFirstPlan({
      seriesSlug: option.slug,
      userResponse: run.response_text,
    })

    const timezone =
      body.timezone ||
      request.headers.get('x-timezone') ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      'UTC'
    const offsetMinutes =
      typeof body.timezoneOffsetMinutes === 'number'
        ? body.timezoneOffsetMinutes
        : Number.parseInt(
            request.headers.get('x-timezone-offset') || '0',
            10,
          ) || 0

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
      days: planDays,
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
      route: `/soul-audit/results?planToken=${plan.token}`,
      planToken: plan.token,
      seriesSlug: option.slug,
    }

    // Warm cache path for immediate UI fetches.
    getAllPlanDays(plan.token)

    return NextResponse.json(payload, { status: 200 })
  } catch (error) {
    if (error instanceof MissingCuratedModuleError) {
      return NextResponse.json(
        { error: error.message, code: 'MISSING_CURATED_MODULE' },
        { status: 422 },
      )
    }

    console.error('Soul audit selection error:', error)
    return NextResponse.json(
      { error: 'Unable to start devotional plan right now.' },
      { status: 500 },
    )
  }
}
