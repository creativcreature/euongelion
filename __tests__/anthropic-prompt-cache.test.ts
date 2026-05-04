import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  // Force the router to pick the openai branch with an Anthropic key,
  // which dispatches to callAnthropic.
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'
  delete process.env.OPENAI_API_KEY
  delete process.env.GOOGLE_API_KEY
  delete process.env.GEMINI_API_KEY
  delete process.env.MINIMAX_API_KEY
  delete process.env.NVIDIA_KIMI_API_KEY
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  process.env = { ...ORIGINAL_ENV }
})

type CapturedRequest = {
  url: string
  body: Record<string, unknown>
}

// Long enough + has Scripture-like ref + 2 paragraphs to clear the
// router's qualityScore floor. The exact text doesn't matter for these
// tests — only that the response reaches the caller.
const QUALITY_PASSING_REPLY = `Mark 1:15 reminds us to repent and believe. ${'word '.repeat(80)}

${'paragraph two text '.repeat(20)}`

function mockAnthropicFetch(opts: {
  responseUsage?: Record<string, number>
  capture: CapturedRequest[]
}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      opts.capture.push({
        url,
        body: JSON.parse((init?.body as string) || '{}'),
      })
      return {
        ok: true,
        status: 200,
        text: async () => '',
        json: async () => ({
          content: [{ type: 'text', text: QUALITY_PASSING_REPLY }],
          usage: opts.responseUsage ?? {
            input_tokens: 10,
            output_tokens: 5,
          },
        }),
      } as unknown as Response
    }),
  )
}

describe('Anthropic prompt-cache wiring (callAnthropic via generateWithBrain)', () => {
  it('sends user content as a single string when no cacheableUserPrefix is set', async () => {
    const captured: CapturedRequest[] = []
    mockAnthropicFetch({ capture: captured })

    // Import AFTER stubbing env so router picks up ANTHROPIC_API_KEY.
    const { generateWithBrain } = await import('@/lib/brain/router')
    await generateWithBrain({
      system: 'short system',
      messages: [{ role: 'user', content: 'short user' }],
      context: { task: 'devotional_day_generate', mode: 'auto' },
    })

    expect(captured).toHaveLength(1)
    const messages = captured[0].body.messages as Array<{ content: unknown }>
    expect(typeof messages[0].content).toBe('string')
  })

  it('concatenates a small cacheableUserPrefix into the user message string', async () => {
    const captured: CapturedRequest[] = []
    mockAnthropicFetch({ capture: captured })
    const { generateWithBrain } = await import('@/lib/brain/router')

    await generateWithBrain({
      system: 'sys',
      messages: [{ role: 'user', content: 'dynamic body' }],
      cacheableUserPrefix: 'small prefix',
      context: { task: 'devotional_day_generate', mode: 'auto' },
    })

    const messages = captured[0].body.messages as Array<{ content: unknown }>
    expect(typeof messages[0].content).toBe('string')
    expect(messages[0].content).toContain('small prefix')
    expect(messages[0].content).toContain('dynamic body')
  })

  it('sends a structured array with cache_control when cacheableUserPrefix exceeds 4096 chars', async () => {
    const captured: CapturedRequest[] = []
    mockAnthropicFetch({ capture: captured })
    const { generateWithBrain } = await import('@/lib/brain/router')

    const bigPrefix = 'x'.repeat(5000)
    await generateWithBrain({
      system: 'sys',
      messages: [{ role: 'user', content: 'dynamic body' }],
      cacheableUserPrefix: bigPrefix,
      context: { task: 'devotional_day_generate', mode: 'auto' },
    })

    const messages = captured[0].body.messages as Array<{ content: unknown }>
    expect(Array.isArray(messages[0].content)).toBe(true)
    const blocks = messages[0].content as Array<{
      type: string
      text: string
      cache_control?: { type: string }
    }>
    expect(blocks).toHaveLength(2)
    expect(blocks[0].cache_control).toEqual({ type: 'ephemeral' })
    expect(blocks[0].text).toBe(bigPrefix)
    expect(blocks[1].text).toBe('dynamic body')
    expect(blocks[1].cache_control).toBeUndefined()
  })

  it('wraps a large system prompt in a cache_control text block', async () => {
    const captured: CapturedRequest[] = []
    mockAnthropicFetch({ capture: captured })
    const { generateWithBrain } = await import('@/lib/brain/router')

    const bigSystem = 'S'.repeat(5000)
    await generateWithBrain({
      system: bigSystem,
      messages: [{ role: 'user', content: 'short' }],
      context: { task: 'devotional_day_generate', mode: 'auto' },
    })

    const system = captured[0].body.system as
      | string
      | Array<{ type: string; cache_control?: { type: string } }>
    expect(Array.isArray(system)).toBe(true)
    if (Array.isArray(system)) {
      expect(system[0].cache_control).toEqual({ type: 'ephemeral' })
    }
  })

  it('emits a [anthropic-cache] log line when cache stats appear in the response', async () => {
    const captured: CapturedRequest[] = []
    mockAnthropicFetch({
      capture: captured,
      responseUsage: {
        input_tokens: 100,
        output_tokens: 20,
        cache_creation_input_tokens: 1500,
        cache_read_input_tokens: 0,
      },
    })
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { generateWithBrain } = await import('@/lib/brain/router')

    await generateWithBrain({
      system: 'sys',
      messages: [{ role: 'user', content: 'body' }],
      context: { task: 'devotional_day_generate', mode: 'auto' },
    })

    const logged = infoSpy.mock.calls.flat().join(' ')
    expect(logged).toContain('[anthropic-cache]')
    expect(logged).toContain('cache_created=1500')
    expect(logged).toContain('cache_read=0')
    infoSpy.mockRestore()
  })

  it('does not log when no cache activity is reported', async () => {
    const captured: CapturedRequest[] = []
    mockAnthropicFetch({
      capture: captured,
      responseUsage: { input_tokens: 50, output_tokens: 10 },
    })
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { generateWithBrain } = await import('@/lib/brain/router')

    await generateWithBrain({
      system: 'sys',
      messages: [{ role: 'user', content: 'body' }],
      context: { task: 'devotional_day_generate', mode: 'auto' },
    })

    const cacheLogs = infoSpy.mock.calls.filter((args) =>
      args.some(
        (a) => typeof a === 'string' && a.includes('[anthropic-cache]'),
      ),
    )
    expect(cacheLogs).toHaveLength(0)
    infoSpy.mockRestore()
  })
})
