import { NextRequest, NextResponse } from 'next/server'
import { crisisRequirement, detectCrisis } from '@/lib/soul-audit/crisis'
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
  MAX_AUDITS_PER_CYCLE,
  SOUL_AUDIT_OPTION_SPLIT,
} from '@/lib/soul-audit/constants'
import {
  buildAuditOptions,
  sanitizeAuditInput,
} from '@/lib/soul-audit/matching'
import { createRunToken, verifyRunToken } from '@/lib/soul-audit/run-token'
import {
  bumpSessionAuditCount,
  createAuditRun,
  getSessionAuditCount,
  saveAuditTelemetry,
} from '@/lib/soul-audit/repository'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
import type { SoulAuditSubmitResponseV2 } from '@/types/soul-audit'

interface SubmitBody {
  response?: string
  rerollForRunId?: string
  runToken?: string
}

const MAX_SUBMIT_BODY_BYTES = 8_192
const MAX_SUBMITS_PER_MINUTE = 12

function extractMatchedTermsFromReasoning(reasoning: string): string[] {
  const match = reasoning.match(/\(([^)]+)\)/)
  if (!match?.[1]) return []

  return Array.from(
    new Set(
      match[1]
        .split(',')
        .map((token) => token.trim().toLowerCase())
        .filter((token) => token.length >= 3),
    ),
  ).slice(0, 6)
}

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
  const requestId = createRequestId()
  const clientKey = getClientKey(request)
  try {
    const parsed = await readJsonWithLimit<SubmitBody>({
      request,
      maxBytes: MAX_SUBMIT_BODY_BYTES,
    })
    if (!parsed.ok) {
      return jsonError({
        error: parsed.error,
        status: parsed.status,
        requestId,
      })
    }

    const sessionToken = await getOrCreateAuditSessionToken()
    const limiter = takeRateLimit({
      namespace: 'soul-audit-submit',
      key: `${sessionToken}:${clientKey}`,
      limit: MAX_SUBMITS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return jsonError({
        error: 'Too many audit submissions. Please retry shortly.',
        status: 429,
        requestId,
        rateLimit: limiter,
      })
    }

    const body = parsed.data
    const responseText = sanitizeAuditInput(body.response)
    const rerollForRunId = String(body.rerollForRunId || '').trim()
    const rerollRequested = rerollForRunId.length > 0
    const providedRunToken =
      typeof body.runToken === 'string' ? body.runToken : null

    if (!responseText) {
      return jsonError({
        error: 'Write one honest paragraph so we can continue.',
        status: 400,
        requestId,
      })
    }

    if (responseText.length > 2000) {
      return jsonError({
        error: 'Please keep your response under 2000 characters.',
        status: 400,
        requestId,
      })
    }

    if (rerollRequested && !isSafeAuditRunId(rerollForRunId)) {
      return jsonError({
        error: 'Invalid reroll audit run id.',
        status: 400,
        requestId,
      })
    }

    const rerollVerified =
      rerollRequested && rerollForRunId
        ? verifyRunToken({
            token: providedRunToken,
            expectedRunId: rerollForRunId,
            sessionToken,
            allowSessionMismatch: true,
          })
        : null

    if (rerollRequested && !rerollVerified) {
      return jsonError({
        error: 'Reroll request could not be verified.',
        status: 403,
        requestId,
      })
    }
    if (
      rerollVerified &&
      responseText !== sanitizeAuditInput(rerollVerified.responseText)
    ) {
      return jsonError({
        error:
          'Reroll can only use the original audit response. Start a new audit to use different input.',
        code: 'REROLL_RESPONSE_MISMATCH',
        status: 409,
        requestId,
      })
    }

    const currentCount = getSessionAuditCount(sessionToken)
    if (!rerollVerified && currentCount >= MAX_AUDITS_PER_CYCLE) {
      return jsonError({
        error: 'You have reached the audit limit for this cycle.',
        code: 'AUDIT_LIMIT_REACHED',
        status: 429,
        requestId,
      })
    }

    const crisisDetected = detectCrisis(responseText)
    const options = buildAuditOptions(responseText)
    if (options.length === 0) {
      return jsonError({
        error:
          'We could not assemble devotional options from your response yet. Add one more sentence and try again.',
        code: 'NO_CURATED_OPTIONS',
        status: 409,
        requestId,
      })
    }

    const { run, options: persistedOptions } = await createAuditRun({
      sessionToken,
      responseText,
      crisisDetected,
      options,
    })

    const nextCount = rerollVerified
      ? currentCount
      : bumpSessionAuditCount(sessionToken)
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
      return jsonError({
        error: 'Unable to assemble a stable devotional option split.',
        code: 'OPTION_SPLIT_INVALID',
        status: 500,
        requestId,
      })
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

    const aiPrimary = responseOptions.filter(
      (option) => option.kind === 'ai_primary',
    )
    const curatedPrefab = responseOptions.filter(
      (option) => option.kind === 'curated_prefab',
    )
    const matchedTerms = Array.from(
      new Set(
        aiPrimary.flatMap((option) =>
          extractMatchedTermsFromReasoning(option.reasoning),
        ),
      ),
    ).slice(0, 12)
    const avgConfidence =
      responseOptions.length > 0
        ? Number(
            (
              responseOptions.reduce(
                (total, option) => total + option.confidence,
                0,
              ) / responseOptions.length
            ).toFixed(4),
          )
        : 0
    const strategy = 'curated_candidates'

    await saveAuditTelemetry({
      runId: run.id,
      sessionToken,
      strategy,
      splitValid: hasExpectedOptionSplit(responseOptions),
      aiPrimaryCount: aiPrimary.length,
      curatedPrefabCount: curatedPrefab.length,
      avgConfidence,
      responseExcerpt: responseText.slice(0, 280),
      matchedTerms,
    })

    return withRequestIdHeaders(
      NextResponse.json(payload, { status: 200 }),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'soul-audit-submit',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    return jsonError({
      error: 'Unable to process soul audit right now.',
      status: 500,
      requestId,
    })
  }
}
