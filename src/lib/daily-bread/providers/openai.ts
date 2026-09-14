/**
 * Backup provider (founder: "Open AI is a backup"): OpenAI Chat Completions on
 * a near-free small model. Key: OPENAI_API_KEY (server/CI only), bearer header.
 * Model: DAILY_BREAD_OPENAI_MODEL, default below (chosen by a measured bake-off,
 * see docs/daily-bread/DAILY-BREAD-V2.md §5).
 *
 * The gpt-5 family and o-series are reasoning models: they take
 * max_completion_tokens (hidden reasoning is billed as output and counts
 * against it), accept only the default temperature, and take reasoning_effort.
 */
import { httpFailure, ProviderError, type TextProvider } from './types'

const API_URL = 'https://api.openai.com/v1/chat/completions'

/**
 * Bake-off 2026-09-13 (3 real editions each, frame + comic tasks, Claude off):
 *   gpt-5-nano    6/6 tasks valid, ~$0.0003–0.0005 per edition   ← chosen
 *   gpt-4o-mini   5/6 valid, ~$0.0005–0.0009
 *   gpt-4.1-nano  3/6 valid (comic vocabulary failures every time)
 *   gpt-5.4-nano  rejected reasoning_effort=minimal; higher list price
 */
export const DEFAULT_OPENAI_MODEL = 'gpt-5-nano'

/**
 * Standard per-1M-token list prices [input, output] in USD, from
 * developers.openai.com/api/docs/pricing (read 2026-09-13). Unknown models
 * report no cost estimate rather than a guessed one.
 */
export const OPENAI_PRICES: Record<string, [number, number]> = {
  'gpt-5-nano': [0.05, 0.4],
  'gpt-4.1-nano': [0.1, 0.4],
  'gpt-4o-mini': [0.15, 0.6],
  'gpt-5.4-nano': [0.2, 1.25],
  'gpt-5-mini': [0.25, 2.0],
  'gpt-4.1-mini': [0.4, 1.6],
  'gpt-5.4-mini': [0.75, 4.5],
}

export function isReasoningModel(model: string): boolean {
  return /^(gpt-5|o\d)/.test(model) && !/chat-latest/.test(model)
}

export function openAiCostUsd(model: string, inputTokens: number, outputTokens: number): number | undefined {
  const base = Object.keys(OPENAI_PRICES)
    .sort((a, b) => b.length - a.length)
    .find((m) => model === m || model.startsWith(`${m}-`))
  if (!base) return undefined
  const [inp, out] = OPENAI_PRICES[base]
  return Number(((inputTokens / 1e6) * inp + (outputTokens / 1e6) * out).toFixed(8))
}

export function createOpenAiProvider(
  options: {
    env?: Record<string, string | undefined>
    fetchImpl?: typeof fetch
    model?: string
  } = {},
): TextProvider {
  const env = options.env ?? process.env
  const fetchImpl = options.fetchImpl ?? fetch
  const model = options.model ?? env.DAILY_BREAD_OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL
  const key = () => (env.OPENAI_API_KEY ?? '').trim()
  const reasoning = isReasoningModel(model)

  return {
    id: 'openai',
    model,
    available: () => key().length > 0,
    async generate(request) {
      const apiKey = key()
      if (!apiKey) throw new ProviderError('openai: not configured', { retryable: false })
      const body = {
        model,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.prompt },
        ],
        ...(reasoning
          ? {
              // Headroom for hidden reasoning on top of the visible answer.
              max_completion_tokens: Math.max(4000, request.maxOutputTokens * 4),
              reasoning_effort: 'minimal',
            }
          : { max_tokens: request.maxOutputTokens, temperature: request.temperature ?? 0.6 }),
        ...(request.json ? { response_format: { type: 'json_object' } } : {}),
      }
      let response: Response
      try {
        response = await fetchImpl(API_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
          body: JSON.stringify(body),
          signal: request.signal,
        })
      } catch (error) {
        const aborted = (error as { name?: string })?.name === 'AbortError'
        throw new ProviderError(aborted ? 'openai: timed out' : 'openai: network error', {
          retryable: true,
        })
      }
      if (!response.ok) {
        throw await httpFailure('openai', response)
      }
      const payload = (await response.json()) as {
        model?: string
        choices?: { message?: { content?: string } }[]
        usage?: { prompt_tokens?: number; completion_tokens?: number }
      }
      const text = payload.choices?.[0]?.message?.content?.trim() ?? ''
      const inputTokens = payload.usage?.prompt_tokens
      const outputTokens = payload.usage?.completion_tokens
      return {
        text,
        model: payload.model ?? model,
        inputTokens,
        outputTokens,
        estimatedCostUsd:
          typeof inputTokens === 'number' && typeof outputTokens === 'number'
            ? openAiCostUsd(model, inputTokens, outputTokens)
            : undefined,
      }
    },
  }
}
