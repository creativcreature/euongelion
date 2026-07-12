/**
 * Phase 1d — Turnstile on the magic-link request (brief §12.4).
 *
 * Contract under test:
 *  - TURNSTILE_SECRET_KEY unset → the route behaves EXACTLY as before:
 *    no token required, none checked (clean conditional, no silent stub).
 *  - Secret set → the request must carry a token that Cloudflare's
 *    siteverify confirms; missing/rejected tokens fail with an honest
 *    error and NO email is sent; siteverify outages fail closed as 503.
 *  - verifyTurnstileToken unit behavior (form encoding, outcomes).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { turnstileSecretKey, verifyTurnstileToken } from '@/lib/auth/turnstile'

const { sendMagicLinkMock } = vi.hoisted(() => ({
  sendMagicLinkMock: vi.fn(async () => {}),
}))

vi.mock('@/lib/auth', () => ({
  sendMagicLink: sendMagicLinkMock,
}))

import { POST as magicLinkHandler } from '@/app/api/auth/magic-link/route'

let requestCounter = 0

function makeRequest(body: unknown): NextRequest {
  requestCounter += 1
  // A real NextRequest — the route reads request.nextUrl.origin.
  return new NextRequest('http://localhost:3333/api/auth/magic-link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Unique IP per request so the in-memory rate limiter never
      // couples unrelated tests.
      'x-forwarded-for': `10.8.${requestCounter}.1`,
    },
    body: JSON.stringify(body),
  })
}

function stubSiteverify(payload: unknown, status = 200) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (!url.includes('challenges.cloudflare.com/turnstile/v0/siteverify')) {
      throw new Error(`Unexpected fetch in magic-link route: ${url}`)
    }
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => payload,
    } as Response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  sendMagicLinkMock.mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('verifyTurnstileToken (unit)', () => {
  it('reports missing tokens without calling Cloudflare', async () => {
    const fetchImpl = vi.fn()
    const result = await verifyTurnstileToken({
      token: '   ',
      secretKey: 'secret-1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(result).toEqual({ ok: false, reason: 'missing_token' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('posts secret + response (+ remoteip) form-encoded and accepts success', async () => {
    const fetchImpl = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        const body = String(init?.body)
        expect(body).toContain('secret=secret-1')
        expect(body).toContain('response=token-abc')
        expect(body).toContain('remoteip=203.0.113.9')
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as Response
      },
    )
    const result = await verifyTurnstileToken({
      token: 'token-abc',
      secretKey: 'secret-1',
      remoteIp: '203.0.113.9',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(result).toEqual({ ok: true })
  })

  it('reports rejected tokens and unavailable siteverify distinctly', async () => {
    const rejected = await verifyTurnstileToken({
      token: 'bad-token',
      secretKey: 'secret-1',
      fetchImpl: (async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: false }),
      })) as unknown as typeof fetch,
    })
    expect(rejected).toEqual({ ok: false, reason: 'rejected' })

    const down = await verifyTurnstileToken({
      token: 'any-token',
      secretKey: 'secret-1',
      fetchImpl: (async () => {
        throw new Error('network down')
      }) as unknown as typeof fetch,
    })
    expect(down).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('turnstileSecretKey is null when unset or blank', () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '')
    expect(turnstileSecretKey()).toBeNull()
    vi.stubEnv('TURNSTILE_SECRET_KEY', '  secret-x  ')
    expect(turnstileSecretKey()).toBe('secret-x')
  })
})

describe('POST /api/auth/magic-link — Turnstile conditional', () => {
  it('with the secret UNSET, sends the email with no token — exactly today', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '')
    // Any fetch call would throw — proving no siteverify round trip happens.
    stubSiteverify({ success: false })

    const response = await magicLinkHandler(
      makeRequest({ email: 'reader@example.com' }),
    )
    expect(response.status).toBe(200)
    expect(sendMagicLinkMock).toHaveBeenCalledTimes(1)
  })

  it('with the secret SET, a missing token is rejected honestly and no email sends', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret-live')
    stubSiteverify({ success: true })

    const response = await magicLinkHandler(
      makeRequest({ email: 'reader@example.com' }),
    )
    expect(response.status).toBe(403)
    const payload = (await response.json()) as { error?: string }
    expect(payload.error).toMatch(/verify this request/i)
    expect(sendMagicLinkMock).not.toHaveBeenCalled()
  })

  it('with the secret SET, a rejected token is refused and no email sends', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret-live')
    stubSiteverify({ success: false })

    const response = await magicLinkHandler(
      makeRequest({
        email: 'reader@example.com',
        turnstileToken: 'forged-token',
      }),
    )
    expect(response.status).toBe(403)
    expect(sendMagicLinkMock).not.toHaveBeenCalled()
  })

  it('with the secret SET, a verified token sends the email', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret-live')
    const fetchMock = stubSiteverify({ success: true })

    const response = await magicLinkHandler(
      makeRequest({
        email: 'reader@example.com',
        turnstileToken: 'valid-token',
      }),
    )
    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(sendMagicLinkMock).toHaveBeenCalledTimes(1)
  })

  it('fails CLOSED as 503 when siteverify itself is unreachable', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret-live')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('cloudflare unreachable')
      }),
    )

    const response = await magicLinkHandler(
      makeRequest({
        email: 'reader@example.com',
        turnstileToken: 'valid-token',
      }),
    )
    expect(response.status).toBe(503)
    const payload = (await response.json()) as { error?: string }
    expect(payload.error).toMatch(/try again/i)
    expect(sendMagicLinkMock).not.toHaveBeenCalled()
  })
})
