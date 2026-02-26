/**
 * clarifier.ts
 *
 * Implements the "clarifier-once" pattern: when user input is too vague
 * (<=3 words AND no themes detected), the system asks ONE follow-up
 * question before generating options.
 *
 * This is NOT a retry mechanism — it's a single, empathetic prompt that
 * helps the user express what they're going through more fully.
 */

import { createHmac, timingSafeEqual } from 'crypto'
import { PASTORAL_MESSAGES } from './messages'

// ─── Core Logic ──────────────────────────────────────────────────────

/**
 * Theme keywords that represent real detected intent (not just fallback
 * word extraction). Only these count as "themes detected" for clarifier gating.
 */
const REAL_THEME_KEYWORDS = new Set([
  'anxiety',
  'grief',
  'purpose',
  'sin',
  'trust',
  'relationships',
])

/**
 * Determine whether the user's input needs clarification before
 * generating devotional options.
 *
 * Criteria: word count <= 3 AND no real theme keywords were matched.
 * The intent parser falls back to extracting any 4+ char words as "themes",
 * but those are not meaningful enough to skip clarification.
 *
 * If the user already provided a clarifier response, never re-clarify.
 */
export function needsClarification(
  input: string,
  themes: string[],
  hasClarifierResponse: boolean,
): boolean {
  if (hasClarifierResponse) return false
  const wordCount = input.trim().split(/\s+/).filter(Boolean).length
  if (wordCount > 3) return false

  // Only real keyword-matched themes skip clarification
  const hasRealTheme = themes.some((t) => REAL_THEME_KEYWORDS.has(t))
  return !hasRealTheme
}

/**
 * Build the clarifier prompt and suggestion chips shown to the user.
 *
 * The prompt is warm and pastoral (not clinical). The suggestions are
 * common starting points that help users articulate what they need.
 */
export function buildClarifierPrompt(): {
  prompt: string
  suggestions: string[]
} {
  return {
    prompt: PASTORAL_MESSAGES.CLARIFIER_PROMPT,
    suggestions: [
      'I am feeling lost in my faith',
      'I am going through a hard season',
      'I want to grow deeper in Scripture',
    ],
  }
}

// ─── Clarifier Token ─────────────────────────────────────────────────

const CLARIFIER_TOKEN_VERSION = 1
const CLARIFIER_TOKEN_MAX_AGE_MS = 30 * 60 * 1000 // 30 minutes

type ClarifierTokenPayload = {
  version: number
  originalInput: string
  sessionFingerprint: string
  issuedAt: string
}

function clarifierSecret(): string {
  const secret = process.env.SOUL_AUDIT_RUN_TOKEN_SECRET
  if (secret && secret.trim().length >= 32) return secret

  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (fallback && fallback.length >= 32) {
    return createHmac('sha256', 'euangelion-clarifier-fallback')
      .update(fallback)
      .digest('hex')
  }

  throw new Error(
    'Clarifier token signing requires SOUL_AUDIT_RUN_TOKEN_SECRET or SUPABASE_SERVICE_ROLE_KEY',
  )
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlDecode(input: string): string {
  const padded = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(input.length / 4) * 4, '=')
  return Buffer.from(padded, 'base64').toString('utf8')
}

function signPayload(encoded: string): string {
  return createHmac('sha256', clarifierSecret()).update(encoded).digest('hex')
}

function fingerprintSession(sessionToken: string): string {
  return createHmac('sha256', clarifierSecret())
    .update(`clarifier-session:${sessionToken}`)
    .digest('hex')
}

/**
 * Create a signed token containing the user's original input.
 * This prevents tampering — the clarifier response is appended
 * to the verified original input on the next submit call.
 */
export function createClarifierToken(params: {
  originalInput: string
  sessionToken: string
}): string {
  const payload: ClarifierTokenPayload = {
    version: CLARIFIER_TOKEN_VERSION,
    originalInput: params.originalInput,
    sessionFingerprint: fingerprintSession(params.sessionToken),
    issuedAt: new Date().toISOString(),
  }

  const encoded = base64UrlEncode(JSON.stringify(payload))
  const signature = signPayload(encoded)
  return `${encoded}.${signature}`
}

/**
 * Verify a clarifier token and extract the original input.
 * Returns null if the token is invalid, expired, or session-mismatched.
 */
export function verifyClarifierToken(params: {
  token: string | null | undefined
  sessionToken: string
}): { originalInput: string } | null {
  const token = params.token?.trim()
  if (!token) return null

  const [encoded, signature] = token.split('.')
  if (!encoded || !signature) return null

  const expectedSig = signPayload(encoded)
  const sigBuf = Buffer.from(signature, 'hex')
  const expectedBuf = Buffer.from(expectedSig, 'hex')
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null

  try {
    const decoded = JSON.parse(
      base64UrlDecode(encoded),
    ) as ClarifierTokenPayload

    if (decoded.version !== CLARIFIER_TOKEN_VERSION) return null

    const fingerprint = fingerprintSession(params.sessionToken)
    if (decoded.sessionFingerprint !== fingerprint) return null

    const issuedAt = new Date(decoded.issuedAt).getTime()
    if (!Number.isFinite(issuedAt)) return null
    if (Date.now() - issuedAt > CLARIFIER_TOKEN_MAX_AGE_MS) return null

    if (typeof decoded.originalInput !== 'string') return null

    return { originalInput: decoded.originalInput }
  } catch {
    return null
  }
}
