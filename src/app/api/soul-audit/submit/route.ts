import { NextRequest, NextResponse } from 'next/server'
import { crisisRequirement, detectCrisis } from '@/lib/soul-audit/crisis'
import {
  getClientKey,
  readJsonWithLimit,
  takeRateLimit,
  withRateLimitHeaders,
} from '@/lib/api-security'
import {
  MAX_AUDITS_PER_CYCLE,
  SOUL_AUDIT_OPTION_SPLIT,
} from '@/lib/soul-audit/constants'
import {
  buildAuditOptions,
  sanitizeAuditInput,
} from '@/lib/soul-audit/matching'
import { createRunToken } from '@/lib/soul-audit/run-token'
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

const MAX_SUBMIT_BODY_BYTES = 8_192
const MAX_SUBMITS_PER_MINUTE = 12

function hasExpectedOptionSplit(options: Array<{ kind: string }>): boolean {
  const aiPrimaryCount = options.filter(
    (option) => option.kind === 'ai_primary',
  ).length
  const curatedPrefabCount = options.filter(
    (option) => option.kind === 'curated_prefab',
  ).length
  return (
    options.length === SOUL_AUDIT_OPTION_SPLIT.total &&
    aiPrimaryCount === SOUL_AUDIT_OPTION_SPLIT.aiPrimary &&
    curatedPrefabCount === SOUL_AUDIT_OPTION_SPLIT.curatedPrefab
  )
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await readJsonWithLimit<SubmitBody>({
      request,
      maxBytes: MAX_SUBMIT_BODY_BYTES,
    })
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error },
        { status: parsed.status },
      )
    }

    const sessionToken = await getOrCreateAuditSessionToken()
    const limiter = takeRateLimit({
      namespace: 'soul-audit-submit',
      key: `${sessionToken}:${getClientKey(request)}`,
      limit: MAX_SUBMITS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return withRateLimitHeaders(
        NextResponse.json(
          { error: 'Too many audit submissions. Please retry shortly.' },
          { status: 429 },
        ),
        limiter,
      )
    }

    const body = parsed.data
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
            'We could not assemble devotional options from your response yet. Add one more sentence and try again.',
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
    let responseOptions = persistedOptions
      .map(
        ({ audit_run_id: _auditRunId, created_at: _createdAt, ...rest }) =>
          rest,
      )
      .slice(0, SOUL_AUDIT_OPTION_SPLIT.total)

    if (!hasExpectedOptionSplit(responseOptions)) {
      responseOptions = options.slice(0, SOUL_AUDIT_OPTION_SPLIT.total)
    }

    if (!hasExpectedOptionSplit(responseOptions)) {
      return NextResponse.json(
        {
          error: 'Unable to assemble a stable devotional option split.',
          code: 'OPTION_SPLIT_INVALID',
        },
        { status: 500 },
      )
    }

    const runToken = createRunToken({
      auditRunId: run.id,
      responseText,
      crisisDetected,
      options: responseOptions,
      sessionToken,
    })

    const payload: SoulAuditSubmitResponseV2 = {
      version: 'v2',
      auditRunId: run.id,
      runToken,
      remainingAudits: Math.max(0, MAX_AUDITS_PER_CYCLE - nextCount),
      requiresEssentialConsent: true,
      analyticsOptInDefault: false,
      consentAccepted: false,
      crisis: crisisRequirement(crisisDetected),
      options: responseOptions,
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
