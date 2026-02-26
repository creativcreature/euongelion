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
  fallbackCandidateForSeries,
  getPrefabSlugs,
  makeOption,
  sanitizeAuditInput,
} from '@/lib/soul-audit/matching'
import { getCuratedDayCandidates } from '@/lib/soul-audit/curation-engine'
import { parseAuditIntent } from '@/lib/brain/intent-parser'
import {
  generateWithBrain,
  providerAvailabilityForUser,
} from '@/lib/brain/router'
import { brainFlags } from '@/lib/brain/flags'
import { generatePlanOutlines } from '@/lib/soul-audit/outline-generator'
import {
  buildOutlineCacheKey,
  getOutlineFromCache,
  setOutlineInCache,
} from '@/lib/soul-audit/outline-cache'
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
  const aiCount = options.filter(
    (option) => option.kind === 'ai_primary' || option.kind === 'ai_generative',
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

type AiIntentPayload = {
  intentType?:
    | 'learning'
    | 'guidance'
    | 'confession'
    | 'lament'
    | 'anxiety'
    | 'gratitude'
    | 'mixed'
  confidence?: number
  reflectionFocus?: string
  reflectionLine?: string
  tone?: 'lament' | 'hope' | 'confession' | 'anxiety' | 'guidance' | 'mixed'
  themes?: string[]
  scriptureAnchors?: string[]
  intentTags?: string[]
}

const TELEGRAPHIC_TITLE_PATTERN =
  /^(want|need|learn|help|start|daily)\b(?:\s+\w+){0,2}\s*[:\-]/i

function parseAiIntentPayload(raw: string): AiIntentPayload | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const fenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '')
  try {
    const parsed = JSON.parse(fenced) as AiIntentPayload
    return typeof parsed === 'object' && parsed ? parsed : null
  } catch {
    return null
  }
}

function normalizeLegacyFraming(value: string): string {
  return value
    .replace(
      /you named this burden:\s*["“]?([^"”]+)["”]?\s*/gi,
      'You shared this reflection: "$1". ',
    )
    .replace(
      /because you named\s*["“]?([^"”]+)["”]?\s*/gi,
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

async function parseAuditIntentWithBrain(input: string) {
  const fallback = parseAuditIntent(input)

  // Token optimization: use deterministic parser by default.
  // The outline LLM already sees the raw user text and naturally understands
  // nuance — the separate LLM intent parse adds cost but little quality.
  if (!brainFlags.llmIntentParsing) return fallback

  const availability = providerAvailabilityForUser({ userKeys: undefined })
  const hasProvider = availability.some((entry) => entry.available)
  if (!hasProvider) return fallback

  const systemPrompt = `You classify Soul Audit user reflections for Euangelion.
Rules:
- Return strict JSON only.
- Do not label every reflection as a problem; positive intent is valid.
- If user expresses growth intent (example: "I want to learn to pray"), keep it constructive.
Schema:
{
  "intentType":"learning|guidance|confession|lament|anxiety|gratitude|mixed",
  "confidence":number,
  "reflectionFocus":string,
  "reflectionLine":string,
  "tone":"lament|hope|confession|anxiety|guidance|mixed",
  "themes":string[],
  "scriptureAnchors":string[],
  "intentTags":string[]
}`

  try {
    const generation = await generateWithBrain({
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: input,
        },
      ],
      context: {
        task: 'audit_intent_parse',
        mode: 'auto',
        maxOutputTokens: 500,
      },
    })

    const parsed = parseAiIntentPayload(generation.output)
    if (!parsed) return fallback

    return {
      reflectionFocus:
        (parsed.reflectionFocus || '').trim().slice(0, 160) ||
        fallback.reflectionFocus,
      themes:
        Array.isArray(parsed.themes) && parsed.themes.length > 0
          ? parsed.themes
              .map((value) => String(value).trim().toLowerCase())
              .filter(Boolean)
              .slice(0, 6)
          : fallback.themes,
      scriptureAnchors:
        Array.isArray(parsed.scriptureAnchors) &&
        parsed.scriptureAnchors.length > 0
          ? parsed.scriptureAnchors
              .map((value) => String(value).trim())
              .filter(Boolean)
              .slice(0, 4)
          : fallback.scriptureAnchors,
      tone:
        parsed.tone === 'lament' ||
        parsed.tone === 'hope' ||
        parsed.tone === 'confession' ||
        parsed.tone === 'anxiety' ||
        parsed.tone === 'guidance' ||
        parsed.tone === 'mixed'
          ? parsed.tone
          : fallback.tone,
      intentTags:
        Array.isArray(parsed.intentTags) && parsed.intentTags.length > 0
          ? parsed.intentTags
              .map((value) => String(value).trim().toLowerCase())
              .filter(Boolean)
              .slice(0, 8)
          : fallback.intentTags,
      // Taxonomy fields always come from deterministic parser — LLM doesn't add value here
      disposition: fallback.disposition,
      faithBackground: fallback.faithBackground,
      depthPreference: fallback.depthPreference,
    }
  } catch {
    return fallback
  }
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

    // Log provider availability for debugging.
    const providerStatus = providerAvailabilityForUser({ userKeys: undefined })
    const availableProviders = providerStatus.filter((p) => p.available)
    const unavailableProviders = providerStatus.filter((p) => !p.available)
    if (availableProviders.length === 0) {
      console.warn(
        `[soul-audit:submit] No LLM providers available. All providers: ${unavailableProviders.map((p) => `${p.provider}=${p.reason || 'no key'}`).join(', ')}. Outline generation will likely fail.`,
      )
    } else {
      console.info(
        `[soul-audit:submit] LLM providers available: ${availableProviders.map((p) => `${p.provider}(${p.using})`).join(', ')}`,
      )
    }

    // Parse intent FIRST so AI-extracted themes influence candidate selection.
    const precomputedIntent = await parseAuditIntentWithBrain(
      effectiveResponseText,
    )
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

    // --- Generative outline path (required) ---
    // Generate 3 unique plan outlines via LLM. No curated fallback.
    // If generation fails, return honest error to user.
    const generationStart = Date.now()
    let options: AuditOptionPreview[]
    const submissionStrategy = 'generative_outlines' as const

    let generativeResult: Awaited<ReturnType<typeof generatePlanOutlines>> =
      null

    // Token optimization: check outline cache before calling LLM.
    const outlineCacheKey = buildOutlineCacheKey(precomputedIntent)
    if (brainFlags.outlineCacheEnabled) {
      const cached = getOutlineFromCache(outlineCacheKey)
      if (cached) {
        console.info(
          `[soul-audit:submit] Outline cache HIT — reusing ${cached.options.length} cached outlines`,
        )
        generativeResult = cached
      }
    }

    if (!generativeResult) {
      try {
        generativeResult = await generatePlanOutlines({
          responseText: effectiveResponseText,
          intent: precomputedIntent,
        })

        // Cache successful results
        if (generativeResult && brainFlags.outlineCacheEnabled) {
          setOutlineInCache(outlineCacheKey, generativeResult)
        }
      } catch (generativeError) {
        console.error(
          `[soul-audit:submit] Generative outline path failed:`,
          generativeError instanceof Error
            ? generativeError.message
            : generativeError,
        )
        return jsonError({
          error: PASTORAL_MESSAGES.ALL_PROVIDERS_DOWN,
          code: 'ALL_PROVIDERS_EXHAUSTED',
          status: 503,
          requestId,
        })
      }
    }

    if (
      !generativeResult ||
      generativeResult.options.length < SOUL_AUDIT_OPTION_SPLIT.aiPrimary
    ) {
      console.error(
        `[soul-audit:submit] Generative path returned insufficient options (${generativeResult?.options.length ?? 0} < ${SOUL_AUDIT_OPTION_SPLIT.aiPrimary})`,
      )
      return jsonError({
        error: PASTORAL_MESSAGES.OPTION_ASSEMBLY_FAILED,
        code: 'OPTION_ASSEMBLY_FAILED',
        status: 422,
        requestId,
      })
    }

    console.info(
      `[soul-audit:submit] Generative path succeeded — ${generativeResult.options.length} outlines generated`,
    )

    // Generative path: 3 ai_generative + 2 curated_prefab
    const aiOptions = generativeResult.options.slice(
      0,
      SOUL_AUDIT_OPTION_SPLIT.aiPrimary,
    )
    const aiSlugs = aiOptions.map((o) => o.slug)
    const prefabSlugs = getPrefabSlugs(aiSlugs)
    const prefabOptions = prefabSlugs
      .map((slug, index) => {
        const candidate =
          getCuratedDayCandidates().find((item) => item.seriesSlug === slug) ??
          fallbackCandidateForSeries(slug)
        if (!candidate) return null
        return makeOption({
          candidate,
          kind: 'curated_prefab',
          rank: aiOptions.length + index + 1,
          confidence: Math.max(0.35, 0.75 - index * 0.1),
          input: effectiveResponseText,
          variantSeed: optionVariantSeed,
        })
      })
      .filter((option): option is AuditOptionPreview => Boolean(option))

    options = [...aiOptions, ...prefabOptions].slice(
      0,
      SOUL_AUDIT_OPTION_SPLIT.total,
    )

    if (!hasExpectedOptionSplit(options)) {
      return jsonError({
        error: PASTORAL_MESSAGES.OPTION_ASSEMBLY_FAILED,
        code: 'OPTION_ASSEMBLY_FAILED',
        status: 422,
        requestId,
      })
    }

    const slowGeneration = Date.now() - generationStart > 8_000

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

    // Strip planOutline from options in the run token to keep it compact.
    // The token is only used for reroll verification (responseText + session binding).
    const tokenOptions = responseOptions.map(
      ({ planOutline: _po, ...rest }) => rest,
    )
    const runToken = createRunToken({
      auditRunId: run.id,
      responseText: effectiveResponseText,
      crisisDetected,
      options: tokenOptions as AuditOptionPreview[],
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
      slowGeneration,
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
      (option) =>
        option.kind === 'ai_primary' || option.kind === 'ai_generative',
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
      strategy: submissionStrategy,
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
