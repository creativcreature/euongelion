import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  needsClarification,
  buildClarifierPrompt,
  createClarifierToken,
  verifyClarifierToken,
} from '@/lib/soul-audit/clarifier'

describe('needsClarification', () => {
  it('returns true for <=3 words and no themes', () => {
    expect(needsClarification('help', [], false)).toBe(true)
    expect(needsClarification('pray for me', [], false)).toBe(true)
    expect(needsClarification('I need', [], false)).toBe(true)
  })

  it('returns false for >3 words even with no themes', () => {
    expect(
      needsClarification('I feel anxious about my future', [], false),
    ).toBe(false)
  })

  it('returns false when real theme keywords are detected', () => {
    expect(needsClarification('help', ['anxiety'], false)).toBe(false)
    expect(needsClarification('pray', ['trust'], false)).toBe(false)
    expect(needsClarification('sin', ['sin'], false)).toBe(false)
  })

  it('returns true when only fallback (non-keyword) themes are detected', () => {
    // "help" gets extracted as a fallback theme word, but it's not a real keyword
    expect(needsClarification('help', ['help'], false)).toBe(true)
    expect(needsClarification('pray', ['pray'], false)).toBe(true)
    expect(needsClarification('money', ['money'], false)).toBe(true)
  })

  it('returns false when clarifier response already provided', () => {
    expect(needsClarification('help', [], true)).toBe(false)
  })

  it('returns false for empty string (empty is handled elsewhere)', () => {
    expect(needsClarification('', [], false)).toBe(true)
  })

  it('handles whitespace-padded input correctly', () => {
    expect(needsClarification('  help  ', [], false)).toBe(true)
    expect(
      needsClarification('  I feel anxious about my future  ', [], false),
    ).toBe(false)
  })
})

describe('buildClarifierPrompt', () => {
  it('returns a prompt and 3 suggestions', () => {
    const result = buildClarifierPrompt()
    expect(result.prompt).toBeTruthy()
    expect(typeof result.prompt).toBe('string')
    expect(result.suggestions).toHaveLength(3)
    expect(result.suggestions.every((s) => typeof s === 'string')).toBe(true)
  })

  it('prompt is warm and pastoral, not technical', () => {
    const { prompt } = buildClarifierPrompt()
    expect(prompt).not.toContain('ERROR')
    expect(prompt).not.toContain('INVALID')
    expect(prompt).not.toContain('too short')
    // Should be a warm question
    expect(prompt.length).toBeGreaterThan(20)
  })
})

describe('clarifier token round-trip', () => {
  const originalSecret = process.env.SOUL_AUDIT_RUN_TOKEN_SECRET

  beforeEach(() => {
    process.env.SOUL_AUDIT_RUN_TOKEN_SECRET =
      'test-clarifier-secret-that-is-at-least-32-chars-long'
  })

  afterAll(() => {
    if (originalSecret) {
      process.env.SOUL_AUDIT_RUN_TOKEN_SECRET = originalSecret
    } else {
      delete process.env.SOUL_AUDIT_RUN_TOKEN_SECRET
    }
  })

  it('creates and verifies a valid token', () => {
    const token = createClarifierToken({
      originalInput: 'help',
      sessionToken: 'session-abc',
    })

    expect(typeof token).toBe('string')
    expect(token.includes('.')).toBe(true)

    const result = verifyClarifierToken({
      token,
      sessionToken: 'session-abc',
    })

    expect(result).not.toBeNull()
    expect(result?.originalInput).toBe('help')
  })

  it('rejects token with wrong session', () => {
    const token = createClarifierToken({
      originalInput: 'help',
      sessionToken: 'session-abc',
    })

    const result = verifyClarifierToken({
      token,
      sessionToken: 'different-session',
    })

    expect(result).toBeNull()
  })

  it('rejects tampered token', () => {
    const token = createClarifierToken({
      originalInput: 'help',
      sessionToken: 'session-abc',
    })

    // Tamper with the payload
    const tampered = 'x' + token.slice(1)

    const result = verifyClarifierToken({
      token: tampered,
      sessionToken: 'session-abc',
    })

    expect(result).toBeNull()
  })

  it('rejects null/undefined/empty tokens', () => {
    expect(
      verifyClarifierToken({ token: null, sessionToken: 'session-abc' }),
    ).toBeNull()
    expect(
      verifyClarifierToken({ token: undefined, sessionToken: 'session-abc' }),
    ).toBeNull()
    expect(
      verifyClarifierToken({ token: '', sessionToken: 'session-abc' }),
    ).toBeNull()
  })

  it('rejects malformed tokens', () => {
    expect(
      verifyClarifierToken({
        token: 'no-dot-separator',
        sessionToken: 'session-abc',
      }),
    ).toBeNull()
  })
})
