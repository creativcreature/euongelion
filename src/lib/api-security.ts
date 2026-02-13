import type { NextRequest } from 'next/server'

interface RateLimitBucket {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitBucket>()

const SAFE_SLUG_RE = /^[a-z0-9-]{1,120}$/
const SAFE_AUDIT_RUN_ID_RE = /^[a-f0-9-]{36}$/i
const SAFE_AUDIT_OPTION_ID_RE =
  /^(ai_primary|curated_prefab):[a-z0-9-]{1,120}:[0-9]{1,2}:[0-9]{1,2}$/i
const SAFE_TIMEZONE_RE = /^[A-Za-z_]+(?:\/[A-Za-z0-9._+-]+)+$/

function nowMs() {
  return Date.now()
}

function toInt(value: string | null): number {
  if (!value) return 0
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export function getClientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return `ip:${first}`
  }

  const real = request.headers.get('x-real-ip')?.trim()
  if (real) return `ip:${real}`

  return 'ip:unknown'
}

export function takeRateLimit(params: {
  namespace: string
  key: string
  limit: number
  windowMs: number
}): { ok: boolean; retryAfterSeconds: number } {
  const stamp = nowMs()
  const id = `${params.namespace}:${params.key}`
  const bucket = rateLimitStore.get(id)

  if (!bucket || bucket.resetAt <= stamp) {
    rateLimitStore.set(id, {
      count: 1,
      resetAt: stamp + params.windowMs,
    })
    return { ok: true, retryAfterSeconds: Math.ceil(params.windowMs / 1000) }
  }

  if (bucket.count >= params.limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((bucket.resetAt - stamp) / 1000),
      ),
    }
  }

  bucket.count += 1
  rateLimitStore.set(id, bucket)
  return {
    ok: true,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - stamp) / 1000)),
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

export function withRateLimitHeaders(
  response: Response,
  retryAfterSeconds: number,
): Response {
  response.headers.set('Retry-After', String(retryAfterSeconds))
  return response
}

export function getRequestMethod(request: NextRequest | Request): string {
  return request.method.toUpperCase()
}
