import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SoulAuditSubmitError,
  submitSoulAuditResponse,
} from '@/lib/soul-audit/submit-client'
import { PASTORAL_MESSAGES } from '@/lib/soul-audit/messages'

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

  it('does not retry or modify user input on server error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: PASTORAL_MESSAGES.ALL_PROVIDERS_DOWN,
        code: 'ALL_PROVIDERS_EXHAUSTED',
      }),
    })

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      submitSoulAuditResponse({ response: 'money' }),
    ).rejects.toEqual(
      new SoulAuditSubmitError('server', PASTORAL_MESSAGES.ALL_PROVIDERS_DOWN),
    )

    // Must only make a single request — no retry, no enrichment
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const callArgs = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(String(callArgs[1]?.body)) as { response: string }
    expect(body.response).toBe('money')
  })

  it('includes clarifierResponse when provided', async () => {
    const payload = { auditRunId: 'run_456', options: [] }
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => payload,
    }))
    vi.stubGlobal('fetch', fetchMock)

    await submitSoulAuditResponse({
      response: 'help',
      clarifierResponse: 'I am going through a hard season',
    })

    const callArgs = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(String(callArgs[1]?.body)) as {
      response: string
      clarifierResponse: string
    }
    expect(body.response).toBe('help')
    expect(body.clarifierResponse).toBe('I am going through a hard season')
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
      new SoulAuditSubmitError('timeout', PASTORAL_MESSAGES.TIMEOUT),
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
      new SoulAuditSubmitError('offline', PASTORAL_MESSAGES.OFFLINE),
    )
  })

  it('returns generic error for unknown failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new Error('NetworkError'))),
    )

    await expect(
      submitSoulAuditResponse({ response: 'testing' }),
    ).rejects.toEqual(
      new SoulAuditSubmitError('server', PASTORAL_MESSAGES.GENERIC_ERROR),
    )
  })
})
