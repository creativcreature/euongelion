import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  process.env = { ...ORIGINAL_ENV }
})

const QUALITY_PASSING_REPLY = `Mark 1:15 reminds us to repent and believe. ${'word '.repeat(80)}

${'paragraph two text '.repeat(20)}`

function mockFetchOnce(json: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => json,
    })) as unknown as typeof fetch,
  )
}

describe('Real token counting from provider response.usage', () => {
  describe('Anthropic', () => {
    beforeEach(() => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-real-tokens'
      delete process.env.OPENAI_API_KEY
      delete process.env.GOOGLE_API_KEY
      delete process.env.GEMINI_API_KEY
      delete process.env.MINIMAX_API_KEY
      delete process.env.NVIDIA_KIMI_API_KEY
    })

    it('uses real input_tokens / output_tokens from response.usage', async () => {
      mockFetchOnce({
        content: [{ type: 'text', text: QUALITY_PASSING_REPLY }],
        usage: { input_tokens: 1234, output_tokens: 567 },
      })
      const { generateWithBrain } = await import('@/lib/brain/router')
      const result = await generateWithBrain({
        system: 'sys',
        messages: [{ role: 'user', content: 'body' }],
        context: { task: 'devotional_day_generate', mode: 'auto' },
      })
      expect(result.inputTokens).toBe(1234)
      expect(result.outputTokens).toBe(567)
    })

    it('falls back to estimates when usage is absent', async () => {
      mockFetchOnce({
        content: [{ type: 'text', text: QUALITY_PASSING_REPLY }],
      })
      const { generateWithBrain } = await import('@/lib/brain/router')
      const result = await generateWithBrain({
        system: 'sys',
        messages: [{ role: 'user', content: 'body' }],
        context: { task: 'devotional_day_generate', mode: 'auto' },
      })
      // Estimates are 1.5×words, never zero for a non-empty prompt.
      expect(result.inputTokens).toBeGreaterThan(0)
      expect(result.outputTokens).toBeGreaterThan(0)
      // Estimate for "sys\nbody" is small (~6 tokens), much less than 1234.
      expect(result.inputTokens).toBeLessThan(50)
    })
  })

  describe('Google Gemini', () => {
    beforeEach(() => {
      delete process.env.ANTHROPIC_API_KEY
      delete process.env.OPENAI_API_KEY
      process.env.GOOGLE_API_KEY = 'goog-token'
      delete process.env.MINIMAX_API_KEY
      delete process.env.NVIDIA_KIMI_API_KEY
    })

    it('uses promptTokenCount / candidatesTokenCount from usageMetadata', async () => {
      mockFetchOnce({
        candidates: [{ content: { parts: [{ text: QUALITY_PASSING_REPLY }] } }],
        usageMetadata: {
          promptTokenCount: 333,
          candidatesTokenCount: 444,
        },
      })
      const { generateWithBrain } = await import('@/lib/brain/router')
      const result = await generateWithBrain({
        system: 'sys',
        messages: [{ role: 'user', content: 'body' }],
        context: { task: 'devotional_day_generate', mode: 'google' },
      })
      expect(result.inputTokens).toBe(333)
      expect(result.outputTokens).toBe(444)
    })
  })

  describe('OpenAI-compatible (MiniMax / NVIDIA)', () => {
    beforeEach(() => {
      delete process.env.ANTHROPIC_API_KEY
      delete process.env.OPENAI_API_KEY
      delete process.env.GOOGLE_API_KEY
      delete process.env.MINIMAX_API_KEY
      delete process.env.NVIDIA_KIMI_API_KEY
    })

    it('uses prompt_tokens / completion_tokens from usage (BYO MiniMax key)', async () => {
      mockFetchOnce({
        choices: [{ message: { content: QUALITY_PASSING_REPLY } }],
        usage: { prompt_tokens: 222, completion_tokens: 111 },
      })
      const { generateWithBrain } = await import('@/lib/brain/router')
      // High-cost providers (MiniMax / NVIDIA) require BYO key under
      // platform-funded policy, so route through context.userKeys.
      const result = await generateWithBrain({
        system: 'sys',
        messages: [{ role: 'user', content: 'body' }],
        context: {
          task: 'devotional_day_generate',
          mode: 'minimax',
          userKeys: { minimax: 'byo-mini-key' },
        },
      })
      expect(result.inputTokens).toBe(222)
      expect(result.outputTokens).toBe(111)
    })
  })
})
