import { NextRequest, NextResponse } from 'next/server'
import { crisisRequirement, detectCrisis } from '@/lib/soul-audit/crisis'
import {
  MAX_AUDITS_PER_CYCLE,
  SOUL_AUDIT_OPTION_SPLIT,
} from '@/lib/soul-audit/constants'
import {
  buildAuditOptions,
  sanitizeAuditInput,
} from '@/lib/soul-audit/matching'
import {
  bumpSessionAuditCount,
  createAuditRun,
  getSessionAuditCount,
} from '@/lib/soul-audit/repository'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
import type { SoulAuditSubmitResponseV2 } from '@/types/soul-audit'

interface SubmitBody {
  response?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmitBody
    const responseText = sanitizeAuditInput(body.response)

    if (!responseText) {
      return NextResponse.json(
        { error: 'Write one honest paragraph so we can continue.' },
        { status: 400 },
      )
    }

    if (responseText.length > 2000) {
      return NextResponse.json(
        { error: 'Please keep your response under 2000 characters.' },
        { status: 400 },
      )
    }

    const sessionToken = await getOrCreateAuditSessionToken()
    const currentCount = getSessionAuditCount(sessionToken)
    if (currentCount >= MAX_AUDITS_PER_CYCLE) {
      return NextResponse.json(
        {
          error: 'You have reached the audit limit for this cycle.',
          code: 'AUDIT_LIMIT_REACHED',
        },
        { status: 429 },
      )
    }

    const crisisDetected = detectCrisis(responseText)
    const options = buildAuditOptions(responseText)
    if (options.length === 0) {
      return NextResponse.json(
        {
          error:
            'No curated options are available right now. Please refresh and try again.',
          code: 'NO_CURATED_OPTIONS',
        },
        { status: 409 },
      )
    }

    const { run, options: persistedOptions } = await createAuditRun({
      sessionToken,
      responseText,
      crisisDetected,
      options,
    })

    const nextCount = bumpSessionAuditCount(sessionToken)
    const payload: SoulAuditSubmitResponseV2 = {
      version: 'v2',
      auditRunId: run.id,
      remainingAudits: Math.max(0, MAX_AUDITS_PER_CYCLE - nextCount),
      requiresEssentialConsent: true,
      analyticsOptInDefault: false,
      consentAccepted: false,
      crisis: crisisRequirement(crisisDetected),
      options: persistedOptions
        .map(
          ({ audit_run_id: _auditRunId, created_at: _createdAt, ...rest }) =>
            rest,
        )
        .slice(0, SOUL_AUDIT_OPTION_SPLIT.total),
      policy: {
        noAccountRequired: true,
        maxAuditsPerCycle: MAX_AUDITS_PER_CYCLE,
        optionSplit: SOUL_AUDIT_OPTION_SPLIT,
      },
    }

    return NextResponse.json(payload, { status: 200 })
  } catch (error) {
    console.error('Soul audit submit error:', error)
    return NextResponse.json(
      { error: 'Unable to process soul audit right now.' },
      { status: 500 },
    )
  }
}
