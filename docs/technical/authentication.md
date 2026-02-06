# Authentication & Security

This document covers the authentication flow and security measures in EUONGELION.

## Overview

**MVP Approach:** Anonymous sessions via httpOnly cookies (no user accounts)
**Future:** Supabase Auth with optional account creation

## Session Management

### How It Works

```
1. First visit → No cookie → Show Soul Audit
2. Complete Soul Audit → Create session → Set cookie
3. Return visit → Cookie exists → Validate & restore session
4. Cookie expires → Start fresh
```

### Session Token

```typescript
// Generate secure session token
const sessionToken = crypto.randomUUID()
// Example: "550e8400-e29b-41d4-a716-446655440000"
```

### Cookie Configuration

```typescript
// lib/session.ts
import { cookies } from 'next/headers'

const COOKIE_NAME = 'euongelion_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export function setSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true, // Can't be accessed by JavaScript (XSS protection)
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'lax', // CSRF protection, allows same-site navigation
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
}

export function getSessionToken(): string | null {
  return cookies().get(COOKIE_NAME)?.value ?? null
}

export function clearSession() {
  cookies().delete(COOKIE_NAME)
}
```

### Session Validation

```typescript
export async function validateSession(token: string) {
  const { data: session, error } = await supabaseAdmin
    .from('user_sessions')
    .select('*, series:active_series_id(*)')
    .eq('session_token', token)
    .single()

  if (error || !session) {
    return null
  }

  // Update last activity
  await supabaseAdmin
    .from('user_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', session.id)

  return session
}
```

### Create Session

```typescript
export async function createSession(data: {
  seriesId: string
  sabbathPreference: 'saturday' | 'sunday'
  pathway: 'sleep' | 'awake' | 'shepherd'
  timezone: string
}) {
  const token = crypto.randomUUID()

  const { data: session, error } = await supabaseAdmin
    .from('user_sessions')
    .insert({
      session_token: token,
      active_series_id: data.seriesId,
      start_date: new Date().toISOString().split('T')[0],
      sabbath_preference: data.sabbathPreference,
      pathway: data.pathway,
      timezone: data.timezone,
      soul_audit_count: 1,
    })
    .select()
    .single()

  if (error) throw error

  setSessionCookie(token)
  return session
}
```

## Security Measures

### 1. Input Sanitization

```typescript
// lib/security.ts

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .slice(0, 2000) // Max length
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[<>'"&]/g, '') // Strip dangerous chars
}

// Usage
const cleanInput = sanitizeInput(req.body.response)
```

### 2. Rate Limiting

```typescript
// lib/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

export const rateLimits = {
  soulAudit: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1h'), // 10 per hour
  }),

  dailyBread: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1m'), // 60 per minute
  }),

  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1m'), // 100 per minute
  }),
}

// Usage in API route
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success } = await rateLimits.soulAudit.limit(ip)

  if (!success) {
    return Response.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429 },
    )
  }

  // Continue with request...
}
```

**Development Alternative (No Redis):**

```typescript
// Simple in-memory rate limiter
const requests = new Map<string, number[]>()

export function checkRateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const timestamps = requests.get(key) ?? []
  const recent = timestamps.filter((t) => now - t < windowMs)

  if (recent.length >= max) {
    return false
  }

  recent.push(now)
  requests.set(key, recent)
  return true
}
```

### 3. CSRF Protection

Handled by `sameSite: 'lax'` cookie attribute. Requests from other sites won't include the cookie.

### 4. SQL Injection Prevention

Supabase uses parameterized queries automatically:

```typescript
// Safe - Supabase parameterizes this
const { data } = await supabase
  .from('series')
  .select('*')
  .eq('slug', userProvidedSlug) // Automatically escaped

// NEVER do this:
// const { data } = await supabase.rpc('raw_query', {
//   sql: `SELECT * FROM series WHERE slug = '${userProvidedSlug}'`
// });
```

### 5. Environment Variable Security

```typescript
// Never expose server-side secrets
// OK to expose (public):
// NEXT_PUBLIC_SUPABASE_URL
// NEXT_PUBLIC_SUPABASE_ANON_KEY

// Server only (never in client code):
// SUPABASE_SERVICE_ROLE_KEY
// ANTHROPIC_API_KEY
```

## Data Privacy (MVP)

| Data Type   | Collecting? | Reason                             |
| ----------- | ----------- | ---------------------------------- |
| Email       | No          | Not needed for MVP                 |
| Password    | No          | No accounts                        |
| Name        | No          | Anonymous                          |
| IP Address  | No\*        | Only for rate limiting, not stored |
| Device Info | No          | Not needed                         |
| Location    | No          | Only timezone (user-provided)      |

\*IP used transiently for rate limiting, never persisted.

## Error Handling

```typescript
// Consistent error responses
export function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

// Usage
if (!session) {
  return errorResponse('Session not found', 401)
}

if (!validInput) {
  return errorResponse('Invalid input', 400)
}

// Never expose internal errors
try {
  // ... database operation
} catch (error) {
  console.error('Database error:', error) // Log internally
  return errorResponse('Something went wrong', 500) // Generic to user
}
```

## Future: User Accounts

When adding accounts, use Supabase Auth:

### Setup

```typescript
// lib/supabase/auth.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const supabaseAuth = createClientComponentClient()

// Sign up
const { data, error } = await supabaseAuth.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword123',
})

// Sign in
const { data, error } = await supabaseAuth.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword123',
})

// Sign out
await supabaseAuth.auth.signOut()
```

### Migration Path

```
1. Add Supabase Auth
2. Add "Create Account" option (optional, not required)
3. If user creates account:
   - Link anonymous session to user_id
   - Preserve all progress and history
4. If user doesn't create account:
   - Continue with anonymous session
   - Works exactly as before
```

### Password Requirements

```typescript
const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 72,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false, // Balance security/usability
}

function validatePassword(password: string): boolean {
  if (password.length < PASSWORD_RULES.minLength) return false
  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) return false
  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) return false
  if (PASSWORD_RULES.requireNumber && !/[0-9]/.test(password)) return false
  return true
}
```

## Security Checklist

Before deploying:

- [ ] All API routes validate session token
- [ ] All user input sanitized
- [ ] Rate limiting active on Soul Audit
- [ ] Environment variables not exposed in client
- [ ] HTTPS enforced (Vercel does this automatically)
- [ ] Cookies use httpOnly, secure, sameSite
- [ ] Error messages don't expose internals
- [ ] RLS policies applied in Supabase
- [ ] Service role key only used server-side

## Incident Response

If a security issue is discovered:

1. Assess the scope and impact
2. Rotate affected credentials immediately
3. Deploy fix
4. Review logs for exploitation
5. Notify affected users if necessary
6. Document and post-mortem
