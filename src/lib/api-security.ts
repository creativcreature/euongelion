/**
 * api-security.ts — shared security + observability primitives for
 * every API route under `src/app/api/`.
 *
 * ## What lives here
 *
 * - **Rate limiting** (`takeRateLimit`) — Upstash Redis sliding window
 *   when configured, in-memory fallback otherwise. Both cases return
 *   the same `{ ok, retryAfterSeconds, limit, remaining, ... }` shape.
 * - **Body parsing** (`readJsonWithLimit`) — JSON parsing with a hard
 *   byte cap so malformed/huge bodies surface a clean 413/400 instead
 *   of a runtime crash.
 * - **Input validation** (`isSafeSlug`, `isSafeAuditRunId`,
 *   `isSafeAuditOptionId`, `sanitizeTimezone`,
 *   `normalizeTimezoneOffsetMinutes`, `sanitizeSafeRedirectPath`) —
 *   strict-regex guards. Anything not matching the regex is rejected
 *   (returns null/false). Used at every API boundary.
 * - **Error responses** (`jsonError`, `logApiError`,
 *   `withRequestIdHeaders`, `withRateLimitHeaders`,
 *   `withModelUsedHeader`) — typed-shape error JSON with `requestId` +
 *   `deploymentFingerprint` + optional `code` + `details`. Logging is
 *   structured so production logs are queryable.
 * - **Wall-clock guards** (`withAbortDeadline`, `LLM_ROUTE_DEADLINE_MS`,
 *   `isAbortError`) — used by LLM-touching routes to surface a clean
 *   504 instead of being silently killed by Cloudflare's 30s wall-clock.
 *
 * ## Defaults to know
 *
 * - **Slug regex** allows lowercase, digits, dash, 1–120 chars.
 * - **Audit run id** must be a UUID v4 (case-insensitive 36-char hex+dash).
 * - **Audit option id** is `<kind>:<slug>(:<day>):<rank>` where kind is
 *   one of `ai_primary | ai_generative | curated_prefab`.
 * - **Redirect-path sanitizer** prevents open-redirect by enforcing
 *   `^/[^/]` (relative-only, no protocol-relative `//foo` shenanigans).
 * - **In-memory rate limit** is per-isolate; not safe across multiple
 *   Cloudflare Workers regions. Use Upstash for cross-region accuracy.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createHash } from 'crypto'
import { Redis } from '@upstash/redis'

type SerializedError = {
  name: string
  message: string
  stack?: string
}

interface RateLimitBucket {
  count: number
  resetAt: number
}

const SAFE_SLUG_RE = /^[a-z0-9-]{1,120}$/
const SAFE_AUDIT_RUN_ID_RE = /^[a-f0-9-]{36}$/i
// ai_generative IDs use 3 segments (kind:slug:rank),
// ai_primary/curated_prefab use 4 segments (kind:slug:day:rank).
const SAFE_AUDIT_OPTION_ID_RE =
  /^(ai_primary|ai_generative|curated_prefab):[a-z0-9-]{1,120}(:[0-9]{1,2}){1,2}$/i
const SAFE_TIMEZONE_RE = /^[A-Za-z_]+(?:\/[A-Za-z0-9._+-]+)+$/

let redisClient: Redis | null = null
const memoryRateLimitStore = new Map<string, RateLimitBucket>()

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (
    !url ||
    !token ||
    url === 'missing' ||
    token === 'missing' ||
    !url.startsWith('https://')
  ) {
    return null
  }

  try {
    redisClient = new Redis({ url, token })
    return redisClient
  } catch {
    return null
  }
}

function nowMs() {
  return Date.now()
}

function takeRateLimitMemory(params: {
  namespace: string
  key: string
  limit: number
  windowMs: number
}) {
  const stamp = nowMs()
  const id = `${params.namespace}:${params.key}`
  const existing = memoryRateLimitStore.get(id)
  if (!existing || existing.resetAt <= stamp) {
    const resetAt = stamp + params.windowMs
    memoryRateLimitStore.set(id, { count: 1, resetAt })
    return {
      ok: true,
      retryAfterSeconds: Math.ceil(params.windowMs / 1000),
      limit: params.limit,
      remaining: Math.max(0, params.limit - 1),
      resetAtSeconds: Math.ceil(resetAt / 1000),
    }
  }

  if (existing.count >= params.limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - stamp) / 1000),
      ),
      limit: params.limit,
      remaining: 0,
      resetAtSeconds: Math.ceil(existing.resetAt / 1000),
    }
  }

  existing.count += 1
  memoryRateLimitStore.set(id, existing)
  return {
    ok: true,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((existing.resetAt - stamp) / 1000),
    ),
    limit: params.limit,
    remaining: Math.max(0, params.limit - existing.count),
    resetAtSeconds: Math.ceil(existing.resetAt / 1000),
  }
}

function toInt(value: string | null): number {
  if (!value) return 0
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    name: 'UnknownError',
    message: typeof error === 'string' ? error : JSON.stringify(error),
  }
}

function cleanFingerprintPart(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.replace(/[^a-zA-Z0-9._:-]/g, '').slice(0, 80) || null
}

export function getDeploymentFingerprint(): string {
  const commit =
    cleanFingerprintPart(process.env.CF_PAGES_COMMIT_SHA) ||
    cleanFingerprintPart(process.env.GIT_COMMIT_SHA) ||
    'unknown'
  const deployment =
    cleanFingerprintPart(process.env.CF_PAGES_URL) ||
    cleanFingerprintPart(process.env.CF_PAGES_BRANCH) ||
    cleanFingerprintPart(process.env.NEXT_PUBLIC_APP_URL) ||
    'local'

  return `${commit.slice(0, 12)}:${deployment.slice(0, 24)}`
}

export function createRequestId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }
}

export function getClientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  let ip = ''
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) ip = first
  }

  if (!ip) {
    const real = request.headers.get('x-real-ip')?.trim()
    if (real) ip = real
  }

  if (!ip) ip = 'unknown'

  const hash = createHash('sha256')
    .update(`ip:${ip}`)
    .digest('hex')
    .slice(0, 24)

  return `ip:${hash}`
}

export function getRequestPath(request: Request, fallback = '/'): string {
  try {
    return new URL(request.url).pathname || fallback
  } catch {
    return fallback
  }
}

export async function takeRateLimit(params: {
  namespace: string
  key: string
  limit: number
  windowMs: number
}): Promise<{
  ok: boolean
  retryAfterSeconds: number
  limit: number
  remaining: number
  resetAtSeconds: number
}> {
  const stamp = nowMs()
  const redis = getRedisClient()
  if (!redis) {
    return takeRateLimitMemory(params)
  }

  const redisKey = `rl:${params.namespace}:${params.key}`
  const windowSeconds = Math.max(1, Math.ceil(params.windowMs / 1000))
  try {
    const count = await redis.incr(redisKey)
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds)
    }
    const ttl = await redis.ttl(redisKey)
    const retryAfter = ttl > 0 ? ttl : windowSeconds
    const resetAtSeconds = Math.ceil((stamp + retryAfter * 1000) / 1000)
    const remaining = Math.max(0, params.limit - count)
    if (count > params.limit) {
      return {
        ok: false,
        retryAfterSeconds: retryAfter,
        limit: params.limit,
        remaining: 0,
        resetAtSeconds,
      }
    }
    return {
      ok: true,
      retryAfterSeconds: retryAfter,
      limit: params.limit,
      remaining,
      resetAtSeconds,
    }
  } catch {
    return takeRateLimitMemory(params)
  }
}

export async function readJsonWithLimit<T>(params: {
  request: Request
  maxBytes: number
}): Promise<
  { ok: true; data: T } | { ok: false; status: number; error: string }
> {
  const contentLength = toInt(params.request.headers.get('content-length'))
  if (contentLength > params.maxBytes) {
    return {
      ok: false,
      status: 413,
      error: `Payload too large (max ${params.maxBytes} bytes).`,
    }
  }

  let raw = ''
  try {
    raw = await params.request.text()
  } catch {
    return { ok: false, status: 400, error: 'Unable to read request body.' }
  }

  if (raw.length > params.maxBytes) {
    return {
      ok: false,
      status: 413,
      error: `Payload too large (max ${params.maxBytes} bytes).`,
    }
  }

  if (!raw.trim()) {
    return { ok: false, status: 400, error: 'Request body is required.' }
  }

  try {
    return { ok: true, data: JSON.parse(raw) as T }
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON payload.' }
  }
}

/**
 * Strict slug validator: lowercase letters, digits, dash, 1–120 chars.
 * Used for series slugs, devotional day slugs, etc. Use at every API
 * boundary that accepts a slug from a request body or URL parameter.
 */
export function isSafeSlug(value: string): boolean {
  return SAFE_SLUG_RE.test(value)
}

/**
 * UUID v4 shape check (case-insensitive 36-char hex+dash). Trims first
 * because some clients pad with whitespace. Use before passing the run
 * id to repository.ts queries.
 */
export function isSafeAuditRunId(value: string): boolean {
  return SAFE_AUDIT_RUN_ID_RE.test(value.trim())
}

/**
 * Audit option id shape: `<kind>:<slug>(:<day>):<rank>`.
 * - `ai_generative` IDs use 3 segments: kind:slug:rank.
 * - `ai_primary` and `curated_prefab` IDs use 4 segments: kind:slug:day:rank.
 * Rejects anything else (e.g. tampered IDs, prototype-pollution attempts).
 */
export function isSafeAuditOptionId(value: string): boolean {
  return SAFE_AUDIT_OPTION_ID_RE.test(value.trim())
}

/**
 * IANA timezone validator: `Continent/City` or longer paths. Returns
 * the trimmed value when valid, `null` when not. Does NOT verify the
 * timezone actually exists in the runtime — only the shape. Pair with
 * `Intl.DateTimeFormat` to confirm liveness.
 */
export function sanitizeTimezone(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!SAFE_TIMEZONE_RE.test(trimmed)) return null
  return trimmed
}

/**
 * Coerce a UTC-offset-minutes value (number or numeric string) to an
 * integer in the range [-840, 840] (= ±14 hours, the IANA-allowed
 * maximum). Returns `null` on anything outside this range or on
 * non-numeric input.
 */
export function normalizeTimezoneOffsetMinutes(value: unknown): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN

  if (!Number.isFinite(parsed)) return null
  const rounded = Math.trunc(parsed)
  if (rounded < -840 || rounded > 840) return null
  return rounded
}

export function sanitizeSingleLine(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, maxLength)
}

export function sanitizeOptionalText(
  value: unknown,
  maxLength: number,
): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, maxLength)
  return cleaned.length > 0 ? cleaned : null
}

/**
 * Open-redirect guard. Returns the path only when it:
 * - is a string
 * - starts with `/`
 * - is NOT protocol-relative (`//evil.example`)
 * - does NOT contain a scheme separator (`://`)
 * - is ≤ 240 chars
 *
 * Any deviation returns `undefined` — caller should default to a
 * known safe path. Use for ANY user-supplied redirect destination
 * (`?redirect=`, `?next=`, etc.) before issuing a 302 or sending it
 * to OAuth.
 */
export function sanitizeSafeRedirectPath(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed.startsWith('/')) return undefined
  if (trimmed.startsWith('//')) return undefined
  if (trimmed.includes('://')) return undefined
  if (trimmed.length > 240) return undefined
  return trimmed
}

export type RateLimitHeaderMeta =
  | number
  | {
      retryAfterSeconds: number
      limit?: number
      remaining?: number
      resetAtSeconds?: number
    }

export function withRequestIdHeaders<T extends Response>(
  response: T,
  requestId: string,
): T {
  response.headers.set('X-Request-Id', requestId)
  response.headers.set('X-Deployment-Fingerprint', getDeploymentFingerprint())
  if (!response.headers.has('Cache-Control')) {
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, max-age=0',
    )
  }
  if (!response.headers.has('Pragma')) {
    response.headers.set('Pragma', 'no-cache')
  }
  if (!response.headers.has('Expires')) {
    response.headers.set('Expires', '0')
  }
  if (!response.headers.has('Surrogate-Control')) {
    response.headers.set('Surrogate-Control', 'no-store')
  }
  return response
}

export function jsonError(params: {
  error: string
  status: number
  requestId: string
  code?: string
  details?: Record<string, unknown>
  rateLimit?: RateLimitHeaderMeta
}): NextResponse {
  const payload: Record<string, unknown> = {
    error: params.error,
    requestId: params.requestId,
    deploymentFingerprint: getDeploymentFingerprint(),
  }

  if (params.code) {
    payload.code = params.code
  }
  if (params.details) {
    Object.assign(payload, params.details)
  }

  const response = NextResponse.json(payload, { status: params.status })
  withRequestIdHeaders(response, params.requestId)
  if (typeof params.rateLimit !== 'undefined') {
    withRateLimitHeaders(response, params.rateLimit)
  }
  return response
}

export function logApiError(params: {
  scope: string
  requestId: string
  error: unknown
  method?: string
  path?: string
  clientKey?: string
  context?: Record<string, unknown>
}) {
  console.error(`[api:${params.scope}]`, {
    requestId: params.requestId,
    method: params.method,
    path: params.path,
    clientKey: params.clientKey,
    ...(params.context || {}),
    error: serializeError(params.error),
  })
}

export function withRateLimitHeaders<T extends Response>(
  response: T,
  meta: RateLimitHeaderMeta,
): T {
  const retryAfterSeconds =
    typeof meta === 'number' ? meta : meta.retryAfterSeconds
  response.headers.set('Retry-After', String(retryAfterSeconds))
  if (typeof meta !== 'number') {
    if (typeof meta.limit === 'number') {
      response.headers.set('X-RateLimit-Limit', String(meta.limit))
    }
    if (typeof meta.remaining === 'number') {
      response.headers.set('X-RateLimit-Remaining', String(meta.remaining))
    }
    if (typeof meta.resetAtSeconds === 'number') {
      response.headers.set('X-RateLimit-Reset', String(meta.resetAtSeconds))
    }
  }
  return response
}

export function getRequestMethod(request: NextRequest | Request): string {
  return request.method.toUpperCase()
}

/**
 * Default wall-clock budget for an LLM-touching API route on Cloudflare
 * Workers. Workers caps requests at 30s; we keep ~5s of headroom so the
 * route can return a structured 504 instead of being silently killed.
 */
export const LLM_ROUTE_DEADLINE_MS = 25_000

/**
 * Run an async block under a wall-clock deadline. The provided callback
 * receives an `AbortSignal` it should pass to `fetch()` (and on through
 * `BrainRouteContext.signal`) so any pending request is cancelled when
 * the deadline fires.
 *
 * On timeout, throws an `Error` whose `name === 'AbortError'`. Callers
 * are expected to map that into a 504 user-facing response.
 *
 * Always clears the timer in a finally block so successful runs don't
 * leak a setTimeout handle.
 */
export async function withAbortDeadline<T>(
  deadlineMs: number,
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort()
  }, deadlineMs)
  try {
    return await fn(controller.signal)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * True when an error is the one withAbortDeadline raises on timeout.
 * Native `fetch` aborts surface as DOMException('AbortError') in
 * browsers / undici / Workers; on Node 20+ runtimes you also get a
 * plain Error with name === 'AbortError'.
 */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { name?: unknown }
  return candidate.name === 'AbortError'
}

/**
 * Set `X-Model-Used` on a response so callers can see which provider
 * actually served their request (after any router fallbacks fired).
 * Useful when debugging "why does this output look different from
 * yesterday" — was it Anthropic, did it fall back to Google, etc.
 *
 * The value is a short stable string like "anthropic", "openai",
 * "google", "minimax", or "nvidia_kimi" mirroring `BrainProviderId`.
 * Returns the same response for chaining.
 */
export function withModelUsedHeader<T extends Response>(
  response: T,
  provider: string | undefined | null,
): T {
  if (provider) {
    response.headers.set('X-Model-Used', String(provider))
  }
  return response
}
