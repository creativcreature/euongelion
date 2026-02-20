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
import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'
import { scriptureLeadPartsFromFramework } from '@/lib/scripture-reference'
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
import type {
  AuditOptionPreview,
  SoulAuditSubmitResponseV2,
} from '@/types/soul-audit'

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

function getLowContextGuidance(input: string): string | null {
  const words = input
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
  if (words.length > 3) return null

  return 'We built options from a short input. Add one more sentence for more precise curation.'
}

function buildEmergencyFallbackOptions(input: string): AuditOptionPreview[] {
  const uniqueSlugs = Array.from(new Set(ALL_SERIES_ORDER)).filter(
    (slug) =>
      slug in SERIES_DATA &&
      Array.isArray(SERIES_DATA[slug]?.days) &&
      SERIES_DATA[slug].days.length > 0,
  )
  if (uniqueSlugs.length === 0) return []

  const snippet = input.trim().slice(0, 68) || 'this season'
  const required = SOUL_AUDIT_OPTION_SPLIT.total
  const selectedSlugs = Array.from({ length: required }, (_, index) => {
    return uniqueSlugs[index % uniqueSlugs.length]
  })

  return selectedSlugs.map((slug, index) => {
    const series = SERIES_DATA[slug]
    const dayOne = [...series.days].sort((a, b) => a.day - b.day)[0]
    const scripture = scriptureLeadPartsFromFramework(series.framework)
    const aiPrimary = index < SOUL_AUDIT_OPTION_SPLIT.aiPrimary
    const dayNumber = dayOne?.day ?? 1
    const baseConfidence = aiPrimary
      ? Math.max(0.42, 0.62 - index * 0.08)
      : Math.max(
          0.34,
          0.52 - (index - SOUL_AUDIT_OPTION_SPLIT.aiPrimary) * 0.08,
        )

    return {
      id: `${aiPrimary ? 'ai_primary' : 'curated_prefab'}:${slug}:${dayNumber}:${index + 1}`,
      slug,
      kind: aiPrimary ? 'ai_primary' : 'curated_prefab',
      rank: index + 1,
      title: aiPrimary ? `${series.title}: ${snippet}` : series.title,
      question: series.question,
      confidence: Number(baseConfidence.toFixed(3)),
      reasoning: aiPrimary
        ? `Matched to curated series modules using a short-input fallback (${series.title}).`
        : 'A stable prefab series if you want a proven guided path.',
      preview: {
        verse: scripture.reference || 'Scripture',
        verseText: scripture.snippet,
        paragraph: aiPrimary
          ? `You shared "${snippet}". Start here for a clear next faithful step. ${series.introduction}`
          : series.introduction,
        curationSeed: {
          seriesSlug: slug,
          dayNumber,
          candidateKey: `emergency-fallback:${slug}:${dayNumber}`,
        },
      },
    }
  })
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
        error: 'Write at least one word so we can continue.',
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
    const inputGuidance = getLowContextGuidance(responseText)
    let options = buildAuditOptions(responseText)
    if (!hasExpectedOptionSplit(options)) {
      options = buildEmergencyFallbackOptions(responseText)
    }
    if (!hasExpectedOptionSplit(options)) {
      return jsonError({
        error: 'Unable to assemble devotional options right now.',
        code: 'OPTION_ASSEMBLY_FAILED',
        status: 500,
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
      ...(inputGuidance ? { inputGuidance } : {}),
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
