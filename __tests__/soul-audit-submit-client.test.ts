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
          error: 'No curated options are currently available.',
        }),
      })),
    )

    await expect(
      submitSoulAuditResponse({ response: 'too much on my plate today' }),
    ).rejects.toEqual(
      new SoulAuditSubmitError(
        'server',
        'No curated options are currently available.',
      ),
    )
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
