/**
 * Secondary provider: Google Gemini (free tier covers a daily edition's
 * handful of small JSON calls). Key: GEMINI_API_KEY or GOOGLE_API_KEY, sent in
 * a header — never in the URL, so an error that echoes the URL cannot leak it.
 * Model: DAILY_BREAD_GEMINI_MODEL, default gemini-2.0-flash-lite.
 */
import { estimateCostUsd } from '@/lib/brain/cost'
import { httpFailure, ProviderError, type TextProvider } from './types'

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models'

export function createGeminiProvider(
  options: {
    env?: Record<string, string | undefined>
    fetchImpl?: typeof fetch
    model?: string
  } = {},
): TextProvider {
  const env = options.env ?? process.env
  const fetchImpl = options.fetchImpl ?? fetch
  // Pinned lite models keep being withdrawn (2.0 and 2.5 flash-lite both 404
  // for this key on 2026-09-13: "no longer available to new users"). Google's
  // maintained alias follows the current lite model.
  const model = options.model ?? env.DAILY_BREAD_GEMINI_MODEL ?? 'gemini-flash-lite-latest'
  const key = () => (env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY ?? '').trim()

  return {
    id: 'gemini',
    model,
    available: () => key().length > 0,
    async generate(request) {
      const apiKey = key()
      if (!apiKey) throw new ProviderError('gemini: not configured', { retryable: false })
      let response: Response
      try {
        response = await fetchImpl(`${API_ROOT}/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            ...(request.system ? { systemInstruction: { role: 'system', parts: [{ text: request.system }] } } : {}),
            contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
            generationConfig: {
              maxOutputTokens: request.maxOutputTokens,
              temperature: request.temperature ?? 0.6,
              ...(request.json ? { responseMimeType: 'application/json' } : {}),
            },
          }),
          signal: request.signal,
        })
      } catch (error) {
        const aborted = (error as { name?: string })?.name === 'AbortError'
        throw new ProviderError(aborted ? 'gemini: timed out' : 'gemini: network error', {
          retryable: true,
        })
      }
      if (!response.ok) {
        throw await httpFailure('gemini', response)
      }
      const payload = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
      }
      const text =
        payload.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? '')
          .join('\n')
          .trim() ?? ''
      const inputTokens = payload.usageMetadata?.promptTokenCount
      const outputTokens = payload.usageMetadata?.candidatesTokenCount
      return {
        text,
        model,
        inputTokens,
        outputTokens,
        estimatedCostUsd:
          typeof inputTokens === 'number' && typeof outputTokens === 'number'
            ? estimateCostUsd({ engine: 'google', inputTokens, outputTokens })
            : undefined,
      }
    },
  }
}
