/**
 * brain/router.ts — multi-provider LLM routing layer.
 *
 * The single entry point is `generateWithBrain(request)`. It picks
 * a provider based on availability + the request's `mode`, calls
 * the provider's API, runs a quality gate on the output, and either
 * returns the result or falls through to the next provider. Result
 * shape is `ProviderExecutionResult` (provider, output, real token
 * counts, estimated cost, quality score).
 *
 * ## Provider order
 *
 * - `mode: 'auto'` (default) — uses
 *   `sortClaudeFirstThenCheapest(availableProviders)`. Claude is
 *   tried first because it's our quality anchor; subsequent
 *   providers are sorted by cost-rank with health bias (recent
 *   failures push a provider further down).
 * - `mode: 'openai' | 'google' | 'minimax' | 'nvidia_kimi'` —
 *   explicit single-provider mode; throws if that provider is
 *   currently unavailable.
 *
 * ## Provider availability
 *
 * `providerAvailabilityForUser` enumerates the four providers and
 * reports each as available / unavailable with a reason. High-cost
 * providers (MiniMax, NVIDIA Kimi) are gated to BYO-key under the
 * `allowHighCostOnPlatform` policy — anonymous users who haven't
 * supplied their own keys won't see those providers.
 *
 * ## Infrastructure layered in (overnight 2026-05-04)
 *
 * - **Anthropic prompt caching** — `BrainGenerationRequest` accepts
 *   an optional `cacheableUserPrefix` that gets emitted as a
 *   separate `cache_control: { type: 'ephemeral' }` block in front
 *   of the first user message. Other providers see the prefix
 *   transparently concatenated. See `buildAnthropicFirstUserContent`.
 * - **Real token counting** — every provider call returns
 *   `{ text, usage? }` where usage carries real input/output token
 *   counts when the provider includes them. `executeProvider`
 *   prefers real usage; falls back to `estimateInputTokens` /
 *   `estimateOutputTokens` when usage is absent.
 * - **Anthropic 429/5xx retry** — `callAnthropic` retries up to 3
 *   attempts with exponential backoff (1s, 2s) or `Retry-After`
 *   header, whichever is longer. 4xx-other-than-429 bubbles up
 *   immediately so the fallback chain takes over fast.
 * - **AbortController plumbing** — `BrainRouteContext.signal` is
 *   forwarded to every provider's underlying `fetch()` so
 *   route-level wall-clock deadlines (see
 *   `src/lib/api-security.ts:withAbortDeadline`) actually cancel
 *   the in-flight request.
 *
 * ## In-memory provider health
 *
 * `providerHealth` is a per-isolate Map of recent
 * success/failure/latency stats. Used by
 * `sortClaudeFirstThenCheapest` to bias cheaper providers down
 * when they're misbehaving. NOT persisted across isolate restarts —
 * the master plan flagged Cloudflare KV persistence as a P0 item
 * but it's still pending (forbidden by anti-sprawl until a new
 * binding is approved).
 *
 * ## Quality gate
 *
 * `qualityScore(text)` returns a 0..1 score from length, scripture
 * reference presence, and paragraph count. `request.context.qualityFloor`
 * sets the threshold below which the result is rejected and the
 * next provider tried. Default floor varies by task; composer.ts
 * uses 0.6.
 */

import {
  estimateCostUsd,
  type BillingEngine,
  estimateInputTokens,
  estimateOutputTokens,
  providerBaseCostRank,
} from './cost'
import { brainFlags } from './flags'
import {
  healthStoreEnabled,
  loadProviderHealth,
  persistProviderHealth,
  type ProviderHealthSnapshot,
} from './health-store'
import type {
  BrainProviderId,
  BrainRouteContext,
  ProviderAvailability,
  ProviderExecutionResult,
} from './types'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const GOOGLE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const MINIMAX_API_URL =
  process.env.MINIMAX_API_URL ||
  'https://api.minimax.chat/v1/text/chatcompletion_v2'
const NVIDIA_API_URL =
  process.env.NVIDIA_KIMI_API_URL ||
  'https://integrate.api.nvidia.com/v1/chat/completions'

const OPENAI_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-5-nano'
const ANTHROPIC_MODEL = process.env.ANTHROPIC_CHAT_MODEL || 'claude-sonnet-4-6'
const GOOGLE_MODEL = process.env.GOOGLE_CHAT_MODEL || 'gemini-2.0-flash-lite'
const MINIMAX_MODEL = process.env.MINIMAX_CHAT_MODEL || 'MiniMax-M2'
const NVIDIA_MODEL =
  process.env.NVIDIA_KIMI_MODEL || 'moonshotai/kimi-k2-instruct-0905'

type ProviderHealthState = {
  successes: number
  failures: number
  avgLatencyMs: number
}

const providerHealth = new Map<
  Exclude<BrainProviderId, 'auto'>,
  ProviderHealthState
>()

/**
 * One-time hydration from KV. Only fires on the first
 * generateWithBrain call per isolate and only when the KV-backed
 * health store is enabled. Failure is silent — we keep the empty
 * in-memory map.
 */
let healthHydrated = false
let healthHydrationPromise: Promise<void> | null = null
async function ensureHealthHydrated(): Promise<void> {
  if (healthHydrated || !healthStoreEnabled()) {
    healthHydrated = true
    return
  }
  if (healthHydrationPromise) return healthHydrationPromise
  healthHydrationPromise = (async () => {
    const snapshot = await loadProviderHealth()
    if (snapshot) {
      for (const [provider, state] of Object.entries(snapshot)) {
        providerHealth.set(provider as Exclude<BrainProviderId, 'auto'>, state)
      }
    }
    healthHydrated = true
  })()
  return healthHydrationPromise
}

/**
 * Throttled write-through to KV. We persist at most once every
 * `HEALTH_PERSIST_THROTTLE_MS` per isolate so we don't burn KV ops
 * (~1 write per LLM call would be wasteful). On-disk precision
 * lags by at most this interval — acceptable for a routing-bias
 * heuristic.
 */
const HEALTH_PERSIST_THROTTLE_MS = 30_000
let lastHealthPersistAt = 0
function maybePersistHealth(): void {
  if (!healthStoreEnabled()) return
  const now = Date.now()
  if (now - lastHealthPersistAt < HEALTH_PERSIST_THROTTLE_MS) return
  lastHealthPersistAt = now
  // Convert Map → snapshot object for storage
  const snapshot: Partial<ProviderHealthSnapshot> = {}
  for (const [provider, state] of providerHealth.entries()) {
    snapshot[provider] = state
  }
  // Fire-and-forget; failures are silent inside the helper
  void persistProviderHealth(snapshot as ProviderHealthSnapshot)
}

export type BrainMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type BrainGenerationRequest = {
  system: string
  messages: BrainMessage[]
  context: BrainRouteContext
  /**
   * Anthropic-only prompt-cache hint. When provided, this prefix is sent
   * as a separate cacheable content block IN FRONT of the first
   * user-role message (Anthropic's `cache_control: { type: 'ephemeral' }`).
   *
   * For other providers, the prefix is silently concatenated in front of
   * the first user message's `content` so they receive identical
   * semantic input. Size threshold for the cache breakpoint is enforced
   * inside `callAnthropic`; below threshold the prefix is concatenated
   * as if for any other provider.
   */
  cacheableUserPrefix?: string
}

/**
 * Anthropic prompt-caching minimum is ~1024 tokens (Sonnet) / 2048 (Haiku).
 * 4096 chars ≈ 1024 tokens for English prose; we use that as the threshold
 * below which we won't bother emitting a cache_control breakpoint.
 */
const ANTHROPIC_CACHE_MIN_CHARS = 4096

/**
 * Real usage stats from a provider response. When undefined, the caller
 * falls back to estimateInputTokens/estimateOutputTokens.
 */
type ProviderUsage = {
  inputTokens: number
  outputTokens: number
  /** Anthropic-only: tokens written into the prompt cache this call. */
  cacheCreatedTokens?: number
  /** Anthropic-only: tokens read out of the prompt cache this call. */
  cacheReadTokens?: number
}

type ProviderCallResult = {
  text: string
  usage?: ProviderUsage
}

/**
 * Retry policy for Anthropic 429 (rate-limited) and 5xx (server-side
 * transient) responses. Capped at MAX_ATTEMPTS total tries (1 initial +
 * 2 retries) with exponential backoff (1s, 2s). When the server returns
 * a `Retry-After` header, the value (in seconds) overrides the
 * exponential schedule.
 *
 * The fallback chain in `generateWithBrain` continues to take over when
 * all attempts fail — the retry loop is purely an inline buffer for
 * transient failures.
 */
const ANTHROPIC_RETRY_MAX_ATTEMPTS = 3
const ANTHROPIC_RETRY_BASE_BACKOFF_MS = 1000
const ANTHROPIC_RETRYABLE_STATUS = (status: number): boolean =>
  status === 429 || (status >= 500 && status < 600)

function parseRetryAfterMs(headerValue: string | null): number | null {
  if (!headerValue) return null
  const trimmed = headerValue.trim()
  if (!trimmed) return null
  // RFC 7231: Retry-After can be a delta-seconds integer or an HTTP-date.
  // Most providers send seconds; HTTP-date is rare. Be defensive.
  const seconds = Number(trimmed)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, 30_000)
  }
  const date = Date.parse(trimmed)
  if (!Number.isNaN(date)) {
    return Math.max(0, Math.min(date - Date.now(), 30_000))
  }
  return null
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return
  await new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function normalizeProviderMode(mode: BrainProviderId): BrainProviderId {
  if (
    mode === 'openai' ||
    mode === 'google' ||
    mode === 'minimax' ||
    mode === 'nvidia_kimi'
  ) {
    return mode
  }
  return 'auto'
}

function qualityScore(text: string, minLength = 220): number {
  const normalized = text.trim()
  if (!normalized) return 0
  const lengthScore = Math.min(1, normalized.length / minLength)
  const scriptureRefPattern =
    /\b(?:[1-3]\s)?[A-Z][a-z]+\s\d{1,3}:\d{1,3}(?:-\d{1,3})?\b/
  const scriptureScore = scriptureRefPattern.test(normalized) ? 0.2 : 0
  const paragraphScore = normalized.split(/\n{2,}/).length >= 2 ? 0.2 : 0
  return Math.max(
    0,
    Math.min(
      1,
      Number((lengthScore * 0.6 + paragraphScore + scriptureScore).toFixed(3)),
    ),
  )
}

type ProviderCredentials = {
  platformKey?: string
  userKey?: string
}

/** Return the first non-empty env var value, or undefined. */
function firstNonEmptyEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value && value.length > 0) return value
  }
  return undefined
}

function providerCredentials(
  provider: Exclude<BrainProviderId, 'auto'>,
  userKeys?: Partial<Record<Exclude<BrainProviderId, 'auto'>, string>>,
): ProviderCredentials {
  switch (provider) {
    case 'openai':
      return {
        platformKey: firstNonEmptyEnv('ANTHROPIC_API_KEY', 'OPENAI_API_KEY'),
        userKey: userKeys?.openai,
      }
    case 'google':
      return {
        platformKey: firstNonEmptyEnv('GOOGLE_API_KEY', 'GEMINI_API_KEY'),
        userKey: userKeys?.google,
      }
    case 'minimax':
      return {
        platformKey: firstNonEmptyEnv('MINIMAX_API_KEY'),
        userKey: userKeys?.minimax,
      }
    case 'nvidia_kimi':
      return {
        platformKey: firstNonEmptyEnv('NVIDIA_KIMI_API_KEY'),
        userKey: userKeys?.nvidia_kimi,
      }
  }
}

function resolvedApiKey(credentials: ProviderCredentials): {
  key: string | null
  using: 'platform_key' | 'byo_key' | 'unavailable'
} {
  if (credentials.userKey && credentials.userKey.trim().length > 0) {
    return { key: credentials.userKey.trim(), using: 'byo_key' }
  }
  if (credentials.platformKey && credentials.platformKey.trim().length > 0) {
    return { key: credentials.platformKey.trim(), using: 'platform_key' }
  }
  return { key: null, using: 'unavailable' }
}

export function providerAvailabilityForUser(params: {
  userKeys?: Partial<Record<Exclude<BrainProviderId, 'auto'>, string>>
  allowHighCostOnPlatform?: boolean
  platformKeysEnabled?: boolean
}): ProviderAvailability[] {
  const allowHighCostOnPlatform = params.allowHighCostOnPlatform === true
  const platformKeysEnabled = params.platformKeysEnabled !== false
  const providerOrder: Array<Exclude<BrainProviderId, 'auto'>> = [
    'openai',
    'google',
    'minimax',
    'nvidia_kimi',
  ]

  return providerOrder.map((provider) => {
    const credentials = providerCredentials(provider, params.userKeys)
    const resolved = resolvedApiKey(credentials)

    if (resolved.using === 'byo_key') {
      return {
        provider,
        available: true,
        using: 'byo_key',
      }
    }

    // Keep platform-funded routing low-cost first.
    const highCostProvider =
      provider === 'minimax' || provider === 'nvidia_kimi'
    if (highCostProvider && !allowHighCostOnPlatform) {
      if (resolved.using === 'platform_key') {
        return {
          provider,
          available: false,
          using: 'unavailable',
          reason: 'Available with BYO key only under low-cost platform policy.',
        }
      }

      return {
        provider,
        available: false,
        using: 'unavailable',
        reason: 'BYO key required.',
      }
    }

    if (!resolved.key) {
      return {
        provider,
        available: false,
        using: 'unavailable',
        reason: 'No API key configured.',
      }
    }

    if (!platformKeysEnabled && resolved.using === 'platform_key') {
      return {
        provider,
        available: false,
        using: 'unavailable',
        reason: 'Platform-funded routing is currently halted.',
      }
    }

    return {
      provider,
      available: true,
      using: resolved.using,
    }
  })
}

function isAnthropicKey(value: string): boolean {
  return value.startsWith('sk-ant-')
}

function sortByCheapest(
  providers: Array<Exclude<BrainProviderId, 'auto'>>,
): Array<Exclude<BrainProviderId, 'auto'>> {
  return [...providers].sort(
    (a, b) => providerBaseCostRank(a) - providerBaseCostRank(b),
  )
}

function sortClaudeFirstThenCheapest(
  providers: Array<Exclude<BrainProviderId, 'auto'>>,
): Array<Exclude<BrainProviderId, 'auto'>> {
  const unique = Array.from(new Set(providers))
  const hasClaude = unique.includes('openai')
  const rest = unique.filter((provider) => provider !== 'openai')
  const cheapestRest = sortByCheapest(rest).sort((a, b) => {
    const aHealth = providerHealth.get(a)
    const bHealth = providerHealth.get(b)
    const aFailureRatio = aHealth
      ? aHealth.failures / Math.max(1, aHealth.successes + aHealth.failures)
      : 0
    const bFailureRatio = bHealth
      ? bHealth.failures / Math.max(1, bHealth.successes + bHealth.failures)
      : 0
    const aLatency = aHealth?.avgLatencyMs || 0
    const bLatency = bHealth?.avgLatencyMs || 0

    const aScore =
      aFailureRatio * 4 + aLatency / 4000 + providerBaseCostRank(a) / 10
    const bScore =
      bFailureRatio * 4 + bLatency / 4000 + providerBaseCostRank(b) / 10
    return aScore - bScore
  })
  return hasClaude ? ['openai', ...cheapestRest] : cheapestRest
}

function recordProviderHealth(params: {
  provider: Exclude<BrainProviderId, 'auto'>
  success: boolean
  latencyMs: number
}) {
  const current = providerHealth.get(params.provider) || {
    successes: 0,
    failures: 0,
    avgLatencyMs: 0,
  }
  const total = current.successes + current.failures
  const nextLatency =
    total === 0
      ? params.latencyMs
      : Math.round(
          (current.avgLatencyMs * total + params.latencyMs) / (total + 1),
        )
  providerHealth.set(params.provider, {
    successes: current.successes + (params.success ? 1 : 0),
    failures: current.failures + (params.success ? 0 : 1),
    avgLatencyMs: nextLatency,
  })
  // Throttled fire-and-forget write to KV. Never throws.
  maybePersistHealth()
}

async function callOpenAI(params: {
  apiKey: string
  system: string
  messages: BrainMessage[]
  maxOutputTokens: number
  signal?: AbortSignal
}): Promise<ProviderCallResult> {
  const tokenField =
    OPENAI_MODEL.startsWith('gpt-5') || OPENAI_MODEL.startsWith('o')
      ? { max_completion_tokens: params.maxOutputTokens }
      : { max_tokens: params.maxOutputTokens }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: params.system },
        ...params.messages,
      ],
      ...tokenField,
    }),
    signal: params.signal,
  })

  if (!response.ok) {
    const payload = await response.text().catch(() => '')
    throw new Error(
      `OpenAI request failed (${response.status}): ${payload.slice(0, 240)}`,
    )
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const text = payload.choices?.[0]?.message?.content?.trim() || ''
  const usage =
    typeof payload.usage?.prompt_tokens === 'number' &&
    typeof payload.usage?.completion_tokens === 'number'
      ? {
          inputTokens: payload.usage.prompt_tokens,
          outputTokens: payload.usage.completion_tokens,
        }
      : undefined
  return { text, usage }
}

type AnthropicTextBlock = {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

type AnthropicMessage = {
  role: 'user' | 'assistant'
  content: string | AnthropicTextBlock[]
}

/**
 * Build the Anthropic `system` field. Returns a string when caching is not
 * worthwhile, or a [text-block] array with `cache_control` when the system
 * prompt is large enough to clear the prompt-cache minimum.
 */
function buildAnthropicSystem(system: string): string | AnthropicTextBlock[] {
  if (system.length < ANTHROPIC_CACHE_MIN_CHARS) return system
  return [
    {
      type: 'text',
      text: system,
      cache_control: { type: 'ephemeral' },
    },
  ]
}

/**
 * Build Anthropic message content for the FIRST user message. When a
 * cacheableUserPrefix is provided AND large enough, the prefix is sent
 * as a separate cached block followed by the dynamic content. Otherwise
 * the prefix is concatenated and the message stays a plain string.
 */
function buildAnthropicFirstUserContent(
  message: BrainMessage,
  cacheableUserPrefix: string | undefined,
): string | AnthropicTextBlock[] {
  if (!cacheableUserPrefix) return message.content
  if (cacheableUserPrefix.length < ANTHROPIC_CACHE_MIN_CHARS) {
    return `${cacheableUserPrefix}\n\n${message.content}`
  }
  return [
    {
      type: 'text',
      text: cacheableUserPrefix,
      cache_control: { type: 'ephemeral' },
    },
    {
      type: 'text',
      text: message.content,
    },
  ]
}

async function callAnthropic(params: {
  apiKey: string
  system: string
  messages: BrainMessage[]
  maxOutputTokens: number
  cacheableUserPrefix?: string
  signal?: AbortSignal
  model?: string
}): Promise<ProviderCallResult> {
  // Find the index of the first user message — the cacheable prefix
  // attaches there. If there is no user message (rare), the prefix is
  // inert.
  const firstUserIndex = params.messages.findIndex((m) => m.role === 'user')
  const messages: AnthropicMessage[] = params.messages.map((message, idx) => {
    if (idx === firstUserIndex) {
      return {
        role: message.role,
        content: buildAnthropicFirstUserContent(
          message,
          params.cacheableUserPrefix,
        ),
      }
    }
    return { role: message.role, content: message.content }
  })

  const requestBody = JSON.stringify({
    model: params.model || ANTHROPIC_MODEL,
    system: buildAnthropicSystem(params.system),
    max_tokens: params.maxOutputTokens,
    messages,
  })

  // Retry loop for 429 (rate-limited) and 5xx (server-side transient).
  // Non-retriable failures (4xx other than 429, network throws) bubble
  // up immediately so the fallback chain can take over.
  let lastError: unknown = null
  let response: Response | null = null
  for (let attempt = 1; attempt <= ANTHROPIC_RETRY_MAX_ATTEMPTS; attempt++) {
    response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': params.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: requestBody,
      signal: params.signal,
    })

    if (response.ok) break

    if (!ANTHROPIC_RETRYABLE_STATUS(response.status)) {
      const payload = await response.text().catch(() => '')
      throw new Error(
        `Anthropic request failed (${response.status}): ${payload.slice(0, 240)}`,
      )
    }

    // Retriable. If this was the last attempt, throw with the status.
    if (attempt === ANTHROPIC_RETRY_MAX_ATTEMPTS) {
      const payload = await response.text().catch(() => '')
      lastError = new Error(
        `Anthropic request failed after ${attempt} attempts (${response.status}): ${payload.slice(0, 240)}`,
      )
      break
    }

    // Sleep then retry. Honor Retry-After header when present.
    const retryAfterMs = parseRetryAfterMs(response.headers.get('Retry-After'))
    const backoffMs =
      retryAfterMs ?? ANTHROPIC_RETRY_BASE_BACKOFF_MS * Math.pow(2, attempt - 1)
    console.info(
      `[anthropic-retry] status=${response.status} attempt=${attempt} backoff_ms=${backoffMs}`,
    )
    await sleep(backoffMs)
  }

  if (lastError) throw lastError
  if (!response || !response.ok) {
    throw new Error('Anthropic request failed: no successful response')
  }

  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>
    usage?: {
      input_tokens?: number
      output_tokens?: number
      cache_creation_input_tokens?: number
      cache_read_input_tokens?: number
    }
  }

  const text = (payload.content || [])
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text?.trim() || '')
    .join('\n')
    .trim()

  // Surface cache hit/creation stats so we can observe whether prompt
  // caching is actually firing in production. Stays under the same
  // [composer] log namespace as related observability.
  let usage: ProviderUsage | undefined
  if (payload.usage) {
    const created = payload.usage.cache_creation_input_tokens ?? 0
    const readFromCache = payload.usage.cache_read_input_tokens ?? 0
    const input = payload.usage.input_tokens ?? 0
    const output = payload.usage.output_tokens ?? 0
    usage = {
      inputTokens: input,
      outputTokens: output,
      cacheCreatedTokens: created,
      cacheReadTokens: readFromCache,
    }
    if (created > 0 || readFromCache > 0) {
      console.info(
        `[anthropic-cache] input=${input} output=${output} cache_created=${created} cache_read=${readFromCache}`,
      )
    }
  }

  return { text, usage }
}

async function callGoogle(params: {
  apiKey: string
  system: string
  messages: BrainMessage[]
  maxOutputTokens: number
  signal?: AbortSignal
}): Promise<ProviderCallResult> {
  const response = await fetch(
    `${GOOGLE_API_URL}/${GOOGLE_MODEL}:generateContent?key=${encodeURIComponent(params.apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          role: 'system',
          parts: [{ text: params.system }],
        },
        contents: params.messages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          maxOutputTokens: params.maxOutputTokens,
        },
      }),
      signal: params.signal,
    },
  )

  if (!response.ok) {
    const payload = await response.text().catch(() => '')
    throw new Error(
      `Google request failed (${response.status}): ${payload.slice(0, 240)}`,
    )
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    usageMetadata?: {
      promptTokenCount?: number
      candidatesTokenCount?: number
    }
  }

  const text =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('\n')
      .trim() || ''
  const usage =
    typeof payload.usageMetadata?.promptTokenCount === 'number' &&
    typeof payload.usageMetadata?.candidatesTokenCount === 'number'
      ? {
          inputTokens: payload.usageMetadata.promptTokenCount,
          outputTokens: payload.usageMetadata.candidatesTokenCount,
        }
      : undefined
  return { text, usage }
}

async function callOpenAiCompatible(params: {
  apiUrl: string
  apiKey: string
  model: string
  system: string
  messages: BrainMessage[]
  maxOutputTokens: number
  signal?: AbortSignal
}): Promise<ProviderCallResult> {
  const response = await fetch(params.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: 'system', content: params.system },
        ...params.messages,
      ],
      max_tokens: params.maxOutputTokens,
    }),
    signal: params.signal,
  })

  if (!response.ok) {
    const payload = await response.text().catch(() => '')
    throw new Error(
      `Provider request failed (${response.status}): ${payload.slice(0, 240)}`,
    )
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    reply?: string
    output_text?: string
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }

  const text =
    payload.choices?.[0]?.message?.content?.trim() ||
    payload.reply?.trim() ||
    payload.output_text?.trim() ||
    ''
  const usage =
    typeof payload.usage?.prompt_tokens === 'number' &&
    typeof payload.usage?.completion_tokens === 'number'
      ? {
          inputTokens: payload.usage.prompt_tokens,
          outputTokens: payload.usage.completion_tokens,
        }
      : undefined
  return { text, usage }
}

/**
 * For non-Anthropic providers, the cacheable user prefix is silently
 * concatenated in front of the first user message so the semantic input
 * stays identical across providers.
 */
function concatCacheablePrefixIntoFirstUser(
  messages: BrainMessage[],
  cacheableUserPrefix: string | undefined,
): BrainMessage[] {
  if (!cacheableUserPrefix) return messages
  const firstUserIndex = messages.findIndex((m) => m.role === 'user')
  if (firstUserIndex === -1) return messages
  return messages.map((message, idx) =>
    idx === firstUserIndex
      ? { ...message, content: `${cacheableUserPrefix}\n\n${message.content}` }
      : message,
  )
}

async function executeProvider(params: {
  provider: Exclude<BrainProviderId, 'auto'>
  apiKey: string
  using: 'platform_key' | 'byo_key'
  request: BrainGenerationRequest
}): Promise<ProviderExecutionResult> {
  const maxOutputTokens = params.request.context.maxOutputTokens || 1200
  let result: ProviderCallResult = { text: '' }

  // For non-Anthropic providers we collapse cacheableUserPrefix into the
  // first user message so the prompt is byte-identical to what Anthropic
  // would have seen. (callAnthropic itself separates the prefix back out
  // when emitting the structured content with cache_control.)
  const collapsedMessages = concatCacheablePrefixIntoFirstUser(
    params.request.messages,
    params.request.cacheableUserPrefix,
  )

  const signal = params.request.context.signal
  // Billing follows the ENGINE, not the routing slot. The `openai` slot serves
  // Claude whenever the resolved key is an Anthropic one (platform key today,
  // and a BYO `sk-ant-` key once BYOK ships), so the slot id is not a price.
  let billedAs: BillingEngine = params.provider
  if (params.provider === 'openai') {
    const anthropicKey = isAnthropicKey(params.apiKey)
    if (anthropicKey) billedAs = 'anthropic'
    result = anthropicKey
      ? await callAnthropic({
          apiKey: params.apiKey,
          system: params.request.system,
          messages: params.request.messages,
          maxOutputTokens,
          cacheableUserPrefix: params.request.cacheableUserPrefix,
          signal,
          model: params.request.context.modelOverride,
        })
      : await callOpenAI({
          apiKey: params.apiKey,
          system: params.request.system,
          messages: collapsedMessages,
          maxOutputTokens,
          signal,
        })
  } else if (params.provider === 'google') {
    result = await callGoogle({
      apiKey: params.apiKey,
      system: params.request.system,
      messages: collapsedMessages,
      maxOutputTokens,
      signal,
    })
  } else if (params.provider === 'minimax') {
    result = await callOpenAiCompatible({
      apiUrl: MINIMAX_API_URL,
      apiKey: params.apiKey,
      model: MINIMAX_MODEL,
      system: params.request.system,
      messages: collapsedMessages,
      maxOutputTokens,
      signal,
    })
  } else {
    result = await callOpenAiCompatible({
      apiUrl: NVIDIA_API_URL,
      apiKey: params.apiKey,
      model: NVIDIA_MODEL,
      system: params.request.system,
      messages: collapsedMessages,
      maxOutputTokens,
      signal,
    })
  }

  const output = result.text
  // Prefer real usage stats from the provider response. Fall back to the
  // 1.5×-words estimate when the provider doesn't return usage (e.g. some
  // OpenAI-compatible endpoints omit it on streaming or older models).
  let inputTokens: number
  let outputTokens: number
  if (result.usage) {
    inputTokens = result.usage.inputTokens
    outputTokens = result.usage.outputTokens
  } else {
    const messageConcat = [
      params.request.system,
      ...collapsedMessages.map((message) => message.content),
    ].join('\n')
    inputTokens = estimateInputTokens(messageConcat)
    outputTokens = estimateOutputTokens(output)
  }
  const estimatedCostUsd = estimateCostUsd({
    engine: billedAs,
    inputTokens,
    outputTokens,
  })

  return {
    provider: params.provider,
    output,
    inputTokens,
    outputTokens,
    estimatedCostUsd,
    qualityScore: qualityScore(output),
    using: params.using,
  }
}

export async function generateWithBrain(
  request: BrainGenerationRequest,
): Promise<ProviderExecutionResult> {
  // Lazy hydrate per-isolate health from KV when the feature flag is
  // on. No-op when off. Awaiting it is cheap on subsequent calls
  // (just a boolean check).
  await ensureHealthHydrated()

  const mode = normalizeProviderMode(request.context.mode)
  const qualityFloor =
    typeof request.context.qualityFloor === 'number'
      ? request.context.qualityFloor
      : brainFlags.qualityFloor

  const availability = providerAvailabilityForUser({
    userKeys: request.context.userKeys,
    platformKeysEnabled: request.context.platformKeysEnabled,
  })

  let providerOrder: Array<Exclude<BrainProviderId, 'auto'>>
  if (mode === 'auto') {
    providerOrder = sortClaudeFirstThenCheapest(
      availability
        .filter((entry) => entry.available)
        .map((entry) => entry.provider),
    )
  } else {
    const forced = availability.find((entry) => entry.provider === mode)
    if (!forced || !forced.available) {
      throw new Error(
        forced?.reason || 'Selected brain is currently unavailable.',
      )
    }
    providerOrder = [mode]
  }

  if (providerOrder.length === 0) {
    throw new Error('No available brain providers configured.')
  }

  let firstError: Error | null = null
  for (const provider of providerOrder) {
    const credentials = providerCredentials(provider, request.context.userKeys)
    const resolved = resolvedApiKey(credentials)
    if (!resolved.key) continue
    const startedAt = Date.now()

    try {
      const result = await executeProvider({
        provider,
        apiKey: resolved.key,
        using: resolved.using === 'byo_key' ? 'byo_key' : 'platform_key',
        request,
      })

      if (result.qualityScore < qualityFloor && mode === 'auto') {
        recordProviderHealth({
          provider,
          success: false,
          latencyMs: Date.now() - startedAt,
        })
        continue
      }

      recordProviderHealth({
        provider,
        success: true,
        latencyMs: Date.now() - startedAt,
      })

      return result
    } catch (error) {
      recordProviderHealth({
        provider,
        success: false,
        latencyMs: Date.now() - startedAt,
      })
      if (!firstError && error instanceof Error) {
        firstError = error
      }
      if (mode !== 'auto') {
        throw error
      }
    }
  }

  throw (
    firstError || new Error('All brain providers failed quality/call checks.')
  )
}

export function openWebConfigured(): boolean {
  return Boolean(process.env.OPEN_WEB_SEARCH_API_URL)
}

export async function runOpenWebSearch(params: { query: string }): Promise<
  Array<{
    title: string
    url: string
    snippet: string
    publisher?: string
    date?: string
  }>
> {
  const endpoint = process.env.OPEN_WEB_SEARCH_API_URL
  if (!endpoint) return []

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.OPEN_WEB_SEARCH_API_KEY
        ? { Authorization: `Bearer ${process.env.OPEN_WEB_SEARCH_API_KEY}` }
        : {}),
    },
    body: JSON.stringify({
      query: params.query,
      limit: 6,
    }),
  })

  if (!response.ok) return []

  const payload = (await response.json()) as {
    results?: Array<{
      title?: string
      url?: string
      snippet?: string
      publisher?: string
      date?: string
    }>
  }

  return (payload.results || [])
    .map((item) => ({
      title: (item.title || '').trim(),
      url: (item.url || '').trim(),
      snippet: (item.snippet || '').trim(),
      publisher: item.publisher?.trim() || undefined,
      date: item.date?.trim() || undefined,
    }))
    .filter((item) => item.title && item.url && item.snippet)
    .slice(0, 6)
}
