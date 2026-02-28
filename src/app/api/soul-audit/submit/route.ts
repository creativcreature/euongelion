import { NextRequest, NextResponse } from 'next/server'

import { crisisRequirement, detectCrisis } from '@/lib/soul-audit/crisis'
import {
  createRequestId,
  getClientKey,
  getRequestPath,
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
import { PASTORAL_MESSAGES } from '@/lib/soul-audit/messages'
import {
  buildAuditOptions,
  sanitizeAuditInput,
} from '@/lib/soul-audit/matching'
import { parseAuditIntent } from '@/lib/brain/intent-parser'
import { brainFlags } from '@/lib/brain/flags'
import { createRunToken, verifyRunToken } from '@/lib/soul-audit/run-token'
import {
  needsClarification,
  buildClarifierPrompt,
  createClarifierToken,
} from '@/lib/soul-audit/clarifier'
import {
  bumpSessionAuditCount,
  createAuditRun,
  getSessionAuditCount,
  saveAuditTelemetry,
} from '@/lib/soul-audit/repository'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
import type {
  AuditOptionPreview,
  SoulAuditClarifierResponse,
  SoulAuditSubmitResponseV2,
} from '@/types/soul-audit'

interface SubmitBody {
  response?: string
  rerollForRunId?: string
  runToken?: string
  clarifierResponse?: string
  clarifierToken?: string
}

const MAX_SUBMIT_BODY_BYTES = 32_768
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
  const aiCount = options.filter(
    (option) => option.kind === 'ai_primary',
  ).length
  const curatedPrefabCount = options.filter(
    (option) => option.kind === 'curated_prefab',
  ).length
  return (
    options.length === SOUL_AUDIT_OPTION_SPLIT.total &&
    aiCount === SOUL_AUDIT_OPTION_SPLIT.aiPrimary &&
    curatedPrefabCount === SOUL_AUDIT_OPTION_SPLIT.curatedPrefab
  )
}

function getLowContextGuidance(input: string): string | null {
  const words = input
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
  if (words.length > 3) return null

  return PASTORAL_MESSAGES.INPUT_TOO_SHORT
}

function createOptionVariantSeed(): number {
  try {
    const seed = new Uint32Array(1)
    crypto.getRandomValues(seed)
    return (Date.now() ^ seed[0]) >>> 0
  } catch {
    return Date.now() >>> 0
  }
}

const TELEGRAPHIC_TITLE_PATTERN =
  /^(want|need|learn|help|start|daily)\b(?:\s+\w+){0,2}\s*[:\-]/i

function normalizeLegacyFraming(value: string): string {
  return value
    .replace(
      /you named this burden:\s*["\u201C]?([^"\u201D]+)["\u201D]?\s*/gi,
      'You shared this reflection: "$1". ',
    )
    .replace(
      /because you named\s*["\u201C]?([^"\u201D]+)["\u201D]?\s*/gi,
      'Because you shared this reflection, ',
    )
    .replace(/\s+/g, ' ')
    .trim()
}

function isLowQualityTitle(value: string): boolean {
  const normalized = value.trim()
  if (!normalized) return true
  if (TELEGRAPHIC_TITLE_PATTERN.test(normalized)) return true
  if (/^want learn\b/i.test(normalized)) return true
  return false
}

function sanitizeOptionCopy(option: AuditOptionPreview): AuditOptionPreview {
  const title = normalizeLegacyFraming(option.title)
  const question = normalizeLegacyFraming(option.question)
  const reasoning = normalizeLegacyFraming(option.reasoning)
  const paragraph = option.preview?.paragraph
    ? normalizeLegacyFraming(option.preview.paragraph)
    : option.preview?.paragraph

  return {
    ...option,
    title: isLowQualityTitle(title)
      ? option.preview?.verse || option.title
      : title,
    question,
    reasoning,
    preview: option.preview
      ? {
          ...option.preview,
          paragraph: paragraph ?? option.preview.paragraph,
        }
      : option.preview,
  }
}

function sanitizeOptionSet(
  options: AuditOptionPreview[],
): AuditOptionPreview[] {
  return options.map(sanitizeOptionCopy)
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)

  // Emergency kill switch — disables Soul Audit entirely.
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
    const clarifierResponse = sanitizeAuditInput(body.clarifierResponse)
    const effectiveResponseText = [responseText, clarifierResponse]
      .map((value) => value.trim())
      .filter(Boolean)
      .join('\n\n')
    const rerollForRunId = String(body.rerollForRunId || '').trim()
    const rerollRequested = rerollForRunId.length > 0
    const providedRunToken =
      typeof body.runToken === 'string' ? body.runToken : null

    if (!effectiveResponseText) {
      return jsonError({
        error: PASTORAL_MESSAGES.INPUT_EMPTY,
        status: 400,
        requestId,
      })
    }

    if (effectiveResponseText.length > 2000) {
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
      effectiveResponseText !== sanitizeAuditInput(rerollVerified.responseText)
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

    const crisisDetected = detectCrisis(effectiveResponseText)
    const inputGuidance = getLowContextGuidance(effectiveResponseText)
    const optionVariantSeed = createOptionVariantSeed()

    // Deterministic intent parsing — no LLM call.
    const precomputedIntent = parseAuditIntent(effectiveResponseText)
    console.info(
      `[soul-audit:submit] Parsed intent — focus: "${precomputedIntent.reflectionFocus}", themes: [${precomputedIntent.themes.join(', ')}], tone: ${precomputedIntent.tone}, disposition: ${precomputedIntent.disposition}, depth: ${precomputedIntent.depthPreference}`,
    )

    // --- Clarifier-once gate ---
    // When input is too vague (<=3 words, no themes), ask ONE follow-up
    // before generating options. Skip for rerolls and when disabled.
    const hasClarifierResponse = Boolean(clarifierResponse)
    if (
      brainFlags.clarifierEnabled &&
      !rerollRequested &&
      needsClarification(
        responseText,
        precomputedIntent.themes,
        hasClarifierResponse,
      )
    ) {
      const { prompt, suggestions } = buildClarifierPrompt()
      const clarifierTokenValue = createClarifierToken({
        originalInput: responseText,
        sessionToken,
      })

      const clarifierPayload: SoulAuditClarifierResponse = {
        clarifierRequired: true,
        clarifierPrompt: prompt,
        clarifierOptions: suggestions,
        clarifierToken: clarifierTokenValue,
      }

      return withRequestIdHeaders(
        NextResponse.json(clarifierPayload, { status: 200 }),
        requestId,
      )
    }

    // --- Curated assembly path (zero LLM calls) ---
    // Rank all 167 curated candidates via keyword scoring + semantic
    // expansion, then assemble 3 ai_primary + 2 curated_prefab options.
    const options = buildAuditOptions(
      effectiveResponseText,
      optionVariantSeed,
      precomputedIntent.themes,
    )

    if (!hasExpectedOptionSplit(options)) {
      return jsonError({
        error: PASTORAL_MESSAGES.OPTION_ASSEMBLY_FAILED,
        code: 'OPTION_ASSEMBLY_FAILED',
        status: 422,
        requestId,
      })
    }

    const { run, options: persistedOptions } = await createAuditRun({
      sessionToken,
      responseText: effectiveResponseText,
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
    responseOptions = sanitizeOptionSet(responseOptions)

    if (!hasExpectedOptionSplit(responseOptions)) {
      responseOptions = sanitizeOptionSet(
        options.slice(0, SOUL_AUDIT_OPTION_SPLIT.total),
      )
    }

    if (!hasExpectedOptionSplit(responseOptions)) {
      return jsonError({
        error: PASTORAL_MESSAGES.OPTION_SPLIT_INVALID,
        code: 'OPTION_SPLIT_INVALID',
        status: 500,
        requestId,
      })
    }

    const runToken = createRunToken({
      auditRunId: run.id,
      responseText: effectiveResponseText,
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
      clarifierRequired: false,
      clarifierPrompt: null,
      clarifierOptions: [],
      clarifierToken: null,
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
    await saveAuditTelemetry({
      runId: run.id,
      sessionToken,
      strategy: 'curated_assembly',
      splitValid: hasExpectedOptionSplit(responseOptions),
      aiPrimaryCount: aiPrimary.length,
      curatedPrefabCount: curatedPrefab.length,
      avgConfidence,
      responseExcerpt: effectiveResponseText.slice(0, 280),
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
