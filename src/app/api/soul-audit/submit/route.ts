import { NextRequest, NextResponse } from 'next/server'
import { crisisRequirement, detectCrisis } from '@/lib/soul-audit/crisis'
import {
  createRequestId,
  getDeploymentFingerprint,
  getClientKey,
  getRequestPath,
  isSafeAuditRunId,
  jsonError,
  logApiError,
  readJsonWithLimit,
  takeRateLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'
import { MAX_AUDITS_PER_CYCLE } from '@/lib/soul-audit/constants'
import { PASTORAL_MESSAGES } from '@/lib/soul-audit/messages'
import { sanitizeAuditInput } from '@/lib/soul-audit/matching'
import { brainFlags } from '@/lib/brain/flags'
import { createRunToken, verifyRunToken } from '@/lib/soul-audit/run-token'
import {
  bumpSessionAuditCount,
  createAuditRun,
  getAuditOptionsWithFallback,
  getSessionAuditCount,
  listAuditRunsForSessionWithFallback,
  saveAuditTelemetry,
} from '@/lib/soul-audit/repository'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
import { selectIngredients } from '@/lib/soul-audit/ingredient-selector'
import type { AuditOptionPreview } from '@/types/soul-audit'

interface SubmitBody {
  response?: string
  rerollForRunId?: string
  runToken?: string
}

const MAX_SUBMIT_BODY_BYTES = 32_768
const MAX_SUBMITS_PER_MINUTE = 12
const DIRECTION_COUNT = 3

function getLowContextGuidance(input: string): string | null {
  const words = input
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
  if (words.length > 3) return null
  return PASTORAL_MESSAGES.INPUT_TOO_SHORT
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)

  if (!brainFlags.soulAuditEnabled) {
    return jsonError({
      error: PASTORAL_MESSAGES.SOUL_AUDIT_DISABLED,
      code: 'SOUL_AUDIT_DISABLED',
      status: 503,
      requestId,
    })
  }

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
    const limiter = await takeRateLimit({
      namespace: 'soul-audit-submit',
      key: `${sessionToken}:${clientKey}`,
      limit: MAX_SUBMITS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return jsonError({
        error: PASTORAL_MESSAGES.RATE_LIMITED,
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
        error: PASTORAL_MESSAGES.INPUT_EMPTY,
        status: 400,
        requestId,
      })
    }

    if (responseText.length > 2000) {
      return jsonError({
        error: PASTORAL_MESSAGES.INPUT_TOO_LONG,
        status: 400,
        requestId,
      })
    }

    if (rerollRequested && !isSafeAuditRunId(rerollForRunId)) {
      return jsonError({
        error: PASTORAL_MESSAGES.INVALID_REROLL_ID,
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
          })
        : null

    if (rerollRequested && !rerollVerified) {
      return jsonError({
        error: PASTORAL_MESSAGES.REROLL_VERIFY_FAILED,
        status: 403,
        requestId,
      })
    }
    if (
      rerollVerified &&
      responseText !== sanitizeAuditInput(rerollVerified.responseText)
    ) {
      return jsonError({
        error: PASTORAL_MESSAGES.REROLL_MISMATCH,
        code: 'REROLL_RESPONSE_MISMATCH',
        status: 409,
        requestId,
      })
    }

    const currentCount = getSessionAuditCount(sessionToken)
    if (!rerollVerified && currentCount >= MAX_AUDITS_PER_CYCLE) {
      return jsonError({
        error: PASTORAL_MESSAGES.AUDIT_LIMIT,
        code: 'AUDIT_LIMIT_REACHED',
        status: 429,
        requestId,
      })
    }

    const crisisDetected = detectCrisis(responseText)
    const inputGuidance = getLowContextGuidance(responseText)

    const priorRuns = await listAuditRunsForSessionWithFallback(sessionToken)
    const usedDirectionSlugs = new Set<string>()
    const usedDirectionTitles = new Set<string>()
    const usedScriptureAnchors = new Set<string>()
    for (const run of priorRuns) {
      const priorOptions = await getAuditOptionsWithFallback(run.id)
      for (const option of priorOptions) {
        if (option.slug) usedDirectionSlugs.add(option.slug)
        if (option.title) usedDirectionTitles.add(option.title)
        if (option.preview?.verse) usedScriptureAnchors.add(option.preview.verse)
      }
    }

    // ─── RAG-grounded direction selection (strict, input-specific) ───
    let selection: Awaited<ReturnType<typeof selectIngredients>> | null = null
    try {
      selection = await selectIngredients(responseText, {
        excludeDirectionSlugs: Array.from(usedDirectionSlugs),
        excludeDirectionTitles: Array.from(usedDirectionTitles),
        excludeScriptureAnchors: Array.from(usedScriptureAnchors),
      })
    } catch (selectionError) {
      const firstCode =
        selectionError instanceof Error
          ? selectionError.message
          : 'DIRECTION_SELECTION_FAILED'
      // Retry once with relaxed historical exclusions. This avoids dead-end
      // errors (e.g. duplicate scripture across audits) while still composing
      // from live retrieval context for the current input.
      try {
        selection = await selectIngredients(responseText, {
          excludeDirectionSlugs: [],
          excludeDirectionTitles: [],
          excludeScriptureAnchors: [],
        })
      } catch (retryError) {
        const retryCode =
          retryError instanceof Error
            ? retryError.message
            : 'DIRECTION_SELECTION_FAILED'
        return jsonError({
          error:
            'Could not generate input-specific pathways from the reference library. Please retry.',
          code: retryCode || firstCode,
          status: 503,
          requestId,
        })
      }
    }
    if (!selection) {
      return jsonError({
        error:
          'Could not generate input-specific pathways from the reference library. Please retry.',
        code: 'DIRECTION_SELECTION_FAILED',
        status: 503,
        requestId,
      })
    }
    const { directions, intent } = selection

    console.info(
      `[soul-audit:submit] Ingredient selection — ${directions.length} directions, ` +
        `themes: [${intent.themes.join(', ')}], tone: ${intent.tone}, ` +
        `disposition: ${intent.disposition}, depth: ${intent.depthPreference}`,
    )

    if (directions.length === 0) {
      return jsonError({
        error: PASTORAL_MESSAGES.OPTION_ASSEMBLY_FAILED,
        code: 'NO_DIRECTIONS_FOUND',
        status: 422,
        requestId,
      })
    }

    if (
      process.env.NODE_ENV !== 'test' &&
      directions.every((direction) => direction.referenceSourceHints.length === 0)
    ) {
      return jsonError({
        error:
          'Reference library is unavailable right now. Please retry in a moment.',
        code: 'REFERENCE_LIBRARY_UNAVAILABLE',
        status: 503,
        requestId,
      })
    }

    // Map directions to the existing AuditOptionPreview format for
    // backward compatibility with the repository and client.
    const options: AuditOptionPreview[] = directions
      .slice(0, DIRECTION_COUNT)
      .map((direction) => ({
        id: direction.id,
        slug: direction.directionSlug,
        kind: 'ai_primary' as const,
        rank: direction.rank,
        title: direction.title,
        question: direction.question,
        confidence: direction.confidence,
        reasoning: direction.reasoning,
        preview: {
          verse: direction.scriptureAnchor,
          verseText: direction.day1Preview.scriptureText,
          paragraph: direction.day1Preview.teachingExcerpt,
        },
      }))

    const { run, options: persistedOptions } = await createAuditRun({
      sessionToken,
      responseText,
      crisisDetected,
      options,
    })

    const nextCount = rerollVerified
      ? currentCount
      : bumpSessionAuditCount(sessionToken)

    const responseOptions = persistedOptions
      .map(
        ({ audit_run_id: _auditRunId, created_at: _createdAt, ...rest }) =>
          rest,
      )
      .slice(0, DIRECTION_COUNT)

    const runToken = createRunToken({
      auditRunId: run.id,
      responseText,
      crisisDetected,
      options: responseOptions,
      sessionToken,
    })

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

    await saveAuditTelemetry({
      runId: run.id,
      sessionToken,
      strategy: 'ingredient_selection',
      splitValid: responseOptions.length === DIRECTION_COUNT,
      aiPrimaryCount: responseOptions.length,
      curatedPrefabCount: 0,
      avgConfidence,
      responseExcerpt: responseText.slice(0, 280),
      matchedTerms: directions.flatMap((d) => d.matchedKeywords).slice(0, 12),
    })

    const payload = {
      version: 'v2' as const,
      auditRunId: run.id,
      requestId,
      deploymentFingerprint: getDeploymentFingerprint(),
      runToken,
      ...(inputGuidance ? { inputGuidance } : {}),
      remainingAudits: Math.max(0, MAX_AUDITS_PER_CYCLE - nextCount),
      requiresEssentialConsent: true as const,
      analyticsOptInDefault: false as const,
      consentAccepted: false,
      crisis: crisisRequirement(crisisDetected),
      options: responseOptions,
      diagnostics: {
        retrievalStrategy: 'contextual-hybrid-bm25-rrf',
        optionEvidence: directions.slice(0, DIRECTION_COUNT).map((direction) => ({
          optionId: direction.id,
          scriptureAnchor: direction.scriptureAnchor,
          matchedKeywords: direction.matchedKeywords.slice(0, 8),
          sourceHints: direction.referenceSourceHints.slice(0, 5),
        })),
      },
      policy: {
        noAccountRequired: true as const,
        maxAuditsPerCycle: MAX_AUDITS_PER_CYCLE,
        directionCount: DIRECTION_COUNT,
      },
    }

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
      path: getRequestPath(request, '/api/soul-audit/submit'),
      clientKey,
    })
    return jsonError({
      error: PASTORAL_MESSAGES.GENERIC_ERROR,
      status: 500,
      requestId,
    })
  }
}
