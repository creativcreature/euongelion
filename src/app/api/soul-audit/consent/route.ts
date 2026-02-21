import { NextRequest, NextResponse } from 'next/server'
import {
  createRequestId,
  getClientKey,
  isSafeAuditRunId,
  jsonError,
  logApiError,
  readJsonWithLimit,
  takeRateLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'
import {
  getAuditRunWithFallback,
  saveConsent,
} from '@/lib/soul-audit/repository'
import { createConsentToken } from '@/lib/soul-audit/consent-token'
import { verifyRunToken } from '@/lib/soul-audit/run-token'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
import { crisisRequirement } from '@/lib/soul-audit/crisis'
import type {
  SoulAuditConsentRequest,
  SoulAuditConsentResponse,
} from '@/types/soul-audit'

const MAX_CONSENT_BODY_BYTES = 32_768
const MAX_CONSENT_REQUESTS_PER_MINUTE = 30

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)
  try {
    const parsed = await readJsonWithLimit<SoulAuditConsentRequest>({
      request,
      maxBytes: MAX_CONSENT_BODY_BYTES,
    })
    if (!parsed.ok) {
      return jsonError({
        error: parsed.error,
        status: parsed.status,
        requestId,
      })
    }

    const limiter = await takeRateLimit({
      namespace: 'soul-audit-consent',
      key: clientKey,
      limit: MAX_CONSENT_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return jsonError({
        error: 'Too many consent requests. Please retry shortly.',
        status: 429,
        requestId,
        rateLimit: limiter,
      })
    }

    const body = parsed.data
    const runId = String(body.auditRunId || '').trim()
    const essentialAccepted = Boolean(body.essentialAccepted)
    const analyticsOptIn = Boolean(body.analyticsOptIn)
    const crisisAcknowledged = Boolean(body.crisisAcknowledged)

    if (!runId || !isSafeAuditRunId(runId)) {
      return jsonError({
        error: 'A valid auditRunId is required.',
        status: 400,
        requestId,
      })
    }

    if (!essentialAccepted) {
      return jsonError({
        error: 'Essential functional consent is required to continue.',
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

    const sessionToken = await getOrCreateAuditSessionToken()

    const verified = verifyRunToken({
      token: body.runToken,
      expectedRunId: runId,
      sessionToken,
    })

    let run = await getAuditRunWithFallback(runId)
    if (!run) {
      if (verified) {
        run = {
          id: runId,
          session_token: sessionToken,
          response_text: verified.responseText,
          crisis_detected: verified.crisisDetected,
          created_at: verified.issuedAt,
        }
      }
    }

    if (!run) {
      return jsonError({
        error: 'Audit run not found',
        code: 'RUN_NOT_FOUND',
        status: 404,
        requestId,
      })
    }
    if (run.session_token !== sessionToken && !verified) {
      return jsonError({
        error: 'Audit run access denied',
        code: 'RUN_ACCESS_DENIED',
        status: 403,
        requestId,
      })
    }
    if (run.session_token !== sessionToken && verified) {
      run = {
        ...run,
        session_token: sessionToken,
        response_text: verified.responseText,
        crisis_detected: verified.crisisDetected,
      }
    }

    if (run.crisis_detected && !crisisAcknowledged) {
      return jsonError({
        error:
          'You must acknowledge crisis resources before continuing to devotional options.',
        code: 'CRISIS_ACK_REQUIRED',
        status: 400,
        requestId,
        details: {
          crisis: crisisRequirement(true),
        },
      })
    }

    const consent = await saveConsent({
      runId,
      sessionToken,
      essentialAccepted,
      analyticsOptIn,
      crisisAcknowledged,
    })

    const payload: SoulAuditConsentResponse = {
      ok: true,
      auditRunId: runId,
      essentialAccepted: consent.essential_accepted,
      analyticsOptIn: consent.analytics_opt_in,
      crisisAcknowledged: consent.crisis_acknowledged,
      consentToken: createConsentToken({
        auditRunId: runId,
        essentialAccepted: consent.essential_accepted,
        analyticsOptIn: consent.analytics_opt_in,
        crisisAcknowledged: consent.crisis_acknowledged,
        sessionToken,
      }),
    }

    return withRequestIdHeaders(
      NextResponse.json(payload, { status: 200 }),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'soul-audit-consent',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    return jsonError({
      error: 'Unable to record consent right now.',
      status: 500,
      requestId,
    })
  }
}
