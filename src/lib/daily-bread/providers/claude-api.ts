/**
 * Primary provider (API transport): Anthropic Messages API over fetch.
 * Key: ANTHROPIC_API_KEY (server/CI only). Model: DAILY_BREAD_CLAUDE_MODEL,
 * default claude-sonnet-5.
 */
import { estimateCostUsd } from '@/lib/brain/cost'
import { ProviderError, retryableStatus, type TextProvider } from './types'

const API_URL = 'https://api.anthropic.com/v1/messages'

export function createClaudeApiProvider(
  options: {
    env?: Record<string, string | undefined>
    fetchImpl?: typeof fetch
    model?: string
  } = {},
): TextProvider {
  const env = options.env ?? process.env
  const fetchImpl = options.fetchImpl ?? fetch
  const model = options.model ?? env.DAILY_BREAD_CLAUDE_MODEL ?? 'claude-sonnet-5'
  const key = () => (env.ANTHROPIC_API_KEY ?? '').trim()

  return {
    id: 'claude-api',
    model,
    available: () => key().length > 0,
    async generate(request) {
      const apiKey = key()
      if (!apiKey) throw new ProviderError('claude-api: not configured', { retryable: false })
      let response: Response
      try {
        response = await fetchImpl(API_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: request.maxOutputTokens,
            temperature: request.temperature ?? 0.6,
            system: request.system,
            messages: [{ role: 'user', content: request.prompt }],
          }),
          signal: request.signal,
        })
      } catch (error) {
        const aborted = (error as { name?: string })?.name === 'AbortError'
        throw new ProviderError(
          aborted ? 'claude-api: timed out' : 'claude-api: network error',
          { retryable: true },
        )
      }
      if (!response.ok) {
        throw new ProviderError(`claude-api: HTTP ${response.status}`, {
          retryable: retryableStatus(response.status),
          status: response.status,
        })
      }
      const payload = (await response.json()) as {
        content?: { type?: string; text?: string }[]
        usage?: { input_tokens?: number; output_tokens?: number }
      }
      const text = (payload.content ?? [])
        .filter((b) => b.type === 'text' && typeof b.text === 'string')
        .map((b) => b.text)
        .join('\n')
        .trim()
      const inputTokens = payload.usage?.input_tokens
      const outputTokens = payload.usage?.output_tokens
      return {
        text,
        model,
        inputTokens,
        outputTokens,
        estimatedCostUsd:
          typeof inputTokens === 'number' && typeof outputTokens === 'number'
            ? estimateCostUsd({ engine: 'anthropic', inputTokens, outputTokens })
            : undefined,
      }
    },
  }
}
