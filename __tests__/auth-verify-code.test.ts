/**
 * F-065 — POST /api/auth/verify-code (in-app magic-code entry, Linear model).
 *
 * Contract under test:
 *  - Verifies via supabase.auth.verifyOtp({ email, token, type: 'email' }).
 *  - Success runs the SAME post-auth sequence as /auth/callback:
 *    onAuthSuccess(user.id) then the shouldRequirePostSignupOnboarding
 *    routing decision (first-session users → /onboarding?redirect=…).
 *  - Honest error states: malformed input 400 (no Supabase call), wrong or
 *    expired code 400 with a truthful message, Supabase 429 surfaced as 429,
 *    route-level rate limit 429.
 *  - Open-redirect hardening: absolute/foreign redirects collapse to '/'.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'

const { verifyOtpMock, onAuthSuccessMock } = vi.hoisted(() => ({
  verifyOtpMock: vi.fn(),
  onAuthSuccessMock: vi.fn(async () => {}),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { verifyOtp: verifyOtpMock },
  })),
}))

vi.mock('@/lib/auth', () => ({
  onAuthSuccess: onAuthSuccessMock,
}))

import { POST as verifyCodeHandler } from '@/app/api/auth/verify-code/route'

function mockUser(params: {
  createdAt: string
  lastSignInAt: string
  userMetadata?: Record<string, unknown>
}): User {
  return {
    id: 'user-verify-1',
    app_metadata: {},
    user_metadata: params.userMetadata ?? {},
    aud: 'authenticated',
    created_at: params.createdAt,
    last_sign_in_at: params.lastSignInAt,
  } as unknown as User
}

/** A user well past first session, with onboarding already completed. */
function returningUser(): User {
  return mockUser({
    createdAt: '2026-01-01T00:00:00.000Z',
    lastSignInAt: '2026-07-10T00:00:00.000Z',
    userMetadata: { onboardingCompleted: true },
  })
}

/** A brand-new user: last_sign_in_at ≈ created_at → first auth session. */
function firstSessionUser(): User {
  return mockUser({
    createdAt: '2026-07-10T00:00:00.000Z',
    lastSignInAt: '2026-07-10T00:00:30.000Z',
  })
}

let requestCounter = 0

function makeRequest(
  body: unknown,
  options: { ip?: string } = {},
): Parameters<typeof verifyCodeHandler>[0] {
  requestCounter += 1
  return new Request('http://localhost/api/auth/verify-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Unique IP per request by default so the route-level rate limiter
      // (in-memory, module-level) never couples unrelated tests.
      'x-forwarded-for': options.ip ?? `10.9.${requestCounter}.1`,
    },
    body: JSON.stringify(body),
  }) as never
}

beforeEach(() => {
  verifyOtpMock.mockReset()
  onAuthSuccessMock.mockClear()
})

describe('POST /api/auth/verify-code', () => {
  it('verifies the code with type "email" and returns the sanitized redirect', async () => {
    verifyOtpMock.mockResolvedValue({
      data: { user: returningUser(), session: {} },
      error: null,
    })

    const response = await verifyCodeHandler(
      makeRequest({
        email: 'Reader@Example.com ',
        code: '123456',
        redirect: '/saved',
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ ok: true, next: '/saved' })
    expect(verifyOtpMock).toHaveBeenCalledWith({
      email: 'reader@example.com',
      token: '123456',
      type: 'email',
    })
    // Same session-linking the emailed-link callback performs.
    expect(onAuthSuccessMock).toHaveBeenCalledWith('user-verify-1')
  })

  it('routes a first-session user through /onboarding, carrying the redirect', async () => {
    verifyOtpMock.mockResolvedValue({
      data: { user: firstSessionUser(), session: {} },
      error: null,
    })

    const response = await verifyCodeHandler(
      makeRequest({
        email: 'new@example.com',
        code: '654321',
        redirect: '/daily-bread',
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.next).toBe('/onboarding?redirect=%2Fdaily-bread')
  })

  it('tolerates pasted whitespace in the code', async () => {
    verifyOtpMock.mockResolvedValue({
      data: { user: returningUser(), session: {} },
      error: null,
    })

    const response = await verifyCodeHandler(
      makeRequest({ email: 'reader@example.com', code: ' 123 456 ' }),
    )

    expect(response.status).toBe(200)
    expect(verifyOtpMock).toHaveBeenCalledWith(
      expect.objectContaining({ token: '123456' }),
    )
  })

  it('collapses foreign/absolute redirects to "/" (open-redirect hardening)', async () => {
    verifyOtpMock.mockResolvedValue({
      data: { user: returningUser(), session: {} },
      error: null,
    })

    const response = await verifyCodeHandler(
      makeRequest({
        email: 'reader@example.com',
        code: '123456',
        redirect: 'https://evil.example.com/phish',
      }),
    )
    const payload = await response.json()

    expect(payload.next).toBe('/')
  })

  it('rejects a malformed email without calling Supabase', async () => {
    const response = await verifyCodeHandler(
      makeRequest({ email: 'not-an-email', code: '123456' }),
    )

    expect(response.status).toBe(400)
    expect(verifyOtpMock).not.toHaveBeenCalled()
  })

  it('rejects a non-6-digit code without calling Supabase', async () => {
    const response = await verifyCodeHandler(
      makeRequest({ email: 'reader@example.com', code: '12ab56' }),
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe('Enter the 6-digit code from the email.')
    expect(verifyOtpMock).not.toHaveBeenCalled()
  })

  it('surfaces a wrong/expired/used code as one honest 400', async () => {
    verifyOtpMock.mockResolvedValue({
      data: { user: null, session: null },
      error: Object.assign(new Error('Token has expired or is invalid'), {
        status: 403,
        code: 'otp_expired',
      }),
    })

    const response = await verifyCodeHandler(
      makeRequest({ email: 'reader@example.com', code: '000000' }),
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toMatch(/mistyped, expired, or already used/)
    expect(onAuthSuccessMock).not.toHaveBeenCalled()
  })

  it('passes Supabase verify rate-limiting through as 429', async () => {
    verifyOtpMock.mockResolvedValue({
      data: { user: null, session: null },
      error: Object.assign(new Error('Rate limit exceeded'), {
        status: 429,
        code: 'over_request_rate_limit',
      }),
    })

    const response = await verifyCodeHandler(
      makeRequest({ email: 'reader@example.com', code: '111111' }),
    )

    expect(response.status).toBe(429)
    expect(onAuthSuccessMock).not.toHaveBeenCalled()
  })

  it('rate-limits repeated attempts from the same client (10/minute)', async () => {
    verifyOtpMock.mockResolvedValue({
      data: { user: null, session: null },
      error: Object.assign(new Error('Token has expired or is invalid'), {
        status: 403,
        code: 'otp_expired',
      }),
    })

    const sameIp = '203.0.113.77'
    let lastStatus = 0
    for (let attempt = 0; attempt < 11; attempt += 1) {
      const response = await verifyCodeHandler(
        makeRequest(
          { email: 'reader@example.com', code: '999999' },
          { ip: sameIp },
        ),
      )
      lastStatus = response.status
    }

    expect(lastStatus).toBe(429)
    // The limiter fires BEFORE Supabase is consulted on the 11th attempt.
    expect(verifyOtpMock).toHaveBeenCalledTimes(10)
  })
})
