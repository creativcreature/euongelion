# API Routes

**Version:** 1.0

---

## OVERVIEW

All routes use Next.js 14 App Router conventions. Located in `app/api/`.

---

## ROUTES

### POST /api/soul-audit

Matches user input to best series.

**Request:**

```typescript
interface SoulAuditRequest {
  response: string // User's heart response (max 2000 chars)
  sabbathPreference: 'saturday' | 'sunday'
  timezone: string // IANA timezone, e.g., "America/New_York"
}
```

**Response (Success - 200):**

```typescript
interface SoulAuditResponse {
  success: true
  matched_series: {
    slug: string
    title: string
    subtitle: string
    reasoning: string // Why this match
  }
  confidence: number // 0-1
  alternatives: {
    slug: string
    title: string
  }[]
  session_created: boolean
}
```

**Response (Error - 400/429/500):**

```typescript
interface ErrorResponse {
  error: string
}
```

**Implementation:**

```typescript
// app/api/soul-audit/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sanitizeInput } from '@/lib/security'
import { createSession, getSessionToken, validateSession } from '@/lib/session'
import { matchSeries } from '@/lib/claude'

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') ?? 'anonymous'
    // ... rate limit check

    // Parse and validate input
    const body = await req.json()
    const userInput = sanitizeInput(body.response)

    if (!userInput || userInput.length < 10) {
      return Response.json(
        { error: "Please share more about what's on your heart." },
        { status: 400 },
      )
    }

    // Check existing session
    const existingToken = getSessionToken()
    if (existingToken) {
      const existingSession = await validateSession(existingToken)
      if (existingSession && existingSession.soul_audit_count >= 3) {
        return Response.json(
          { error: 'Maximum Soul Audits reached. Browse series instead.' },
          { status: 400 },
        )
      }
    }

    // Get all series for matching
    const { data: allSeries } = await supabaseAdmin
      .from('series')
      .select(
        'slug, title, subtitle, soul_audit_keywords, emotional_tones, life_circumstances',
      )
      .eq('published', true)

    // Match with Claude API
    const match = await matchSeries(userInput, allSeries)

    // Create or update session
    const session = await createSession({
      seriesId: match.matchedSeriesId,
      sabbathPreference: body.sabbathPreference || 'sunday',
      pathway: match.suggestedPathway,
      timezone: body.timezone || 'UTC',
    })

    return Response.json({
      success: true,
      matched_series: {
        slug: match.slug,
        title: match.title,
        subtitle: match.subtitle,
        reasoning: match.reasoning,
      },
      confidence: match.confidence,
      alternatives: match.alternatives,
      session_created: true,
    })
  } catch (error) {
    console.error('Soul Audit error:', error)
    return Response.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }
}
```

---

### GET /api/daily-bread

Get today's devotional content.

**Request:** No body. Session token from cookie.

**Response (Success - 200):**

```typescript
interface DailyBreadResponse {
  series: {
    slug: string
    title: string
    subtitle: string
    pathway: string
    day_count: number
  }
  today: {
    day_number: number
    title: string
    chiasm_position: string
    modules: Module[]
    is_locked: boolean
    unlock_time: string | null // ISO timestamp if locked
  }
  progress: {
    current_day: number
    total_days: number
    completed_days: number[]
  }
  available_days: number[] // Days user can access
  locked_days: number[] // Days not yet unlocked
}
```

**Response (No Session - 401):**

```typescript
{
  error: 'No active session. Complete Soul Audit first.'
}
```

**Implementation:**

```typescript
// app/api/daily-bread/route.ts
import { NextRequest } from 'next/server'
import { getSessionToken, validateSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { canAccessDay, getNextUnlockTime } from '@/lib/dayGating'

export async function GET(req: NextRequest) {
  try {
    // Validate session
    const token = getSessionToken()
    if (!token) {
      return Response.json({ error: 'No active session' }, { status: 401 })
    }

    const session = await validateSession(token)
    if (!session || !session.active_series_id) {
      return Response.json({ error: 'No active series' }, { status: 401 })
    }

    // Get series with days
    const { data: series } = await supabaseAdmin
      .from('series')
      .select('*, days(*)')
      .eq('id', session.active_series_id)
      .single()

    if (!series) {
      return Response.json({ error: 'Series not found' }, { status: 404 })
    }

    // Calculate which days are accessible
    const availableDays: number[] = []
    const lockedDays: number[] = []

    for (let i = 1; i <= series.day_count; i++) {
      if (canAccessDay(i, session.start_date, session.timezone)) {
        availableDays.push(i)
      } else {
        lockedDays.push(i)
      }
    }

    // Get current day's content
    const currentDayNum = Math.min(
      session.current_day,
      Math.max(...availableDays, 1),
    )
    const todayContent = series.days.find(
      (d: any) => d.day_number === currentDayNum,
    )

    // Get completed days
    const { data: progressData } = await supabaseAdmin
      .from('progress')
      .select('day_number')
      .eq('session_id', session.id)
      .eq('series_id', series.id)

    const completedDays = progressData?.map((p: any) => p.day_number) ?? []

    return Response.json({
      series: {
        slug: series.slug,
        title: series.title,
        subtitle: series.subtitle,
        pathway: series.pathway,
        day_count: series.day_count,
      },
      today: {
        day_number: currentDayNum,
        title: todayContent?.title,
        chiasm_position: todayContent?.chiasm_position,
        modules: todayContent?.modules ?? [],
        is_locked: !availableDays.includes(currentDayNum),
        unlock_time:
          lockedDays.length > 0
            ? getNextUnlockTime(
                session.start_date,
                lockedDays[0],
                session.timezone,
              )
            : null,
      },
      progress: {
        current_day: currentDayNum,
        total_days: series.day_count,
        completed_days: completedDays,
      },
      available_days: availableDays,
      locked_days: lockedDays,
    })
  } catch (error) {
    console.error('Daily Bread error:', error)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
```

---

### POST /api/progress

Mark a day as complete.

**Request:**

```typescript
interface ProgressRequest {
  day_number: number
}
```

**Response (Success - 200):**

```typescript
interface ProgressResponse {
  success: true
  completed_day: number
  next_day: number | null
  series_complete: boolean
}
```

**Implementation:**

```typescript
// app/api/progress/route.ts
export async function POST(req: NextRequest) {
  try {
    const token = getSessionToken()
    if (!token) {
      return Response.json({ error: 'No session' }, { status: 401 })
    }

    const session = await validateSession(token)
    if (!session) {
      return Response.json({ error: 'Invalid session' }, { status: 401 })
    }

    const { day_number } = await req.json()

    // Validate day number
    if (typeof day_number !== 'number' || day_number < 1 || day_number > 7) {
      return Response.json({ error: 'Invalid day number' }, { status: 400 })
    }

    // Record progress
    await supabaseAdmin.from('progress').upsert({
      session_id: session.id,
      series_id: session.active_series_id,
      day_number: day_number,
    })

    // Update current day
    const nextDay = day_number + 1
    await supabaseAdmin
      .from('user_sessions')
      .update({ current_day: nextDay })
      .eq('id', session.id)

    // Check if series complete
    const { data: series } = await supabaseAdmin
      .from('series')
      .select('day_count')
      .eq('id', session.active_series_id)
      .single()

    const seriesComplete = day_number >= (series?.day_count ?? 5)

    return Response.json({
      success: true,
      completed_day: day_number,
      next_day: seriesComplete ? null : nextDay,
      series_complete: seriesComplete,
    })
  } catch (error) {
    console.error('Progress error:', error)
    return Response.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
```

---

### GET /api/series

Get all published series for browsing.

**Response:**

```typescript
interface SeriesListResponse {
  series: {
    slug: string
    title: string
    subtitle: string
    pathway: string
    day_count: number
    core_theme: string
  }[]
}
```

---

### GET /api/series/[slug]

Get single series details.

**Response:**

```typescript
interface SeriesDetailResponse {
  slug: string
  title: string
  subtitle: string
  pathway: string
  day_count: number
  core_theme: string
  days: {
    day_number: number
    title: string
    chiasm_position: string
  }[]
}
```

---

### POST /api/session/start-series

Start a specific series (from browse page).

**Request:**

```typescript
interface StartSeriesRequest {
  series_slug: string
}
```

**Response:**

```typescript
interface StartSeriesResponse {
  success: true
  series: {
    slug: string
    title: string
  }
}
```

---

### DELETE /api/session

Clear session (for testing/reset).

**Response:**

```typescript
{ success: true, message: 'Session cleared' }
```

---

## HELPER FUNCTIONS

### Day Gating Logic

```typescript
// lib/dayGating.ts
import { addDays, set, isAfter } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export function canAccessDay(
  dayNumber: number,
  startDateStr: string,
  timezone: string,
): boolean {
  const now = new Date()
  const userNow = toZonedTime(now, timezone)

  const startDate = new Date(startDateStr)
  const dayUnlockDate = addDays(startDate, dayNumber - 1)
  const unlockTime = set(dayUnlockDate, { hours: 7, minutes: 0, seconds: 0 })

  return isAfter(userNow, unlockTime)
}

export function getNextUnlockTime(
  startDateStr: string,
  nextDayNumber: number,
  timezone: string,
): string {
  const startDate = new Date(startDateStr)
  const dayUnlockDate = addDays(startDate, nextDayNumber - 1)
  const unlockTime = set(dayUnlockDate, { hours: 7, minutes: 0, seconds: 0 })

  return unlockTime.toISOString()
}
```

### Claude API Matching

```typescript
// lib/claude.ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function matchSeries(userInput: string, allSeries: any[]) {
  const seriesContext = allSeries.map((s) => ({
    slug: s.slug,
    title: s.title,
    keywords: s.soul_audit_keywords,
    tones: s.emotional_tones,
    circumstances: s.life_circumstances,
  }))

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Match this user's response to the best devotional series.

USER'S RESPONSE:
"${userInput}"

AVAILABLE SERIES:
${JSON.stringify(seriesContext, null, 2)}

Respond in JSON only:
{
  "slug": "series-slug",
  "confidence": 0.85,
  "reasoning": "Brief explanation why this matches",
  "suggestedPathway": "sleep|awake|shepherd",
  "alternatives": ["slug-2", "slug-3"]
}`,
      },
    ],
  })

  // Parse response
  const text =
    response.content[0].type === 'text' ? response.content[0].text : ''
  const match = JSON.parse(text)

  // Enrich with series data
  const matchedSeries = allSeries.find((s) => s.slug === match.slug)

  return {
    ...match,
    matchedSeriesId: matchedSeries?.id,
    title: matchedSeries?.title,
    subtitle: matchedSeries?.subtitle,
  }
}
```

---

## ERROR CODES

| Status | Meaning           | When Used                |
| ------ | ----------------- | ------------------------ |
| 200    | Success           | Request completed        |
| 400    | Bad Request       | Invalid input            |
| 401    | Unauthorized      | No/invalid session       |
| 404    | Not Found         | Series/day doesn't exist |
| 429    | Too Many Requests | Rate limit exceeded      |
| 500    | Server Error      | Something broke          |
