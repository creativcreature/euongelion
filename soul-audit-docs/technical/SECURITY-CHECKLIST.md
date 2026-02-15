# EUONGELION Security Checklist

**Version:** 1.0
**Last Updated:** January 17, 2026

---

## Overview

Comprehensive security checklist for EUONGELION. This document covers all security requirements for the MVP launch, organized by category with implementation guidance.

**Security Philosophy:** Protect user data with minimal collection. Be transparent about what we collect and why.

---

## 1. Content Security Policy (CSP)

### Recommended CSP Headers

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.io https://va.vercel-scripts.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' data: https: blob:;
      font-src 'self' https://fonts.gstatic.com;
      connect-src 'self' https://*.supabase.co https://api.anthropic.com https://plausible.io https://va.vercel-scripts.com;
      frame-ancestors 'none';
      form-action 'self';
      base-uri 'self';
      object-src 'none';
      upgrade-insecure-requests;
    `
      .replace(/\s{2,}/g, ' ')
      .trim(),
  },
]

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}
```

### CSP Directives Explained

| Directive         | Value                                  | Purpose                             |
| ----------------- | -------------------------------------- | ----------------------------------- |
| `default-src`     | `'self'`                               | Fallback for unspecified directives |
| `script-src`      | `'self' 'unsafe-inline' 'unsafe-eval'` | Allow Next.js scripts, analytics    |
| `style-src`       | `'self' 'unsafe-inline'`               | Allow Tailwind, Google Fonts        |
| `img-src`         | `'self' data: https: blob:`            | Allow images from any HTTPS         |
| `font-src`        | `'self' https://fonts.gstatic.com`     | Self-hosted + Google Fonts          |
| `connect-src`     | Supabase, Anthropic, Analytics         | API connections                     |
| `frame-ancestors` | `'none'`                               | Prevent clickjacking                |
| `form-action`     | `'self'`                               | Forms submit only to our domain     |
| `base-uri`        | `'self'`                               | Prevent base tag injection          |
| `object-src`      | `'none'`                               | Disable plugins                     |

### CSP Checklist

- [ ] CSP header configured in next.config.js
- [ ] Tested in browser DevTools (no CSP violations)
- [ ] Report-only mode tested first (optional)
- [ ] Third-party scripts whitelisted
- [ ] No inline scripts without nonce (if tightening)

---

## 2. Additional Security Headers

### Required Headers

```typescript
const securityHeaders = [
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Prevent clickjacking
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Control referrer information
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Disable browser features we don't use
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Force HTTPS (Vercel handles this, but explicit is good)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  // XSS protection (legacy browsers)
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
]
```

### Headers Checklist

- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] Referrer-Policy configured
- [ ] Permissions-Policy disables unused features
- [ ] Strict-Transport-Security enabled
- [ ] Headers verified with securityheaders.com

---

## 3. CORS Policy

### API Route CORS Configuration

```typescript
// lib/cors.ts
const allowedOrigins = [
  'https://wokegod.world',
  'https://www.wokegod.world',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
].filter(Boolean)

export function corsHeaders(origin: string | null) {
  const headers = new Headers()

  // Only allow requests from our domains
  if (origin && allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  headers.set('Access-Control-Max-Age', '86400') // 24 hours
  headers.set('Access-Control-Allow-Credentials', 'true')

  return headers
}

// Usage in API route
export async function OPTIONS(req: Request) {
  const origin = req.headers.get('origin')
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  })
}
```

### CORS Checklist

- [ ] CORS only allows production domain
- [ ] Development origin only in dev mode
- [ ] Credentials mode enabled for cookies
- [ ] OPTIONS preflight handled
- [ ] No wildcard (\*) origins in production

---

## 4. Rate Limiting

### Rate Limit Configuration

```typescript
// lib/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = process.env.UPSTASH_REDIS_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_URL,
      token: process.env.UPSTASH_REDIS_TOKEN!,
    })
  : null

// Different limits for different endpoints
export const rateLimits = {
  // Soul Audit: Expensive (Claude API call)
  soulAudit: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1h'), // 5 per hour per IP
        analytics: true,
      })
    : null,

  // Auth: Prevent brute force
  auth: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '15m'), // 10 per 15 min
        analytics: true,
      })
    : null,

  // General API: Generous but bounded
  api: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '1m'), // 100 per minute
        analytics: true,
      })
    : null,

  // Progress updates: Very generous
  progress: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '1m'), // 60 per minute
        analytics: true,
      })
    : null,
}
```

### Rate Limit by Endpoint

| Endpoint             | Limit | Window | Reason                 |
| -------------------- | ----- | ------ | ---------------------- |
| POST /api/soul-audit | 5     | 1 hour | Claude API cost        |
| POST /api/auth/\*    | 10    | 15 min | Brute force prevention |
| GET /api/series      | 100   | 1 min  | Browse traffic         |
| GET /api/daily-bread | 60    | 1 min  | Reading traffic        |
| POST /api/progress   | 60    | 1 min  | Completion marking     |

### Rate Limit Response

```typescript
// Standard 429 response
export function rateLimitResponse(retryAfter: number) {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    },
  )
}
```

### Rate Limiting Checklist

- [ ] Upstash Redis configured (or in-memory fallback)
- [ ] Soul Audit endpoint rate limited (expensive)
- [ ] Auth endpoints rate limited (security)
- [ ] 429 responses include Retry-After header
- [ ] Logging for rate limit hits
- [ ] IP extraction handles proxies (X-Forwarded-For)

---

## 5. Input Validation

### Validation Library Setup

```typescript
// lib/validation.ts
import { z } from 'zod'

// Soul Audit input
export const soulAuditSchema = z.object({
  response: z
    .string()
    .min(10, "Please share a bit more about what you're facing.")
    .max(2000, 'Response is too long. Please keep it under 2000 characters.')
    .transform((val) => sanitizeHtml(val)),
  sabbathPreference: z.enum(['saturday', 'sunday']),
  timezone: z
    .string()
    .refine(
      (tz) => Intl.supportedValuesOf('timeZone').includes(tz),
      'Invalid timezone',
    ),
})

// Session preferences
export const preferencesSchema = z.object({
  sabbathPreference: z.enum(['saturday', 'sunday']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  timezone: z
    .string()
    .refine(
      (tz) => Intl.supportedValuesOf('timeZone').includes(tz),
      'Invalid timezone',
    )
    .optional(),
})

// Day number validation
export const dayNumberSchema = z.object({
  day_number: z.number().int().min(1).max(365),
})

// Series slug validation
export const seriesSlugSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid series slug'),
})
```

### Input Sanitization

```typescript
// lib/sanitize.ts

// Remove HTML tags and dangerous characters
export function sanitizeHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
}

// Sanitize for database queries (Supabase handles this, but defense in depth)
export function sanitizeForDb(input: string): string {
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim()
    .slice(0, 10000) // Hard limit
}

// Validate and sanitize email (if we add email collection)
export function sanitizeEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const cleaned = email.toLowerCase().trim()
  return emailRegex.test(cleaned) ? cleaned : null
}
```

### Validation in API Routes

```typescript
// app/api/soul-audit/route.ts
import { soulAuditSchema } from '@/lib/validation'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Validate input
    const result = soulAuditSchema.safeParse(body)
    if (!result.success) {
      return Response.json(
        { error: result.error.errors[0].message },
        { status: 400 },
      )
    }

    const { response, sabbathPreference, timezone } = result.data
    // ... continue with validated data
  } catch (error) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
}
```

### Input Validation Checklist

- [ ] Zod schemas for all API inputs
- [ ] HTML tags stripped from text inputs
- [ ] Max length enforced on all strings
- [ ] Enum values validated
- [ ] Timezone validated against IANA list
- [ ] Numbers validated for range
- [ ] Error messages don't expose internals

---

## 6. Authentication Security

### Session Token Security

```typescript
// lib/session.ts
import { cookies } from 'next/headers'

const COOKIE_NAME = 'euongelion_session'
const COOKIE_OPTIONS = {
  httpOnly: true, // No JavaScript access
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'lax' as const, // CSRF protection
  maxAge: 60 * 60 * 24 * 30, // 30 days
  path: '/',
}

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, COOKIE_OPTIONS)
}

export function getSessionToken(): string | null {
  return cookies().get(COOKIE_NAME)?.value ?? null
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME)
}
```

### Magic Link Security (Supabase Auth)

```typescript
// Auth callback validation
// app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      // Don't expose error details
      return NextResponse.redirect(
        new URL('/auth/error?reason=invalid', requestUrl.origin),
      )
    }
  }

  return NextResponse.redirect(new URL('/daily-bread', requestUrl.origin))
}
```

### Authentication Checklist

- [ ] Session tokens are UUIDs (unpredictable)
- [ ] Cookies are httpOnly
- [ ] Cookies are Secure in production
- [ ] Cookies have SameSite=Lax
- [ ] Magic links expire (Supabase default: 1 hour)
- [ ] Failed auth doesn't reveal user existence
- [ ] Rate limiting on auth endpoints
- [ ] Session validation on every protected route

---

## 7. Data Encryption

### Data at Rest

| Data         | Encryption | Provider             |
| ------------ | ---------- | -------------------- |
| Database     | AES-256    | Supabase (automatic) |
| Backups      | AES-256    | Supabase (automatic) |
| File storage | AES-256    | Supabase (if used)   |

### Data in Transit

| Connection         | Encryption | Notes                 |
| ------------------ | ---------- | --------------------- |
| Client ↔ Server    | TLS 1.3    | Vercel enforces HTTPS |
| Server ↔ Supabase  | TLS 1.2+   | Supabase requires     |
| Server ↔ Anthropic | TLS 1.2+   | API requires          |

### Sensitive Data Handling

```typescript
// Never log sensitive data
export function logSafeRequest(req: Request, context: string) {
  console.log(`[${context}] ${req.method} ${new URL(req.url).pathname}`)
  // Never log: body content, cookies, auth headers
}

// Never return internal errors to client
export function safeErrorResponse(error: Error) {
  console.error('Internal error:', error) // Log full error server-side
  return Response.json(
    { error: 'Something went wrong. Please try again.' }, // Generic to client
    { status: 500 },
  )
}
```

### Encryption Checklist

- [ ] HTTPS enforced (Vercel automatic)
- [ ] HSTS header configured
- [ ] Database encryption enabled (Supabase automatic)
- [ ] API keys never logged
- [ ] User input never logged verbatim
- [ ] Error messages sanitized before client

---

## 8. API Security

### API Key Protection

```typescript
// Environment variable validation
// lib/env.ts
export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ANTHROPIC_API_KEY',
  ]

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
  }

  // Ensure server-only keys aren't exposed
  if (typeof window !== 'undefined') {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Server key exposed to client!')
    }
    if (process.env.ANTHROPIC_API_KEY) {
      throw new Error('API key exposed to client!')
    }
  }
}
```

### Supabase Client Separation

```typescript
// lib/supabase/client.ts - Client-side (anon key only)
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// lib/supabase/server.ts - Server-side (service role)
import { createClient } from '@supabase/supabase-js'

// Only import this in server components/API routes
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
```

### API Security Checklist

- [ ] Service role key only used server-side
- [ ] Anthropic API key only used server-side
- [ ] Environment variables validated at startup
- [ ] API routes check for required auth
- [ ] No sensitive data in URL parameters
- [ ] Request body size limited
- [ ] Response doesn't leak internal state

---

## 9. Row Level Security (RLS)

### Supabase RLS Policies

```sql
-- Series: Public read for published
ALTER TABLE series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published series"
  ON series FOR SELECT
  USING (published = true);

-- Days: Public read if series is published
ALTER TABLE days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read days of published series"
  ON days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM series
      WHERE series.id = days.series_id
      AND series.published = true
    )
  );

-- User Sessions: Service role only (managed via API)
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- No policies = service role only access

-- Progress: Service role only
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- No policies = service role only access

-- Soul Audits: Service role only
ALTER TABLE soul_audits ENABLE ROW LEVEL SECURITY;

-- No policies = service role only access
```

### RLS Checklist

- [ ] RLS enabled on all tables
- [ ] Public tables have explicit SELECT policies
- [ ] Private tables have no anon policies
- [ ] Policies tested with anon key
- [ ] Service role bypasses confirmed working
- [ ] No INSERT/UPDATE/DELETE for anon users

---

## 10. GDPR/Privacy Compliance

### Data We Collect

| Data                   | Purpose           | Retention        | Legal Basis         |
| ---------------------- | ----------------- | ---------------- | ------------------- |
| Session token          | Track progress    | 30 days (cookie) | Legitimate interest |
| Soul Audit response    | Match to series   | Session lifetime | Consent (implicit)  |
| Series progress        | Resume experience | Session lifetime | Legitimate interest |
| Preferences            | User experience   | Session lifetime | Legitimate interest |
| Analytics (aggregated) | Improve service   | 12 months        | Legitimate interest |

### Data We Don't Collect (MVP)

- Email addresses (unless user opts into auth)
- Names
- IP addresses (not stored)
- Device identifiers
- Location (only timezone, user-provided)
- Payment information

### Privacy Implementation

```typescript
// Privacy-respecting analytics
export function trackEvent(name: string, properties?: Record<string, any>) {
  // Strip any PII before sending
  const safeProps = properties ? stripPII(properties) : undefined

  if (window.plausible) {
    window.plausible(name, { props: safeProps })
  }
}

function stripPII(obj: Record<string, any>): Record<string, any> {
  const piiFields = ['email', 'name', 'phone', 'address', 'ip']
  const result = { ...obj }

  for (const field of piiFields) {
    if (field in result) {
      delete result[field]
    }
  }

  return result
}
```

### Cookie Consent (If Required)

```typescript
// For EU users, may need cookie banner
// components/CookieConsent.tsx
export function CookieConsent() {
  const [consent, setConsent] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('cookie_consent');
    if (stored) {
      setConsent(stored === 'true');
    }
  }, []);

  if (consent !== null) return null; // Already decided

  return (
    <div className="fixed bottom-0 inset-x-0 bg-tehom-black text-scroll-white p-4">
      <p>We use cookies to save your progress. No personal data is collected.</p>
      <button onClick={() => {
        localStorage.setItem('cookie_consent', 'true');
        setConsent(true);
      }}>
        Accept
      </button>
    </div>
  );
}
```

### Privacy Checklist

- [ ] Privacy policy page created (`/privacy`)
- [ ] Privacy policy explains data collected
- [ ] Cookie consent if required (EU)
- [ ] Data retention limits defined
- [ ] No PII in analytics
- [ ] Session data can be cleared by user
- [ ] No third-party tracking without consent
- [ ] Contact method for privacy questions

---

## 11. Dependency Security

### Dependency Audit

```bash
# Run regularly
npm audit

# Fix vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated
```

### Dependabot Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 10
    ignore:
      - dependency-name: '*'
        update-types: ['version-update:semver-major']
```

### Dependency Checklist

- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] Dependabot or Renovate configured
- [ ] Lock file (package-lock.json) committed
- [ ] No unused dependencies
- [ ] Major version updates reviewed manually

---

## 12. Error Handling Security

### Safe Error Responses

```typescript
// lib/errors.ts

// Custom error class for user-facing errors
export class UserError extends Error {
  constructor(
    public userMessage: string,
    public statusCode: number = 400,
    public internalMessage?: string,
  ) {
    super(internalMessage || userMessage)
    this.name = 'UserError'
  }
}

// Error handler for API routes
export function handleApiError(error: unknown): Response {
  // Known user errors
  if (error instanceof UserError) {
    return Response.json(
      { error: error.userMessage },
      { status: error.statusCode },
    )
  }

  // Zod validation errors
  if (error instanceof z.ZodError) {
    return Response.json(
      { error: error.errors[0]?.message || 'Invalid input' },
      { status: 400 },
    )
  }

  // Unknown errors - log but don't expose
  console.error('Unhandled error:', error)
  return Response.json(
    { error: 'Something went wrong. Please try again.' },
    { status: 500 },
  )
}
```

### Error Logging

```typescript
// lib/logger.ts
export function logError(error: Error, context: Record<string, any> = {}) {
  // Log to console (visible in Vercel logs)
  console.error({
    message: error.message,
    stack: error.stack,
    ...context,
    // Don't log: user input, session tokens, API keys
  })

  // If using Sentry
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    })
  }
}
```

### Error Handling Checklist

- [ ] No stack traces in production responses
- [ ] No internal error messages to client
- [ ] All errors logged server-side
- [ ] Sensitive data stripped from logs
- [ ] Custom error pages (404, 500)
- [ ] Error tracking configured (optional)

---

## 13. Deployment Security

### Vercel Security Settings

| Setting               | Value     | Location         |
| --------------------- | --------- | ---------------- |
| HTTPS                 | Enforced  | Automatic        |
| Environment Variables | Encrypted | Project Settings |
| Build Logs            | Private   | Default          |
| Source Protection     | Enabled   | Project Settings |

### Pre-Deployment Checklist

- [ ] All environment variables set in Vercel
- [ ] Service role key not in client bundle
- [ ] Build succeeds without exposing secrets
- [ ] Preview deployments use staging database
- [ ] Production domain verified

### Production Checklist

- [ ] HTTPS working correctly
- [ ] Security headers verified (securityheaders.com)
- [ ] CSP not blocking critical resources
- [ ] Cookies set correctly (check DevTools)
- [ ] Rate limiting active
- [ ] Error pages working
- [ ] No console errors in production

---

## 14. Security Monitoring

### What to Monitor

| Metric            | Alert Threshold | Action                    |
| ----------------- | --------------- | ------------------------- |
| 4xx error rate    | > 5%            | Check for attacks or bugs |
| 5xx error rate    | > 1%            | Check logs immediately    |
| Rate limit hits   | > 100/hour      | Potential abuse           |
| Auth failures     | > 50/hour       | Potential brute force     |
| API response time | > 5s average    | Performance issue         |

### Logging Strategy

```typescript
// Log security-relevant events
export function logSecurityEvent(event: {
  type: 'auth_failure' | 'rate_limit' | 'validation_error' | 'suspicious_input'
  ip: string
  path: string
  details?: string
}) {
  console.log(`[SECURITY] ${event.type}`, {
    ip: event.ip,
    path: event.path,
    details: event.details,
    timestamp: new Date().toISOString(),
  })
}
```

### Monitoring Checklist

- [ ] Vercel Analytics enabled
- [ ] Error rates monitored
- [ ] Rate limit events logged
- [ ] Auth failures logged
- [ ] Alerting configured for anomalies

---

## 15. Security Testing

### Pre-Launch Security Checklist

#### Authentication & Sessions

- [ ] Session tokens are cryptographically random
- [ ] Sessions expire appropriately
- [ ] Logout clears session completely
- [ ] No session fixation vulnerabilities

#### Input Handling

- [ ] All user input validated
- [ ] All user input sanitized
- [ ] SQL injection prevented (Supabase handles)
- [ ] XSS prevented (React handles most, CSP for rest)

#### Authorization

- [ ] Protected routes require auth
- [ ] Users can only access their data
- [ ] RLS policies enforced

#### Data Protection

- [ ] HTTPS enforced everywhere
- [ ] Sensitive data encrypted at rest
- [ ] No secrets in code or logs
- [ ] Privacy policy accurate

#### Infrastructure

- [ ] Dependencies up to date
- [ ] No known vulnerabilities
- [ ] Security headers configured
- [ ] Rate limiting active

### Security Testing Tools

| Tool                                                      | Purpose                    | When to Use               |
| --------------------------------------------------------- | -------------------------- | ------------------------- |
| [securityheaders.com](https://securityheaders.com)        | Check HTTP headers         | Pre-launch, after changes |
| [Observatory by Mozilla](https://observatory.mozilla.org) | Overall security grade     | Pre-launch                |
| `npm audit`                                               | Dependency vulnerabilities | Every deploy              |
| Browser DevTools                                          | Cookie settings, CSP       | Development               |

---

## Quick Reference: Security Headers

```typescript
// Complete security headers configuration
// next.config.js

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.io https://va.vercel-scripts.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.supabase.co https://api.anthropic.com https://plausible.io;
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'self';
  object-src 'none';
`

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim(),
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
]

module.exports = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}
```

---

_This security checklist should be reviewed before every major release and audited quarterly._
