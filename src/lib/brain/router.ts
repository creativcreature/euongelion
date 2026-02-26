import {
  estimateCostUsd,
  estimateInputTokens,
  estimateOutputTokens,
  providerBaseCostRank,
} from './cost'
import { brainFlags } from './flags'
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

export type BrainMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type BrainGenerationRequest = {
  system: string
  messages: BrainMessage[]
  context: BrainRouteContext
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
}

async function callOpenAI(params: {
  apiKey: string
  system: string
  messages: BrainMessage[]
  maxOutputTokens: number
}): Promise<string> {
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
      max_tokens: params.maxOutputTokens,
    }),
  })

  if (!response.ok) {
    const payload = await response.text().catch(() => '')
    throw new Error(
      `OpenAI request failed (${response.status}): ${payload.slice(0, 240)}`,
    )
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return payload.choices?.[0]?.message?.content?.trim() || ''
}

async function callAnthropic(params: {
  apiKey: string
  system: string
  messages: BrainMessage[]
  maxOutputTokens: number
}): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': params.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      system: params.system,
      max_tokens: params.maxOutputTokens,
      messages: params.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    }),
  })

  if (!response.ok) {
    const payload = await response.text().catch(() => '')
    throw new Error(
      `Anthropic request failed (${response.status}): ${payload.slice(0, 240)}`,
    )
  }

  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>
  }
  const text = (payload.content || [])
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text?.trim() || '')
    .join('\n')
    .trim()
  return text
}

async function callGoogle(params: {
  apiKey: string
  system: string
  messages: BrainMessage[]
  maxOutputTokens: number
}): Promise<string> {
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
  }

  const text =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('\n')
      .trim() || ''
  return text
}

async function callOpenAiCompatible(params: {
  apiUrl: string
  apiKey: string
  model: string
  system: string
  messages: BrainMessage[]
  maxOutputTokens: number
}): Promise<string> {
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
  }

  return (
    payload.choices?.[0]?.message?.content?.trim() ||
    payload.reply?.trim() ||
    payload.output_text?.trim() ||
    ''
  )
}

async function executeProvider(params: {
  provider: Exclude<BrainProviderId, 'auto'>
  apiKey: string
  using: 'platform_key' | 'byo_key'
  request: BrainGenerationRequest
}): Promise<ProviderExecutionResult> {
  const maxOutputTokens = params.request.context.maxOutputTokens || 1200
  let output = ''

  if (params.provider === 'openai') {
    output = isAnthropicKey(params.apiKey)
      ? await callAnthropic({
          apiKey: params.apiKey,
          system: params.request.system,
          messages: params.request.messages,
          maxOutputTokens,
        })
      : await callOpenAI({
          apiKey: params.apiKey,
          system: params.request.system,
          messages: params.request.messages,
          maxOutputTokens,
        })
  } else if (params.provider === 'google') {
    output = await callGoogle({
      apiKey: params.apiKey,
      system: params.request.system,
      messages: params.request.messages,
      maxOutputTokens,
    })
  } else if (params.provider === 'minimax') {
    output = await callOpenAiCompatible({
      apiUrl: MINIMAX_API_URL,
      apiKey: params.apiKey,
      model: MINIMAX_MODEL,
      system: params.request.system,
      messages: params.request.messages,
      maxOutputTokens,
    })
  } else {
    output = await callOpenAiCompatible({
      apiUrl: NVIDIA_API_URL,
      apiKey: params.apiKey,
      model: NVIDIA_MODEL,
      system: params.request.system,
      messages: params.request.messages,
      maxOutputTokens,
    })
  }

  const messageConcat = [
    params.request.system,
    ...params.request.messages.map((message) => message.content),
  ].join('\n')
  const inputTokens = estimateInputTokens(messageConcat)
  const outputTokens = estimateOutputTokens(output)
  const estimatedCostUsd = estimateCostUsd({
    provider: params.provider,
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
