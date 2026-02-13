import { NextRequest, NextResponse } from 'next/server'
import {
  getAuditRunWithFallback,
  saveConsent,
} from '@/lib/soul-audit/repository'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
import type {
  SoulAuditConsentRequest,
  SoulAuditConsentResponse,
} from '@/types/soul-audit'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SoulAuditConsentRequest
    const runId = String(body.auditRunId || '').trim()
    const essentialAccepted = Boolean(body.essentialAccepted)
    const analyticsOptIn = Boolean(body.analyticsOptIn)
    const crisisAcknowledged = Boolean(body.crisisAcknowledged)

    if (!runId) {
      return NextResponse.json(
        { error: 'auditRunId is required' },
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

    const run = await getAuditRunWithFallback(runId)
    if (!run) {
      return NextResponse.json(
        { error: 'Audit run not found' },
        { status: 404 },
      )
    }

    const sessionToken = await getOrCreateAuditSessionToken()
    if (run.session_token !== sessionToken) {
      return NextResponse.json(
        { error: 'Audit run access denied' },
        { status: 403 },
      )
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
