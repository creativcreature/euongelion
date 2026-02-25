/**
 * Shared cryptographic utilities for Soul Audit token modules.
 *
 * Both consent-token.ts and run-token.ts use identical base64url encoding,
 * HMAC signing, timing-safe comparison, and secret resolution logic.
 * This module deduplicates those foundations while keeping each token
 * module responsible for its own payload types, versions, and lifetimes.
 *
 * Each token namespace uses distinct HMAC salts to prevent cross-token
 * attacks (e.g., a consent token being accepted as a run token).
 */

import { createHmac, timingSafeEqual } from 'crypto'

// ─── Base64url encoding ──────────────────────────────────────────────

export function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export function base64UrlDecode(input: string): string {
  const padded = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(input.length / 4) * 4, '=')
  return Buffer.from(padded, 'base64').toString('utf8')
}

// ─── Timing-safe comparison ──────────────────────────────────────────

export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const aBuf = Buffer.from(a, 'hex')
  const bBuf = Buffer.from(b, 'hex')
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

// ─── Secret resolution ───────────────────────────────────────────────

/**
 * Resolve the HMAC signing secret for a given token namespace.
 *
 * 3-level fallback chain:
 * 1. SOUL_AUDIT_RUN_TOKEN_SECRET env var (production)
 * 2. Derived from SUPABASE_SERVICE_ROLE_KEY with namespace-specific salt
 * 3. Ephemeral process-bound secret (dev/test only)
 *
 * Each namespace (e.g., 'run-token', 'consent-token') produces a
 * distinct secret at levels 2 and 3 to prevent cross-token reuse.
 */
export function resolveTokenSecret(namespace: string): string {
  const secret = process.env.SOUL_AUDIT_RUN_TOKEN_SECRET
  if (secret && secret.trim().length >= 32) {
    return secret
  }

  const fallbackSource = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (fallbackSource && fallbackSource.length >= 32) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[${namespace}] SOUL_AUDIT_RUN_TOKEN_SECRET not set — deriving fallback from SUPABASE_SERVICE_ROLE_KEY`,
      )
    }
    return createHmac('sha256', `euangelion-${namespace}-fallback`)
      .update(fallbackSource)
      .digest('hex')
  }

  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `[${namespace}] No suitable secret available — using ephemeral fallback`,
    )
  }
  return createHmac('sha256', `euangelion-${namespace}-ephemeral`)
    .update(process.pid.toString() + (process.env.VERCEL_URL || 'local'))
    .digest('hex')
}

// ─── HMAC operations ─────────────────────────────────────────────────

export function hmacSign(secret: string, data: string): string {
  return createHmac('sha256', secret).update(data).digest('hex')
}

export function hmacFingerprintSession(
  secret: string,
  sessionToken: string,
): string {
  return createHmac('sha256', secret)
    .update(`session:${sessionToken}`)
    .digest('hex')
}
