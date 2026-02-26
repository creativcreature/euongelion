/**
 * GET /api/soul-audit/generation-status?planToken=xxx
 *
 * Poll endpoint for progressive delivery.
 * Returns the current generation status for each day in a generative plan.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  createRequestId,
  getClientKey,
  jsonError,
  logApiError,
  takeRateLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'
import {
  getAllPlanDaysWithFallback,
  getPlanInstanceWithFallback,
} from '@/lib/soul-audit/repository'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
import type { GenerationStatusResponse } from '@/types/soul-audit'

const MAX_STATUS_POLLS_PER_MINUTE = 60

export async function GET(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)

  try {
    const sessionToken = await getOrCreateAuditSessionToken()
    const limiter = await takeRateLimit({
      namespace: 'soul-audit-generation-status',
      key: `${sessionToken}:${clientKey}`,
      limit: MAX_STATUS_POLLS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return jsonError({
        error: 'Too many status requests.',
        status: 429,
        requestId,
        rateLimit: limiter,
      })
    }

    const planToken = request.nextUrl.searchParams.get('planToken')?.trim()
    if (!planToken) {
      return jsonError({
        error: 'planToken query parameter is required.',
        status: 400,
        requestId,
      })
    }

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

    const days = await getAllPlanDaysWithFallback(planToken)
    const dayContent = days.map((d) => d.content).sort((a, b) => a.day - b.day)

    const completedDays = dayContent.filter(
      (d) => d.generationStatus === 'ready' || !d.generationStatus,
    ).length
    const failedDays = dayContent.filter(
      (d) => d.generationStatus === 'failed',
    ).length
    const totalDays = dayContent.length

    let status: GenerationStatusResponse['status'] = 'generating'
    if (completedDays >= totalDays) {
      status = 'complete'
    } else if (failedDays > 0 && completedDays + failedDays >= totalDays) {
      status = 'partial_failure'
    }

    const currentlyGenerating = dayContent.find(
      (d) => d.generationStatus === 'generating',
    )?.day

    const payload: GenerationStatusResponse = {
      planToken,
      totalDays,
      completedDays,
      currentlyGenerating,
      status,
      days: dayContent.map((d) => ({
        day: d.day,
        status: d.generationStatus || 'ready',
      })),
    }

    return withRequestIdHeaders(
      NextResponse.json(payload, { status: 200 }),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'soul-audit-generation-status',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl?.pathname ?? '/api/soul-audit/generation-status',
      clientKey,
    })
    return jsonError({
      error: 'Unable to check generation status.',
      status: 500,
      requestId,
    })
  }
}
