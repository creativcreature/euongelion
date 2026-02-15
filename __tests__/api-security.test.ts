import { describe, expect, it } from 'vitest'
import {
  isSafeAuditOptionId,
  isSafeAuditRunId,
  normalizeTimezoneOffsetMinutes,
  sanitizeTimezone,
  takeRateLimit,
  withRateLimitHeaders,
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
})
