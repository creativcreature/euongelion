/**
 * Internal route authentication.
 * Protects internal-only routes (e.g. /generate-day) with a shared secret.
 * Secret is read via process.env (confirmed working in Phase 0).
 */

/**
 * Constant-time string comparison (OWASP self-audit L-1, 2026-07-11).
 * Implemented portably (XOR accumulate) rather than node:crypto's
 * timingSafeEqual so it behaves identically on the Workers runtime.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const max = Math.max(a.length, b.length)
  let mismatch = a.length === b.length ? 0 : 1
  for (let i = 0; i < max; i++) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return mismatch === 0
}

export function validateInternalSecret(request: Request): boolean {
  const secret = process.env.INTERNAL_ROUTE_SECRET
  if (!secret) return false
  const provided = request.headers.get('X-Internal-Secret')
  if (!provided) return false
  return constantTimeEqual(provided, secret)
}

export function internalFetchHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Internal-Secret': process.env.INTERNAL_ROUTE_SECRET || '',
  }
}
