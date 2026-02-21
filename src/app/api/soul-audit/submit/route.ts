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
import {
  buildAuditOptions,
  sanitizeAuditInput,
} from '@/lib/soul-audit/matching'
import { parseAuditIntent } from '@/lib/brain/intent-parser'
import { duplicateCheck, rememberFingerprint } from '@/lib/brain/dedupe'
import {
  generateWithBrain,
  providerAvailabilityForUser,
} from '@/lib/brain/router'
import { retrieveFromIndex } from '@/lib/brain/rag-index'
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
  clarifierResponse?: string
}

const MAX_SUBMIT_BODY_BYTES = 8_192
const MAX_SUBMITS_PER_MINUTE = 12
const AI_OPTION_DUPLICATE_SCOPE = 'soul-audit-ai-options'

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

function createOptionVariantSeed(): number {
  try {
    const seed = new Uint32Array(1)
    crypto.getRandomValues(seed)
    return (Date.now() ^ seed[0]) >>> 0
  } catch {
    return Date.now() >>> 0
  }
}

type AiPolishPayload = {
  title?: string
  question?: string
  reasoning?: string
  paragraph?: string
  verse?: string
  verseText?: string
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

const DISALLOWED_BURDEN_FRAMING_PATTERN =
  /\b(you named this burden|because you named)\b/i
const TELEGRAPHIC_TITLE_PATTERN =
  /^(want|need|learn|help|start|daily)\b(?:\s+\w+){0,2}\s*[:\-]/i

function parseAiPolishPayload(raw: string): AiPolishPayload | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const fenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '')
  try {
    const parsed = JSON.parse(fenced) as AiPolishPayload
    return typeof parsed === 'object' && parsed ? parsed : null
  } catch {
    return null
  }
}

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

function hasDisallowedFraming(value: string): boolean {
  return DISALLOWED_BURDEN_FRAMING_PATTERN.test(value)
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
        task: 'audit_option_polish',
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
    }
  } catch {
    return fallback
  }
}

async function rerankGroundingDocsWithBrain(params: {
  reflectionFocus: string
  optionQuestion: string
  docs: Array<{ id: string; title: string; content: string }>
}): Promise<Array<{ id: string; title: string; content: string }>> {
  if (params.docs.length <= 3) return params.docs

  try {
    const generation = await generateWithBrain({
      system:
        'Rank candidate grounding snippets for a devotional pathway. Return JSON array of document ids in best-first order. No extra text.',
      messages: [
        {
          role: 'user',
          content: [
            `Reflection focus: ${params.reflectionFocus}`,
            `Option question: ${params.optionQuestion}`,
            'Candidates:',
            ...params.docs.map(
              (doc) =>
                `- ${doc.id}: ${doc.title} :: ${doc.content.slice(0, 220)}`,
            ),
          ].join('\n'),
        },
      ],
      context: {
        task: 'audit_option_polish',
        mode: 'auto',
        maxOutputTokens: 220,
      },
    })
    const cleaned = generation.output
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/i, '')
    const parsed = JSON.parse(cleaned) as string[]
    if (!Array.isArray(parsed) || parsed.length === 0) return params.docs
    const rank = new Map(parsed.map((id, index) => [String(id), index]))
    return [...params.docs].sort((a, b) => {
      const aRank = rank.has(a.id) ? rank.get(a.id)! : Number.MAX_SAFE_INTEGER
      const bRank = rank.has(b.id) ? rank.get(b.id)! : Number.MAX_SAFE_INTEGER
      return aRank - bRank
    })
  } catch {
    return params.docs
  }
}

function clampWords(value: string, minWords: number, maxWords: number): string {
  const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  if (words.length === 0) return value
  if (words.length > maxWords) return `${words.slice(0, maxWords).join(' ')}...`
  if (words.length < minWords) return value
  return words.join(' ')
}

async function polishAiOptionsWithBrain(
  responseText: string,
  options: AuditOptionPreview[],
): Promise<AuditOptionPreview[]> {
  const aiIndices = options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => option.kind === 'ai_primary')

  if (aiIndices.length === 0) return options

  const available = providerAvailabilityForUser({ userKeys: undefined }).some(
    (entry) => entry.available,
  )
  if (!available) return options

  const intent = await parseAuditIntentWithBrain(responseText)
  const next = [...options]

  for (const { option, index } of aiIndices) {
    const retrievedDocs = retrieveFromIndex({
      query: `${intent.reflectionFocus} ${option.slug} ${option.question}`,
      feature: 'audit',
      sourceTypes: ['curated', 'reference'],
      limit: 6,
    })
    const groundingDocs = await rerankGroundingDocsWithBrain({
      reflectionFocus: intent.reflectionFocus,
      optionQuestion: option.question,
      docs: retrievedDocs,
    })
    const groundingPrompt = groundingDocs
      .map((doc) => `- ${doc.title}: ${doc.content.slice(0, 260)}`)
      .join('\n')

    const systemPrompt = `You generate one Soul Audit pathway option for Euangelion.\nRules:\n- Return strict JSON object only.\n- Keep title <= 72 chars.\n- Keep question between 18 and 42 words.\n- Keep reasoning between 18 and 40 words.\n- Keep paragraph between 70 and 130 words.\n- Use grounded language from provided module context.\n- Never use these phrases: "You named this burden" or "Because you named".\n- Do not force negative framing when the user intent is growth or learning.\n- Titles must be complete natural language phrases, never keyword fragments (forbidden example: "Want Learn: ...").\nSchema: {\"title\":string,\"question\":string,\"reasoning\":string,\"paragraph\":string,\"verse\"?:string,\"verseText\"?:string}\n\nGrounding context:\n${groundingPrompt}`

    let candidate = option
    let accepted = false

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const generation = await generateWithBrain({
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `Reflection focus: ${intent.reflectionFocus}\nThemes: ${intent.themes.join(', ')}\nTone: ${intent.tone}\nCurrent option title: ${option.title}\nCurrent option question: ${option.question}\nCurrent preview: ${option.preview?.paragraph || ''}`,
            },
          ],
          context: {
            task: 'audit_option_polish',
            mode: 'auto',
            maxOutputTokens: 900,
          },
        })

        const parsed = parseAiPolishPayload(generation.output)
        if (!parsed) continue

        const title = normalizeLegacyFraming(
          (parsed.title || option.title).trim(),
        ).slice(0, 90)
        const question = clampWords(
          normalizeLegacyFraming((parsed.question || option.question).trim()),
          18,
          42,
        )
        const reasoning = clampWords(
          normalizeLegacyFraming((parsed.reasoning || option.reasoning).trim()),
          18,
          40,
        )
        const paragraph = clampWords(
          normalizeLegacyFraming(
            (parsed.paragraph || option.preview?.paragraph || '').trim(),
          ),
          70,
          130,
        )

        if (
          isLowQualityTitle(title) ||
          hasDisallowedFraming(title) ||
          hasDisallowedFraming(question) ||
          hasDisallowedFraming(reasoning) ||
          hasDisallowedFraming(paragraph)
        ) {
          continue
        }

        const duplicate = await duplicateCheck({
          scope: AI_OPTION_DUPLICATE_SCOPE,
          title,
          body: paragraph,
        })
        if (duplicate.duplicate) continue

        candidate = {
          ...option,
          title,
          question,
          reasoning,
          preview: option.preview
            ? {
                ...option.preview,
                verse: (parsed.verse || option.preview.verse || 'Scripture')
                  .trim()
                  .slice(0, 120),
                verseText: (parsed.verseText || option.preview.verseText || '')
                  .trim()
                  .slice(0, 260),
                paragraph,
              }
            : option.preview,
        }
        await rememberFingerprint({
          scope: AI_OPTION_DUPLICATE_SCOPE,
          title: candidate.title,
          body: candidate.preview?.paragraph || candidate.question,
        })
        accepted = true
        break
      } catch {
        // Keep deterministic option if generation fails.
      }
    }

    if (accepted) {
      next[index] = candidate
    }
  }

  return next
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
    const limiter = await takeRateLimit({
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
        error: 'Write at least one word so we can continue.',
        status: 400,
        requestId,
      })
    }

    if (effectiveResponseText.length > 2000) {
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
      effectiveResponseText !== sanitizeAuditInput(rerollVerified.responseText)
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

    const crisisDetected = detectCrisis(effectiveResponseText)
    const inputGuidance = getLowContextGuidance(effectiveResponseText)
    const optionVariantSeed = createOptionVariantSeed()
    let options = buildAuditOptions(effectiveResponseText, optionVariantSeed)
    if (!hasExpectedOptionSplit(options)) {
      return jsonError({
        error:
          'Unable to curate grounded AI options right now. Please retry in a moment.',
        code: 'OPTION_ASSEMBLY_FAILED',
        status: 422,
        requestId,
      })
    }
    options = await polishAiOptionsWithBrain(effectiveResponseText, options)
    options = sanitizeOptionSet(options)

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
        error: 'Unable to assemble a stable devotional option split.',
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
    const strategy = 'curated_candidates'

    await saveAuditTelemetry({
      runId: run.id,
      sessionToken,
      strategy,
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
      error: 'Unable to process soul audit right now.',
      status: 500,
      requestId,
    })
  }
}
