import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-retry-test'
  delete process.env.OPENAI_API_KEY
  delete process.env.GOOGLE_API_KEY
  delete process.env.GEMINI_API_KEY
  delete process.env.MINIMAX_API_KEY
  delete process.env.NVIDIA_KIMI_API_KEY
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.resetModules()
  process.env = { ...ORIGINAL_ENV }
})

const QUALITY_PASSING_REPLY = `Mark 1:15 reminds us to repent and believe. ${'word '.repeat(80)}

${'paragraph two text '.repeat(20)}`

function successResponse(): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    text: async () => '',
    json: async () => ({
      content: [{ type: 'text', text: QUALITY_PASSING_REPLY }],
      usage: { input_tokens: 10, output_tokens: 5 },
    }),
  } as unknown as Response
}

function transientFailure(status: number, retryAfter?: string): Response {
  const headers = new Headers()
  if (retryAfter) headers.set('Retry-After', retryAfter)
  return {
    ok: false,
    status,
    headers,
    text: async () => `transient ${status}`,
    json: async () => ({}),
  } as unknown as Response
}

function clientFailure(status: number): Response {
  return {
    ok: false,
    status,
    headers: new Headers(),
    text: async () => `client ${status}`,
    json: async () => ({}),
  } as unknown as Response
}

describe('Anthropic retry on 429 / 5xx', () => {
  it('retries a 429 then succeeds on the second attempt', async () => {
    vi.useFakeTimers()
    const responses = [transientFailure(429, '0'), successResponse()]
    const fetchMock = vi.fn(async () => responses.shift()!)
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const { generateWithBrain } = await import('@/lib/brain/router')
    const promise = generateWithBrain({
      system: 'sys',
      messages: [{ role: 'user', content: 'body' }],
      context: { task: 'devotional_day_generate', mode: 'auto' },
    })
    // Drain the sleep timer (Retry-After: 0 → backoff 0ms, but the
    // setTimeout still wraps; advance just in case)
    await vi.advanceTimersByTimeAsync(10)
    const result = await promise
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.output).toContain('Mark 1:15')
  })

  it('retries a 503 with exponential backoff and eventually throws after 3 attempts', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(async () => transientFailure(503))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const { generateWithBrain } = await import('@/lib/brain/router')
    const promise = generateWithBrain({
      system: 'sys',
      messages: [{ role: 'user', content: 'body' }],
      context: { task: 'devotional_day_generate', mode: 'auto' },
    })
    // Attach catch immediately to avoid an unhandled-rejection warning
    // during timer draining (the rejection settles inside advanceTimers).
    const settled = promise.catch((e: unknown) => e)
    // Drain both backoffs (1000ms + 2000ms)
    await vi.advanceTimersByTimeAsync(5000)
    const error = (await settled) as Error
    expect(error.message).toMatch(
      /Anthropic request failed after 3 attempts \(503\)/,
    )
    expect(fetchMock).toHaveBeenCalledTimes(3) // 1 + 2 retries
  })

  it('does NOT retry on a 4xx other than 429', async () => {
    const fetchMock = vi.fn(async () => clientFailure(400))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const { generateWithBrain } = await import('@/lib/brain/router')
    await expect(
      generateWithBrain({
        system: 'sys',
        messages: [{ role: 'user', content: 'body' }],
        context: { task: 'devotional_day_generate', mode: 'auto' },
      }),
    ).rejects.toThrow(/Anthropic request failed \(400\)/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('honors the Retry-After header when present (parses seconds)', async () => {
    vi.useFakeTimers()
    const responses = [transientFailure(429, '2'), successResponse()]
    const fetchMock = vi.fn(async () => responses.shift()!)
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const { generateWithBrain } = await import('@/lib/brain/router')
    const promise = generateWithBrain({
      system: 'sys',
      messages: [{ role: 'user', content: 'body' }],
      context: { task: 'devotional_day_generate', mode: 'auto' },
    })

    // Before advancing past Retry-After, fetch should still be at 1 call.
    await vi.advanceTimersByTimeAsync(500)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // After advancing past 2s, the second call fires.
    await vi.advanceTimersByTimeAsync(2000)
    const result = await promise
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.output).toContain('Mark 1:15')
  })
})
