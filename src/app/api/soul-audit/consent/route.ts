import { NextRequest, NextResponse } from 'next/server'
import {
  getClientKey,
  isSafeAuditRunId,
  readJsonWithLimit,
  takeRateLimit,
  withRateLimitHeaders,
} from '@/lib/api-security'
import {
  getAuditRunWithFallback,
  saveConsent,
} from '@/lib/soul-audit/repository'
import { createConsentToken } from '@/lib/soul-audit/consent-token'
import { verifyRunToken } from '@/lib/soul-audit/run-token'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
import type {
  SoulAuditConsentRequest,
  SoulAuditConsentResponse,
} from '@/types/soul-audit'

const MAX_CONSENT_BODY_BYTES = 32_768
const MAX_CONSENT_REQUESTS_PER_MINUTE = 30

export async function POST(request: NextRequest) {
  try {
    const parsed = await readJsonWithLimit<SoulAuditConsentRequest>({
      request,
      maxBytes: MAX_CONSENT_BODY_BYTES,
    })
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error },
        { status: parsed.status },
      )
    }

    const limiter = takeRateLimit({
      namespace: 'soul-audit-consent',
      key: getClientKey(request),
      limit: MAX_CONSENT_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return withRateLimitHeaders(
        NextResponse.json(
          { error: 'Too many consent requests. Please retry shortly.' },
          { status: 429 },
        ),
        limiter,
      )
    }

    const body = parsed.data
    const runId = String(body.auditRunId || '').trim()
    const essentialAccepted = Boolean(body.essentialAccepted)
    const analyticsOptIn = Boolean(body.analyticsOptIn)
    const crisisAcknowledged = Boolean(body.crisisAcknowledged)

    if (!runId || !isSafeAuditRunId(runId)) {
      return NextResponse.json(
        { error: 'A valid auditRunId is required.' },
        { status: 400 },
      )
    }

    if (!essentialAccepted) {
      return NextResponse.json(
        {
          error: 'Essential functional consent is required to continue.',
          code: 'ESSENTIAL_CONSENT_REQUIRED',
        },
        { status: 400 },
      )
    }

    const sessionToken = await getOrCreateAuditSessionToken()

    const verified = verifyRunToken({
      token: body.runToken,
      expectedRunId: runId,
      sessionToken,
      allowSessionMismatch: true,
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
      return NextResponse.json(
        { error: 'Audit run not found' },
        { status: 404 },
      )
    }
    if (run.session_token !== sessionToken && !verified) {
      return NextResponse.json(
        { error: 'Audit run access denied' },
        { status: 403 },
      )
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
      return NextResponse.json(
        {
          error:
            'You must acknowledge crisis resources before continuing to devotional options.',
          code: 'CRISIS_ACK_REQUIRED',
        },
        { status: 400 },
      )
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

    return NextResponse.json(payload, { status: 200 })
  } catch (error) {
    console.error('Soul audit consent error:', error)
    return NextResponse.json(
      { error: 'Unable to record consent right now.' },
      { status: 500 },
    )
  }
}
