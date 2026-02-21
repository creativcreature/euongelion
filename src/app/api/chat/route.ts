import { NextRequest, NextResponse } from 'next/server'
import {
  createRequestId,
  getClientKey,
  jsonError,
  logApiError,
  readJsonWithLimit,
  sanitizeOptionalText,
  sanitizeSingleLine,
  takeRateLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
import { resolveEntitlementSnapshot } from '@/lib/billing/entitlements'
import {
  generateWithBrain,
  openWebConfigured,
  providerAvailabilityForUser,
  runOpenWebSearch,
} from '@/lib/brain/router'
import { brainFlags } from '@/lib/brain/flags'
import {
  getUsageSummary,
  quotaRequiresByo,
  recordUsage,
  resolvePrincipalId,
} from '@/lib/brain/usage-ledger'
import {
  getCanonicalRagIndex,
  retrieveFromIndex,
  type RagDoc,
} from '@/lib/brain/rag-index'
import type {
  BrainProviderId,
  ChatRetrievalMode,
  SourceCard,
} from '@/lib/brain/types'

const MAX_BODY_BYTES = 40_000
const MAX_CHAT_REQUESTS_PER_MINUTE = 30
const MAX_MESSAGE_CHARS = 2_500
const MAX_HIGHLIGHT_CHARS = 700
const MAX_CHAT_CITATIONS = 12
// Guard contract: chat remains anchored to local corpus + devotional context.

const BIBLE_BOOKS = [
  'Genesis',
  'Exodus',
  'Leviticus',
  'Numbers',
  'Deuteronomy',
  'Joshua',
  'Judges',
  'Ruth',
  '1 Samuel',
  '2 Samuel',
  '1 Kings',
  '2 Kings',
  '1 Chronicles',
  '2 Chronicles',
  'Ezra',
  'Nehemiah',
  'Esther',
  'Job',
  'Psalms',
  'Proverbs',
  'Ecclesiastes',
  'Song of Songs',
  'Song of Solomon',
  'Isaiah',
  'Jeremiah',
  'Lamentations',
  'Ezekiel',
  'Daniel',
  'Hosea',
  'Joel',
  'Amos',
  'Obadiah',
  'Jonah',
  'Micah',
  'Nahum',
  'Habakkuk',
  'Zephaniah',
  'Haggai',
  'Zechariah',
  'Malachi',
  'Matthew',
  'Mark',
  'Luke',
  'John',
  'Acts',
  'Romans',
  '1 Corinthians',
  '2 Corinthians',
  'Galatians',
  'Ephesians',
  'Philippians',
  'Colossians',
  '1 Thessalonians',
  '2 Thessalonians',
  '1 Timothy',
  '2 Timothy',
  'Titus',
  'Philemon',
  'Hebrews',
  'James',
  '1 Peter',
  '2 Peter',
  '1 John',
  '2 John',
  '3 John',
  'Jude',
  'Revelation',
]

const SCRIPTURE_CITATION_REGEX = new RegExp(
  `\\b(?:${BIBLE_BOOKS.map((book) =>
    book.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'),
  )
    .sort((a, b) => b.length - a.length)
    .join('|')})\\s\\d{1,3}:\\d{1,3}(?:-\\d{1,3})?\\b`,
  'g',
)

type ChatMessageInput = {
  role: 'user' | 'assistant'
  content: string
}

type UserProvidedKeys = Partial<{
  openai: string
  google: string
  minimax: string
  nvidia_kimi: string
}>

type KeyValidationFailure = {
  provider: keyof UserProvidedKeys
  reason: string
}

interface ChatRequestBody {
  messages: ChatMessageInput[]
  devotionalSlug?: string
  highlightedText?: string
  userApiKey?: string
  userKeys?: UserProvidedKeys
  brainMode?: BrainProviderId
  openWebMode?: boolean
  openWebAcknowledged?: boolean
  stream?: boolean
}

type ChatCitation = {
  id: string
  label: string
  type:
    | 'scripture'
    | 'devotional_context'
    | 'local_reference'
    | 'highlight'
    | 'open_web'
  source: string
  url?: string
  publisher?: string
  date?: string
  snippet?: string
}

type ContextPacket = {
  prompt: string
  sourceCards: SourceCard[]
  hasDevotionalContext: boolean
  hasReferenceContext: boolean
  hasHighlightContext: boolean
}

function normalizeCitationId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeMode(mode: unknown): BrainProviderId {
  return mode === 'openai' ||
    mode === 'google' ||
    mode === 'minimax' ||
    mode === 'nvidia_kimi'
    ? mode
    : 'auto'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function sanitizeUserKeys(value: unknown): UserProvidedKeys {
  const record = isRecord(value) ? value : {}
  const keys: UserProvidedKeys = {}

  const openai = sanitizeOptionalText(record.openai, 240)
  const google = sanitizeOptionalText(record.google, 240)
  const minimax = sanitizeOptionalText(record.minimax, 240)
  const nvidia = sanitizeOptionalText(record.nvidia_kimi, 240)

  if (openai) keys.openai = openai
  if (google) keys.google = google
  if (minimax) keys.minimax = minimax
  if (nvidia) keys.nvidia_kimi = nvidia

  return keys
}

function validProviderKey(
  provider: keyof UserProvidedKeys,
  key: string,
): boolean {
  const trimmed = key.trim()
  if (!trimmed) return true

  if (provider === 'openai') {
    // Accept OpenAI (sk-...) or Anthropic (sk-ant-...) BYO keys.
    return /^sk-[a-z0-9][a-z0-9._-]{20,}$/i.test(trimmed)
  }
  if (provider === 'google') {
    return /^AIza[0-9A-Za-z_-]{20,}$/.test(trimmed)
  }
  if (provider === 'nvidia_kimi') {
    return /^nvapi-[A-Za-z0-9_-]{20,}$/.test(trimmed)
  }
  // MiniMax key formats vary by account/project; require strong length + charset.
  return /^[A-Za-z0-9._-]{20,}$/.test(trimmed)
}

function validateUserKeys(keys: UserProvidedKeys): KeyValidationFailure[] {
  const failures: KeyValidationFailure[] = []
  for (const provider of Object.keys(keys) as Array<keyof UserProvidedKeys>) {
    const value = keys[provider]
    if (!value) continue
    if (!validProviderKey(provider, value)) {
      failures.push({
        provider,
        reason: 'invalid_format',
      })
    }
  }
  return failures
}

function docsToSourceCards(docs: RagDoc[]): SourceCard[] {
  return docs.map((doc) => ({
    id: doc.id,
    title: doc.title,
    snippet: doc.content.slice(0, 280),
    sourceType:
      doc.sourceType === 'reference'
        ? 'local_reference'
        : doc.sourceType === 'devotional'
          ? 'devotional_context'
          : 'scripture',
    url: undefined,
    publisher:
      doc.sourceType === 'reference'
        ? 'Euangelion Reference Corpus'
        : 'Euangelion Curated',
    date: undefined,
  }))
}

function findDevotionalDocs(slug: string): RagDoc[] {
  const index = getCanonicalRagIndex(false)
  return index.docs.filter(
    (doc) =>
      doc.sourceType === 'devotional' &&
      typeof doc.metadata?.slug === 'string' &&
      doc.metadata.slug === slug,
  )
}

function buildClosedContextPacket(params: {
  query: string
  devotionalSlug?: string
  highlightedText?: string
}): ContextPacket {
  const sourceCards: SourceCard[] = []
  const promptParts: string[] = []

  let devotionalDocs: RagDoc[] = []
  if (params.devotionalSlug) {
    devotionalDocs = findDevotionalDocs(params.devotionalSlug)
    if (devotionalDocs.length > 0) {
      sourceCards.push(...docsToSourceCards(devotionalDocs.slice(0, 4)))
      promptParts.push(
        `Current devotional slug: ${params.devotionalSlug}`,
        ...devotionalDocs
          .slice(0, 4)
          .map((doc) => `- ${doc.title}: ${doc.content.slice(0, 380)}`),
      )
    }
  }

  const referenceDocs = retrieveFromIndex({
    query: params.query,
    feature: 'chat',
    sourceTypes: ['reference', 'curated', 'devotional'],
    limit: 6,
  })

  if (referenceDocs.length > 0) {
    const cards = docsToSourceCards(referenceDocs)
    sourceCards.push(
      ...cards.filter(
        (card) => !sourceCards.some((existing) => existing.id === card.id),
      ),
    )
    promptParts.push(
      'Grounding context from local reference corpus:',
      ...referenceDocs
        .slice(0, 6)
        .map((doc) => `- ${doc.title}: ${doc.content.slice(0, 420)}`),
    )
  }

  if (params.highlightedText) {
    const highlight = params.highlightedText.slice(0, 220)
    sourceCards.unshift({
      id: `highlight-${normalizeCitationId(highlight)}`,
      title: 'Highlighted text',
      snippet: highlight,
      sourceType: 'devotional_context',
    })
    promptParts.unshift(`Highlighted text context: ${highlight}`)
  }

  return {
    prompt:
      promptParts.length > 0
        ? `Use this context only:\n${promptParts.join('\n')}`
        : '',
    sourceCards,
    hasDevotionalContext: devotionalDocs.length > 0,
    hasReferenceContext: referenceDocs.length > 0,
    hasHighlightContext: Boolean(params.highlightedText),
  }
}

function sourceCardsToCitations(cards: SourceCard[]): ChatCitation[] {
  return cards.map((card, index) => ({
    id: card.id || `source-${index + 1}`,
    label: card.title,
    type:
      card.sourceType === 'open_web'
        ? 'open_web'
        : card.sourceType === 'scripture'
          ? 'scripture'
          : card.sourceType,
    source: card.url || card.title,
    url: card.url,
    publisher: card.publisher,
    date: card.date,
    snippet: card.snippet,
  }))
}

function extractScriptureCitations(message: string): ChatCitation[] {
  const references = Array.from(
    new Set((message.match(SCRIPTURE_CITATION_REGEX) || []).map((m) => m)),
  ).slice(0, 8)

  return references.map((reference) => ({
    id: `scripture-response-${normalizeCitationId(reference)}`,
    label: `Scripture citation: ${reference}`,
    type: 'scripture',
    source: reference,
  }))
}

function getLatestUserMessage(messages: ChatMessageInput[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role === 'user' && message.content.trim()) {
      return message.content.trim()
    }
  }
  return ''
}

function appendInlineSourceMarkers(text: string, count: number): string {
  if (count <= 0) return text
  const hasInlineMarkers = /\[[0-9]+\]/.test(text)
  if (hasInlineMarkers) return text

  const markers = Array.from(
    { length: Math.min(4, count) },
    (_, index) => `[${index + 1}]`,
  ).join(' ')
  return `${text.trim()}\n\nSources: ${markers}`
}

function resolveRetrievalMode(body: ChatRequestBody): ChatRetrievalMode {
  return body.openWebMode === true ? 'open_web' : 'closed'
}

function toSseFrame(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

function splitForStream(text: string, chunkSize = 120): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const chunks: string[] = []
  for (let index = 0; index < words.length; index += chunkSize) {
    chunks.push(`${words.slice(index, index + chunkSize).join(' ')} `)
  }
  return chunks
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)
  const requestUrl = (() => {
    try {
      return new URL(request.url)
    } catch {
      return null
    }
  })()
  const requestPath = requestUrl?.pathname || '/api/chat'
  const requestHost = requestUrl?.host || 'unknown'

  try {
    if (!brainFlags.brainRouterEnabled) {
      return jsonError({
        error: 'Brain router is disabled in this environment.',
        status: 503,
        requestId,
      })
    }

    const limiter = await takeRateLimit({
      namespace: 'chat',
      key: clientKey,
      limit: MAX_CHAT_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return jsonError({
        error: 'Too many chat requests. Please retry shortly.',
        status: 429,
        requestId,
        rateLimit: limiter,
      })
    }

    const parsed = await readJsonWithLimit<ChatRequestBody>({
      request,
      maxBytes: MAX_BODY_BYTES,
    })
    if (!parsed.ok) {
      return jsonError({
        error: parsed.error,
        status: parsed.status,
        requestId,
      })
    }

    const body = parsed.data
    const rawMessages = Array.isArray(body.messages) ? body.messages : []
    const messages = rawMessages
      .slice(-12)
      .map((item) => ({
        role: item.role,
        content: sanitizeSingleLine(item.content, MAX_MESSAGE_CHARS),
      }))
      .filter(
        (item) =>
          (item.role === 'user' || item.role === 'assistant') &&
          item.content.length > 0,
      )

    const devotionalSlug = sanitizeSingleLine(body.devotionalSlug, 120)
    const highlightedText = sanitizeOptionalText(
      body.highlightedText,
      MAX_HIGHLIGHT_CHARS,
    )

    if (messages.length === 0) {
      return jsonError({
        error: 'Messages are required.',
        status: 400,
        requestId,
      })
    }

    if (!devotionalSlug && !highlightedText) {
      return jsonError({
        error:
          'Study chat is limited to devotional context. Open a devotional or highlight text first.',
        status: 400,
        requestId,
      })
    }

    const retrievalMode = resolveRetrievalMode(body)
    const latestUserMessage = getLatestUserMessage(messages)
    const query = collapseWhitespace(
      [latestUserMessage, devotionalSlug, highlightedText || '']
        .filter(Boolean)
        .join(' '),
    )

    const legacyOpenaiKey = sanitizeOptionalText(body.userApiKey, 240)
    const userKeys = sanitizeUserKeys(body.userKeys)
    if (legacyOpenaiKey && !userKeys.openai) {
      userKeys.openai = legacyOpenaiKey
    }
    const keyValidationFailures = validateUserKeys(userKeys)
    if (keyValidationFailures.length > 0) {
      return jsonError({
        error:
          'One or more provider keys are not in a valid format. Update your BYO keys in Settings.',
        status: 400,
        requestId,
        code: 'INVALID_PROVIDER_KEY_FORMAT',
        details: {
          invalidProviders: keyValidationFailures.map((failure) =>
            failure.provider.toString(),
          ),
        },
      })
    }

    let sessionToken = `session-${clientKey.replace(/[^a-z0-9-]+/gi, '-')}`
    try {
      sessionToken = await getOrCreateAuditSessionToken()
    } catch {
      // Non-request-scope test calls fall back to ephemeral session id.
    }

    let user: {
      id: string
      user_metadata?: Record<string, unknown>
      app_metadata?: Record<string, unknown>
    } | null = null

    try {
      const supabase = await createClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      user = authUser
    } catch {
      // Test/runtime fallback keeps route functional without auth context.
    }

    const principalId = resolvePrincipalId({
      userId: user?.id || null,
      sessionToken,
    })
    const entitlements = resolveEntitlementSnapshot({
      subscriptionTier:
        user?.user_metadata?.subscription_tier ||
        user?.app_metadata?.subscription_tier,
    })
    const usageSummary = await getUsageSummary({
      principalId,
      isPremium: entitlements.premiumActive,
    })

    const platformHalted = quotaRequiresByo(usageSummary)
    const availabilityWithPlatform = providerAvailabilityForUser({ userKeys })
    const availabilityByoOnly = providerAvailabilityForUser({
      userKeys,
      platformKeysEnabled: false,
    })

    if (
      platformHalted &&
      availabilityByoOnly.every((entry) => !entry.available)
    ) {
      return jsonError({
        error:
          'Platform AI budget is currently capped. Add a BYO key or upgrade subscription to continue.',
        status: 402,
        requestId,
        code: 'BYO_REQUIRED',
        details: {
          quotaState: 'halted_platform',
          requiresByo: true,
        },
      })
    }

    const mode = normalizeMode(body.brainMode)
    if (mode !== 'auto') {
      const selected = (
        platformHalted ? availabilityByoOnly : availabilityWithPlatform
      ).find((entry) => entry.provider === mode)
      if (!selected?.available) {
        return jsonError({
          error:
            selected?.reason ||
            'Selected provider is not available for this account.',
          status: 400,
          requestId,
          code: 'PROVIDER_UNAVAILABLE',
        })
      }
    }

    let contextPacket: ContextPacket = {
      prompt: '',
      sourceCards: [],
      hasDevotionalContext: false,
      hasReferenceContext: false,
      hasHighlightContext: Boolean(highlightedText),
    }

    let openWebSourceCards: SourceCard[] = []
    let openWebAcknowledged = false

    if (retrievalMode === 'open_web') {
      if (!brainFlags.openWebModeEnabled) {
        return jsonError({
          error: 'Open Web mode is disabled in this environment.',
          status: 400,
          requestId,
          code: 'OPEN_WEB_DISABLED',
        })
      }
      if (!openWebConfigured()) {
        return jsonError({
          error: 'Open Web source retrieval is not configured right now.',
          status: 503,
          requestId,
          code: 'OPEN_WEB_UNAVAILABLE',
        })
      }

      openWebAcknowledged = body.openWebAcknowledged === true
      if (!openWebAcknowledged) {
        return jsonError({
          error:
            'Open Web mode requires acknowledgement for this query before search can run.',
          status: 400,
          requestId,
          code: 'OPEN_WEB_ACK_REQUIRED',
        })
      }

      const webResults = await runOpenWebSearch({ query })
      openWebSourceCards = webResults.map((result, index) => ({
        id: `open-web-${index + 1}-${normalizeCitationId(result.url)}`,
        title: result.title,
        publisher: result.publisher,
        url: result.url,
        date: result.date,
        snippet: result.snippet,
        sourceType: 'open_web',
      }))

      contextPacket = buildClosedContextPacket({
        query,
        devotionalSlug: devotionalSlug || undefined,
        highlightedText: highlightedText || undefined,
      })
    } else {
      contextPacket = buildClosedContextPacket({
        query,
        devotionalSlug: devotionalSlug || undefined,
        highlightedText: highlightedText || undefined,
      })
    }

    if (!contextPacket.hasDevotionalContext && devotionalSlug) {
      return jsonError({
        error:
          'Devotional context is unavailable for this page. Open a devotional day before using study chat.',
        status: 400,
        requestId,
      })
    }

    if (retrievalMode === 'closed' && !contextPacket.hasReferenceContext) {
      return jsonError({
        error:
          'Local reference corpus is unavailable. Sync reference volumes before using study chat.',
        status: 503,
        requestId,
      })
    }

    const sourceCards =
      retrievalMode === 'open_web'
        ? [...contextPacket.sourceCards, ...openWebSourceCards]
        : contextPacket.sourceCards

    if (
      retrievalMode === 'closed' &&
      sourceCards.length === 0 &&
      !contextPacket.hasHighlightContext
    ) {
      return withRequestIdHeaders(
        NextResponse.json(
          {
            message:
              'I do not have enough grounded local context for that yet. Ask from the current devotional section or highlight a passage and try again.',
            citations: [],
            sourceCards: [],
            guardrails: {
              scope: 'local-corpus-only',
              internetSearch: false,
              retrievalMode: 'closed',
              provider: null,
              devotionalSlug: devotionalSlug || null,
              hasHighlightedText: Boolean(highlightedText),
              hasDevotionalContext: contextPacket.hasDevotionalContext,
              hasReferenceContext: contextPacket.hasReferenceContext,
              sources: [],
              insufficientContext: true,
            },
            usage: {
              quotaState: usageSummary.quota.state,
              platformBudgetRemainingUsd:
                usageSummary.platformBudget.remainingUsd,
            },
          },
          { status: 200 },
        ),
        requestId,
      )
    }

    const systemPrompt =
      retrievalMode === 'open_web'
        ? `You are Euangelion's biblical research assistant.\n\nRules:\n- Blend pastoral warmth with precise sourcing.\n- Use local devotional context first, then open-web sources when provided.\n- Keep responses practical and substantial (3-6 paragraphs).\n- Cite your claims inline using [1], [2], etc aligned with provided sources only.\n- Never fabricate sources.\n\nContext:\n${contextPacket.prompt}\n\nOpen Web Sources:\n${openWebSourceCards
            .map(
              (card, index) =>
                `${index + 1}. ${card.title} (${card.url}) - ${card.snippet}`,
            )
            .join('\n')}`
        : `You are Euangelion's biblical study assistant.\n\nRules:\n- Use only supplied local context (devotional + references).\n- If context is insufficient, say so plainly.\n- Keep responses substantial and practical (3-6 paragraphs).\n- Cite specific scripture references when relevant.\n\nContext:\n${contextPacket.prompt}`

    const generation = await generateWithBrain({
      system: systemPrompt,
      messages,
      context: {
        task:
          retrievalMode === 'open_web'
            ? 'chat_response_open_web'
            : 'chat_response',
        mode,
        userKeys,
        qualityFloor: brainFlags.qualityFloor,
        maxOutputTokens: 1600,
        platformKeysEnabled: !platformHalted,
      },
    })

    const responseTextBase =
      generation.output ||
      'I was not able to generate a response from current grounded context.'
    const responseText =
      retrievalMode === 'open_web'
        ? appendInlineSourceMarkers(responseTextBase, openWebSourceCards.length)
        : responseTextBase

    const citations = [
      ...sourceCardsToCitations(sourceCards),
      ...extractScriptureCitations(responseText),
    ]
      .filter(
        (citation, index, list) =>
          list.findIndex((entry) => entry.id === citation.id) === index,
      )
      .slice(0, MAX_CHAT_CITATIONS)

    const chargeToPlatform = generation.using === 'platform_key'
    const updatedSummary = await recordUsage({
      principalId,
      provider: generation.provider,
      mode: retrievalMode,
      inputTokens: generation.inputTokens,
      outputTokens: generation.outputTokens,
      costUsd: generation.estimatedCostUsd,
      isPremium: entitlements.premiumActive,
      chargeToPlatform,
    })

    console.info('[brain-router:chat]', {
      request_id: requestId,
      event: 'chat_response',
      provider: generation.provider,
      key_source: generation.using,
      retrieval_mode: retrievalMode,
      quota_state: updatedSummary.quota.state,
      estimated_cost_usd: generation.estimatedCostUsd,
      ip_hash: clientKey,
      path: requestPath,
      host: requestHost,
      timestamp: new Date().toISOString(),
    })

    const payload = {
      message: responseText,
      brainProvider: generation.provider,
      retrievalMode,
      citations,
      sourceCards,
      guardrails: {
        scope:
          retrievalMode === 'open_web'
            ? 'open-web-opt-in'
            : 'local-corpus-only',
        internetSearch: retrievalMode === 'open_web',
        retrievalMode,
        provider: generation.provider,
        devotionalSlug: devotionalSlug || null,
        hasHighlightedText: Boolean(highlightedText),
        hasDevotionalContext: contextPacket.hasDevotionalContext,
        hasReferenceContext: contextPacket.hasReferenceContext,
        sources: sourceCards.map((card) => card.url || card.title),
        openWebAcknowledged,
      },
      usage: {
        quotaState: updatedSummary.quota.state,
        platformBudgetRemainingUsd: updatedSummary.platformBudget.remainingUsd,
        chargedToPlatform: chargeToPlatform,
      },
    }

    if (body.stream === true) {
      const chunks = splitForStream(responseText)
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const encoder = new TextEncoder()
          controller.enqueue(
            encoder.encode(
              toSseFrame('meta', {
                event: 'meta',
                requestId,
                provider: generation.provider,
              }),
            ),
          )
          for (const chunk of chunks) {
            controller.enqueue(
              encoder.encode(
                toSseFrame('chunk', { event: 'chunk', delta: chunk }),
              ),
            )
          }
          controller.enqueue(
            encoder.encode(toSseFrame('final', { event: 'final', payload })),
          )
          controller.close()
        },
      })

      const response = new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Request-Id': requestId,
        },
      })
      return response
    }

    return withRequestIdHeaders(
      NextResponse.json(payload, { status: 200 }),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'chat',
      requestId,
      error,
      method: request.method,
      path: requestPath,
      clientKey,
    })

    return jsonError({
      error:
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.',
      status: 500,
      requestId,
    })
  }
}
