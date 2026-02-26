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
const SAFE_AUDIT_OPTION_ID_RE =
  /^(ai_primary|ai_generative|curated_prefab):[a-z0-9-]{1,120}:[0-9]{1,2}:[0-9]{1,2}$/i
const SAFE_TIMEZONE_RE = /^[A-Za-z_]+(?:\/[A-Za-z0-9._+-]+)+$/

let redisClient: Redis | null = null
const memoryRateLimitStore = new Map<string, RateLimitBucket>()

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  redisClient = new Redis({
    url,
    token,
  })
  return redisClient
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

export function isSafeSlug(value: string): boolean {
  return SAFE_SLUG_RE.test(value)
}

export function isSafeAuditRunId(value: string): boolean {
  return SAFE_AUDIT_RUN_ID_RE.test(value.trim())
}

export function isSafeAuditOptionId(value: string): boolean {
  return SAFE_AUDIT_OPTION_ID_RE.test(value.trim())
}

export function sanitizeTimezone(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!SAFE_TIMEZONE_RE.test(trimmed)) return null
  return trimmed
}

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
  if (!response.headers.has('Cache-Control')) {
    response.headers.set('Cache-Control', 'no-store')
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
