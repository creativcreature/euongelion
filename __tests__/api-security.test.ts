import { describe, expect, it } from 'vitest'
import {
  isSafeAuditOptionId,
  isSafeAuditRunId,
  normalizeTimezoneOffsetMinutes,
  sanitizeTimezone,
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
})
