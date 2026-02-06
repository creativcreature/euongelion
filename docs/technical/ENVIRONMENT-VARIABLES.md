# EUONGELION Environment Variables

**Version:** 1.0
**Last Updated:** January 17, 2026

---

## Overview

Complete reference for all environment variables required to run EUONGELION. Variables are organized by service and include validation requirements.

**File Location:** `.env.local` (development), Vercel Environment Variables (production)

---

## Quick Setup Checklist

```bash
# Minimum required for development
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Supabase Configuration

### NEXT_PUBLIC_SUPABASE_URL

| Property           | Value                                                  |
| ------------------ | ------------------------------------------------------ |
| **Required**       | Yes                                                    |
| **Client Exposed** | Yes (NEXT*PUBLIC*)                                     |
| **Description**    | Supabase project URL for database and auth connections |
| **Format**         | `https://<project-ref>.supabase.co`                    |
| **Where to Get**   | Supabase Dashboard > Project Settings > API            |

**Example:**

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
```

**Validation:**

- Must start with `https://`
- Must end with `.supabase.co`
- Project reference is 20 lowercase alphanumeric characters

---

### NEXT_PUBLIC_SUPABASE_ANON_KEY

| Property           | Value                                                                              |
| ------------------ | ---------------------------------------------------------------------------------- |
| **Required**       | Yes                                                                                |
| **Client Exposed** | Yes (NEXT*PUBLIC*)                                                                 |
| **Description**    | Public anonymous key for client-side Supabase operations. Limited by RLS policies. |
| **Format**         | JWT token (eyJ...)                                                                 |
| **Where to Get**   | Supabase Dashboard > Project Settings > API > anon public                          |

**Example:**

```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MDAwMDAwMCwiZXhwIjoxOTU1MDAwMDAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Security Note:**

- Safe to expose in browser (public key)
- Access limited by Row Level Security (RLS) policies
- Can only read published content

---

### SUPABASE_SERVICE_ROLE_KEY

| Property           | Value                                                             |
| ------------------ | ----------------------------------------------------------------- |
| **Required**       | Yes                                                               |
| **Client Exposed** | No (SERVER ONLY)                                                  |
| **Description**    | Admin key that bypasses RLS. Used in API routes only.             |
| **Format**         | JWT token (eyJ...)                                                |
| **Where to Get**   | Supabase Dashboard > Project Settings > API > service_role secret |

**Example:**

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQwMDAwMDAwLCJleHAiOjE5NTUwMDAwMDB9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Security Warning:**

- NEVER expose in client-side code
- NEVER commit to git
- Only use in server-side API routes
- Has full database access, bypasses all RLS

---

## Anthropic (Claude API)

### ANTHROPIC_API_KEY

| Property           | Value                                                             |
| ------------------ | ----------------------------------------------------------------- |
| **Required**       | Yes                                                               |
| **Client Exposed** | No (SERVER ONLY)                                                  |
| **Description**    | API key for Claude AI, used for Soul Audit matching               |
| **Format**         | `sk-ant-api03-...`                                                |
| **Where to Get**   | [console.anthropic.com](https://console.anthropic.com) > API Keys |

**Example:**

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Usage:**

- Soul Audit series matching
- Model: `claude-sonnet-4-20250514` (low latency)
- Estimated cost: ~$0.003 per Soul Audit

**Security Warning:**

- NEVER expose in client-side code
- NEVER commit to git
- Set usage limits in Anthropic console

---

## Application Configuration

### NEXT_PUBLIC_APP_URL

| Property           | Value                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| **Required**       | Yes                                                                           |
| **Client Exposed** | Yes (NEXT*PUBLIC*)                                                            |
| **Description**    | Base URL of the application. Used for OG images, share links, auth redirects. |
| **Format**         | Full URL with protocol, no trailing slash                                     |
| **Where to Get**   | Your deployment URL                                                           |

**Examples:**

```bash
# Development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Staging
NEXT_PUBLIC_APP_URL=https://staging.wokegod.world

# Production
NEXT_PUBLIC_APP_URL=https://wokegod.world
```

**Used For:**

- Open Graph image URLs
- Share link generation
- Supabase auth callback URLs
- Canonical URLs for SEO

---

### NEXT_PUBLIC_UNLOCK_HOUR

| Property           | Value                                                                     |
| ------------------ | ------------------------------------------------------------------------- |
| **Required**       | No                                                                        |
| **Client Exposed** | Yes (NEXT*PUBLIC*)                                                        |
| **Default**        | `7`                                                                       |
| **Description**    | Hour of day (0-23) when new devotional content unlocks in user's timezone |
| **Format**         | Integer 0-23                                                              |

**Example:**

```
NEXT_PUBLIC_UNLOCK_HOUR=7
```

**Behavior:**

- Day 1 available immediately upon starting series
- Day 2 unlocks at 7:00 AM local time the next day
- Day N unlocks at 7:00 AM local time on day N

---

## Rate Limiting (Optional)

### UPSTASH_REDIS_URL

| Property           | Value                                                                |
| ------------------ | -------------------------------------------------------------------- |
| **Required**       | No (recommended for production)                                      |
| **Client Exposed** | No (SERVER ONLY)                                                     |
| **Description**    | Upstash Redis URL for serverless rate limiting                       |
| **Format**         | `https://<database>.upstash.io`                                      |
| **Where to Get**   | [console.upstash.com](https://console.upstash.com) > Create Database |

**Example:**

```
UPSTASH_REDIS_URL=https://us1-merry-cat-12345.upstash.io
```

---

### UPSTASH_REDIS_TOKEN

| Property           | Value                                                                    |
| ------------------ | ------------------------------------------------------------------------ |
| **Required**       | No (required if UPSTASH_REDIS_URL is set)                                |
| **Client Exposed** | No (SERVER ONLY)                                                         |
| **Description**    | Upstash Redis authentication token                                       |
| **Format**         | Base64 string                                                            |
| **Where to Get**   | [console.upstash.com](https://console.upstash.com) > Database > REST API |

**Example:**

```
UPSTASH_REDIS_TOKEN=AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXg=
```

**Fallback:**

- If not configured, uses in-memory rate limiting (resets on deploy)
- In-memory is acceptable for MVP, not production

---

## Analytics (Optional)

### NEXT_PUBLIC_VERCEL_ANALYTICS_ID

| Property           | Value                                                         |
| ------------------ | ------------------------------------------------------------- |
| **Required**       | No                                                            |
| **Client Exposed** | Yes (NEXT*PUBLIC*)                                            |
| **Description**    | Vercel Analytics project ID. Auto-configured if using Vercel. |
| **Format**         | Auto-generated by Vercel                                      |
| **Where to Get**   | Vercel Dashboard > Project > Analytics                        |

**Note:** If deploying to Vercel, this is typically auto-configured. No manual setup needed.

---

### NEXT_PUBLIC_PLAUSIBLE_DOMAIN

| Property           | Value                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| **Required**       | No                                                                           |
| **Client Exposed** | Yes (NEXT*PUBLIC*)                                                           |
| **Description**    | Domain registered with Plausible Analytics (alternative to Vercel Analytics) |
| **Format**         | Domain without protocol                                                      |
| **Where to Get**   | [plausible.io](https://plausible.io) dashboard                               |

**Example:**

```
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=wokegod.world
```

---

### NEXT_PUBLIC_PLAUSIBLE_HOST

| Property           | Value                                      |
| ------------------ | ------------------------------------------ |
| **Required**       | No                                         |
| **Client Exposed** | Yes (NEXT*PUBLIC*)                         |
| **Default**        | `https://plausible.io`                     |
| **Description**    | Plausible host (for self-hosted instances) |
| **Format**         | Full URL                                   |

**Example:**

```
NEXT_PUBLIC_PLAUSIBLE_HOST=https://plausible.io
```

---

## Error Tracking (Optional)

### SENTRY_DSN

| Property           | Value                                                           |
| ------------------ | --------------------------------------------------------------- |
| **Required**       | No                                                              |
| **Client Exposed** | No (use NEXT_PUBLIC_SENTRY_DSN for client)                      |
| **Description**    | Sentry Data Source Name for error tracking                      |
| **Format**         | `https://<key>@<org>.ingest.sentry.io/<project-id>`             |
| **Where to Get**   | [sentry.io](https://sentry.io) > Project Settings > Client Keys |

**Example:**

```
SENTRY_DSN=https://abcdef1234567890@o123456.ingest.sentry.io/1234567
NEXT_PUBLIC_SENTRY_DSN=https://abcdef1234567890@o123456.ingest.sentry.io/1234567
```

---

### SENTRY_AUTH_TOKEN

| Property           | Value                                                   |
| ------------------ | ------------------------------------------------------- |
| **Required**       | No (needed for source maps)                             |
| **Client Exposed** | No (SERVER ONLY)                                        |
| **Description**    | Sentry auth token for uploading source maps             |
| **Format**         | `sntrys_...`                                            |
| **Where to Get**   | [sentry.io](https://sentry.io) > Settings > Auth Tokens |

**Example:**

```
SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Email Service (Future)

### RESEND_API_KEY

| Property           | Value                                               |
| ------------------ | --------------------------------------------------- |
| **Required**       | No (Phase 2)                                        |
| **Client Exposed** | No (SERVER ONLY)                                    |
| **Description**    | Resend API key for transactional emails beyond auth |
| **Format**         | `re_...`                                            |
| **Where to Get**   | [resend.com](https://resend.com) dashboard          |

**Example:**

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Phase 2 Uses:**

- Welcome email sequences
- Series completion celebrations
- Re-engagement emails

---

## Development-Only Variables

### NODE_ENV

| Property           | Value                                            |
| ------------------ | ------------------------------------------------ |
| **Required**       | Auto-set                                         |
| **Client Exposed** | No                                               |
| **Description**    | Node environment (development, production, test) |
| **Values**         | `development`, `production`, `test`              |

**Behavior:**

- `development`: Detailed error messages, no HTTPS cookie requirement
- `production`: Generic error messages, HTTPS cookie requirement
- `test`: Testing mode

---

### NEXT_TELEMETRY_DISABLED

| Property           | Value                     |
| ------------------ | ------------------------- |
| **Required**       | No                        |
| **Client Exposed** | No                        |
| **Description**    | Disable Next.js telemetry |
| **Values**         | `1` to disable            |

**Example:**

```
NEXT_TELEMETRY_DISABLED=1
```

---

## Environment File Templates

### .env.local (Development)

```bash
# ============================================
# EUONGELION Development Environment
# Copy this file to .env.local and fill in values
# ============================================

# === REQUIRED ===

# Supabase (get from Supabase Dashboard > Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Claude API (get from console.anthropic.com)
ANTHROPIC_API_KEY=sk-ant-api03-...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# === OPTIONAL ===

# Content unlock hour (default: 7)
NEXT_PUBLIC_UNLOCK_HOUR=7

# Rate Limiting (Upstash - recommended for prod)
# UPSTASH_REDIS_URL=
# UPSTASH_REDIS_TOKEN=

# Analytics (choose one)
# NEXT_PUBLIC_PLAUSIBLE_DOMAIN=

# Error Tracking
# SENTRY_DSN=
# NEXT_PUBLIC_SENTRY_DSN=

# Development
NEXT_TELEMETRY_DISABLED=1
```

### .env.example (Git-tracked template)

```bash
# ============================================
# EUONGELION Environment Variables
# Copy to .env.local and fill in your values
# ============================================

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Claude API
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_UNLOCK_HOUR=7

# Rate Limiting (optional)
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# Analytics (optional)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=

# Error Tracking (optional)
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

---

## Vercel Environment Variables Setup

### Required for Production

| Variable                        | Environment         | Notes                                               |
| ------------------------------- | ------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Production, Preview | Same for all                                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Same for all                                        |
| `SUPABASE_SERVICE_ROLE_KEY`     | Production, Preview | Keep secret                                         |
| `ANTHROPIC_API_KEY`             | Production, Preview | Keep secret                                         |
| `NEXT_PUBLIC_APP_URL`           | Production          | `https://wokegod.world`                             |
| `NEXT_PUBLIC_APP_URL`           | Preview             | `https://preview.wokegod.world` or use `VERCEL_URL` |

### Setting Variables in Vercel

1. Go to Vercel Dashboard > Project > Settings > Environment Variables
2. Add each variable with appropriate environment scope
3. For `NEXT_PUBLIC_APP_URL` in Preview, you can use:
   ```
   https://${VERCEL_URL}
   ```

---

## Validation Script

Add this to `scripts/validate-env.ts` to verify configuration:

```typescript
// scripts/validate-env.ts
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'NEXT_PUBLIC_APP_URL',
]

const missing = required.filter((key) => !process.env[key])

if (missing.length > 0) {
  console.error('Missing required environment variables:')
  missing.forEach((key) => console.error(`  - ${key}`))
  process.exit(1)
}

// Validate formats
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (!supabaseUrl?.match(/^https:\/\/[a-z0-9]+\.supabase\.co$/)) {
  console.error('Invalid NEXT_PUBLIC_SUPABASE_URL format')
  process.exit(1)
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL
if (!appUrl?.match(/^https?:\/\//)) {
  console.error(
    'NEXT_PUBLIC_APP_URL must include protocol (http:// or https://)',
  )
  process.exit(1)
}

console.log('Environment variables validated successfully')
```

Run during build:

```json
// package.json
{
  "scripts": {
    "prebuild": "ts-node scripts/validate-env.ts"
  }
}
```

---

## Security Reminders

1. **Never commit `.env.local`** - Add to `.gitignore`
2. **Rotate keys if exposed** - If you accidentally commit a secret, rotate it immediately
3. **Use different keys per environment** - Don't share production keys with development
4. **Limit API key permissions** - Set spending limits on Anthropic, use RLS in Supabase
5. **Audit access regularly** - Review who has access to production environment variables

---

_This document should be updated whenever new environment variables are added to the project._
