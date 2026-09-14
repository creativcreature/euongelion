/**
 * Secondary provider: OpenAI Chat Completions (cheap small model). Key:
 * OPENAI_API_KEY (server/CI only), sent as a bearer header. Model:
 * DAILY_BREAD_OPENAI_MODEL, default gpt-4o-mini (verified live 2026-09-13).
 */
import { estimateCostUsd } from '@/lib/brain/cost'
import { httpFailure, ProviderError, type TextProvider } from './types'

const API_URL = 'https://api.openai.com/v1/chat/completions'

export function createOpenAiProvider(
  options: {
    env?: Record<string, string | undefined>
    fetchImpl?: typeof fetch
    model?: string
  } = {},
): TextProvider {
  const env = options.env ?? process.env
  const fetchImpl = options.fetchImpl ?? fetch
  const model = options.model ?? env.DAILY_BREAD_OPENAI_MODEL ?? 'gpt-4o-mini'
  const key = () => (env.OPENAI_API_KEY ?? '').trim()

  return {
    id: 'openai',
    model,
    available: () => key().length > 0,
    async generate(request) {
      const apiKey = key()
      if (!apiKey) throw new ProviderError('openai: not configured', { retryable: false })
      let response: Response
      try {
        response = await fetchImpl(API_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            max_tokens: request.maxOutputTokens,
            temperature: request.temperature ?? 0.6,
            messages: [
              { role: 'system', content: request.system },
              { role: 'user', content: request.prompt },
            ],
            ...(request.json ? { response_format: { type: 'json_object' } } : {}),
          }),
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
            ? estimateCostUsd({ engine: 'openai', inputTokens, outputTokens })
            : undefined,
      }
    },
  }
}
