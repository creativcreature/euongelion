// Deno stand-in for '@/lib/brain/router' (mapped via deno.json imports).
//
// The full brain router carries multi-provider routing, KV health hydration,
// quality scoring, and Workers-specific concerns the Edge function doesn't
// need (and whose import tree doesn't bundle cleanly under Deno). Generation
// here is Anthropic-only by decision (SA-020: Sonnet weave), so this shim
// implements the one function the grounded weave consumes — same signature,
// direct https://api.anthropic.com call, honest errors (no silent fallback).

interface BrainMessage {
  role: 'user' | 'assistant'
  content: string
}

interface BrainRequest {
  system: string
  messages: BrainMessage[]
  context: {
    task: string
    mode: string
    maxOutputTokens?: number
    modelOverride?: string
    platformKeysEnabled?: boolean
    qualityFloor?: number
    signal?: AbortSignal
  }
}

interface BrainResult {
  provider: string
  output: string
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
  qualityScore: number
  using: string
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-4-6'
const MAX_RETRIES = 2

export async function generateWithBrain(
  request: BrainRequest,
): Promise<BrainResult> {
  const apiKey = (globalThis as { process?: { env: Record<string, string> } })
    .process?.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured for the Edge runtime')
  }

  const model = request.context.modelOverride || DEFAULT_MODEL
  const body = JSON.stringify({
    model,
    max_tokens: request.context.maxOutputTokens ?? 2600,
    system: request.system,
    messages: request.messages,
  })

  let lastError: Error | null = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        signal: request.context.signal,
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body,
      })
      const json = (await res.json()) as {
        content?: Array<{ type: string; text?: string }>
        usage?: { input_tokens?: number; output_tokens?: number }
        error?: { type?: string; message?: string }
      }
      if (!res.ok) {
        const msg = json.error?.message || `Anthropic HTTP ${res.status}`
        // Retry transient statuses; surface everything else immediately.
        if ([429, 500, 529].includes(res.status) && attempt < MAX_RETRIES) {
          lastError = new Error(msg)
          await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)))
          continue
        }
        throw new Error(msg)
      }
      const output = (json.content ?? [])
        .map((c) => c.text ?? '')
        .join('')
        .trim()
      if (!output) throw new Error('Anthropic returned empty output')
      const inputTokens = json.usage?.input_tokens ?? 0
      const outputTokens = json.usage?.output_tokens ?? 0
      return {
        provider: 'openai', // historical label the router uses for Anthropic-keyed calls
        output,
        inputTokens,
        outputTokens,
        // Sonnet 4.6 pricing ($3/$15 per MTok) for the usage ledger's benefit.
        estimatedCostUsd: (inputTokens * 3 + outputTokens * 15) / 1e6,
        qualityScore: 1,
        using: 'platform_key',
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt >= MAX_RETRIES) break
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)))
    }
  }
  throw lastError ?? new Error('Anthropic call failed')
}
