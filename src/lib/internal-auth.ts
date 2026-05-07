/**
 * Internal route authentication.
 * Protects internal-only routes (e.g. /generate-day) with a shared secret.
 * Secret is read via process.env (confirmed working in Phase 0).
 */

export function validateInternalSecret(request: Request): boolean {
  const secret = process.env.INTERNAL_ROUTE_SECRET
  if (!secret) return false
  return request.headers.get('X-Internal-Secret') === secret
}

export function internalFetchHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Internal-Secret': process.env.INTERNAL_ROUTE_SECRET || '',
  }
}
