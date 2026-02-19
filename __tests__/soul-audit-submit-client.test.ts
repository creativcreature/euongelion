import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SoulAuditSubmitError,
  submitSoulAuditResponse,
} from '@/lib/soul-audit/submit-client'

describe('submitSoulAuditResponse', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns submit payload when API succeeds', async () => {
    const payload = {
      auditRunId: 'run_123',
      options: [],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => payload,
      })),
    )

    await expect(
      submitSoulAuditResponse({ response: 'too much on my plate today' }),
    ).resolves.toEqual(payload)
  })

  it('surfaces API error text when server responds with non-OK', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        json: async () => ({
          error: 'Rate limit reached.',
        }),
      })),
    )

    await expect(
      submitSoulAuditResponse({ response: 'too much on my plate today' }),
    ).rejects.toEqual(new SoulAuditSubmitError('server', 'Rate limit reached.'))
  })

  it('retries once with enriched text for retryable no-options errors', async () => {
    const payload = {
      auditRunId: 'run_retry_ok',
      options: [{ id: 'x' }],
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error:
            'We could not assemble devotional options from your response yet. Add one more sentence and try again.',
          code: 'NO_CURATED_OPTIONS',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => payload,
      })

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      submitSoulAuditResponse({ response: 'money' }),
    ).resolves.toEqual(payload)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const secondCall = fetchMock.mock.calls[1]?.[1] as RequestInit | undefined
    expect(typeof secondCall?.body).toBe('string')
    const secondPayload = JSON.parse(String(secondCall?.body)) as {
      response: string
    }
    expect(secondPayload.response).toContain('I need guidance for this season.')
  })

  it('returns timeout error when submit exceeds timeout window', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_: RequestInfo | URL, init?: RequestInit) => {
        return new Promise((_, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => {
              reject(new DOMException('Aborted', 'AbortError'))
            },
            { once: true },
          )
        })
      }),
    )

    await expect(
      submitSoulAuditResponse({
        response: 'too much on my plate today',
        timeoutMs: 1,
      }),
    ).rejects.toEqual(
      new SoulAuditSubmitError(
        'timeout',
        'Soul Audit timed out. Please check your connection and retry.',
      ),
    )
  })

  it('returns offline error when navigator is offline', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('Boom'))),
    )

    await expect(
      submitSoulAuditResponse({ response: 'too much on my plate today' }),
    ).rejects.toEqual(
      new SoulAuditSubmitError(
        'offline',
        'You are offline. Reconnect to generate your devotional options.',
      ),
    )
  })
})
