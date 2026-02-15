import { describe, expect, it, vi } from 'vitest'
import {
  createRequestId,
  isSafeAuditOptionId,
  isSafeAuditRunId,
  jsonError,
  logApiError,
  normalizeTimezoneOffsetMinutes,
  sanitizeTimezone,
  takeRateLimit,
  withRateLimitHeaders,
  withRequestIdHeaders,
} from '@/lib/api-security'

describe('API security helpers', () => {
  it('validates audit run ids (UUID format)', () => {
    expect(isSafeAuditRunId('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(isSafeAuditRunId('not-a-run-id')).toBe(false)
    expect(isSafeAuditRunId('../unsafe')).toBe(false)
  })

  it('validates soul audit option ids', () => {
    expect(isSafeAuditOptionId('ai_primary:identity-crisis:1:1')).toBe(true)
    expect(isSafeAuditOptionId('curated_prefab:kingdom:4:5')).toBe(true)
    expect(isSafeAuditOptionId('ai_primary:bad slug:1:1')).toBe(false)
    expect(isSafeAuditOptionId('DROP TABLE')).toBe(false)
  })

  it('sanitizes timezone names', () => {
    expect(sanitizeTimezone('America/New_York')).toBe('America/New_York')
    expect(sanitizeTimezone('UTC')).toBeNull()
    expect(sanitizeTimezone('https://bad')).toBeNull()
  })

  it('normalizes timezone offsets', () => {
    expect(normalizeTimezoneOffsetMinutes(300)).toBe(300)
    expect(normalizeTimezoneOffsetMinutes('-420')).toBe(-420)
    expect(normalizeTimezoneOffsetMinutes(841)).toBeNull()
    expect(normalizeTimezoneOffsetMinutes('bad')).toBeNull()
  })

  it('returns rich rate-limit metadata and blocks over limit', () => {
    const namespace = `test-${Date.now()}`
    const first = takeRateLimit({
      namespace,
      key: 'client-a',
      limit: 2,
      windowMs: 60_000,
    })
    const second = takeRateLimit({
      namespace,
      key: 'client-a',
      limit: 2,
      windowMs: 60_000,
    })
    const third = takeRateLimit({
      namespace,
      key: 'client-a',
      limit: 2,
      windowMs: 60_000,
    })

    expect(first.ok).toBe(true)
    expect(first.limit).toBe(2)
    expect(first.remaining).toBe(1)
    expect(second.ok).toBe(true)
    expect(second.remaining).toBe(0)
    expect(third.ok).toBe(false)
    expect(third.remaining).toBe(0)
    expect(third.retryAfterSeconds).toBeGreaterThan(0)
    expect(third.resetAtSeconds).toBeGreaterThan(0)
  })

  it('attaches retry and rate-limit headers when metadata is provided', () => {
    const response = new Response(JSON.stringify({ ok: false }), {
      status: 429,
    })
    const next = withRateLimitHeaders(response, {
      retryAfterSeconds: 60,
      limit: 30,
      remaining: 0,
      resetAtSeconds: 1_700_000_000,
    })

    expect(next.headers.get('Retry-After')).toBe('60')
    expect(next.headers.get('X-RateLimit-Limit')).toBe('30')
    expect(next.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(next.headers.get('X-RateLimit-Reset')).toBe('1700000000')
  })

  it('creates request ids and attaches request headers', () => {
    const requestId = createRequestId()
    expect(requestId.length).toBeGreaterThan(10)

    const response = new Response(JSON.stringify({ ok: true }), { status: 200 })
    const next = withRequestIdHeaders(response, requestId)
    expect(next.headers.get('X-Request-Id')).toBe(requestId)
    expect(next.headers.get('Cache-Control')).toBe('no-store')
  })

  it('returns standardized error payload with request id and headers', async () => {
    const response = jsonError({
      error: 'Too many requests',
      status: 429,
      requestId: 'rid-123',
      code: 'RATE_LIMITED',
      rateLimit: {
        retryAfterSeconds: 30,
        limit: 10,
        remaining: 0,
        resetAtSeconds: 1_700_000_100,
      },
    })

    expect(response.status).toBe(429)
    expect(response.headers.get('X-Request-Id')).toBe('rid-123')
    expect(response.headers.get('Retry-After')).toBe('30')
    expect(response.headers.get('X-RateLimit-Limit')).toBe('10')

    const payload = (await response.json()) as Record<string, unknown>
    expect(payload.error).toBe('Too many requests')
    expect(payload.requestId).toBe('rid-123')
    expect(payload.code).toBe('RATE_LIMITED')
  })

  it('logs structured API error records', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failure = new Error('boom')
    logApiError({
      scope: 'unit-test',
      requestId: 'rid-abc',
      error: failure,
      method: 'POST',
      path: '/api/test',
      clientKey: 'ip:test',
      context: { component: 'api-security' },
    })
    expect(spy).toHaveBeenCalled()
    const [label, payload] = spy.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ]
    expect(label).toContain('api:unit-test')
    expect(payload.requestId).toBe('rid-abc')
    expect(payload.path).toBe('/api/test')
    spy.mockRestore()
  })
})
