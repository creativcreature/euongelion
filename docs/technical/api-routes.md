# API Routes

All API routes use Next.js 14+ App Router conventions and are located in `app/api/`.

## Overview

| Endpoint                    | Method | Description                     |
| --------------------------- | ------ | ------------------------------- |
| `/api/soul-audit`           | POST   | Match user to devotional series |
| `/api/daily-bread`          | GET    | Get today's devotional content  |
| `/api/progress`             | POST   | Mark day complete               |
| `/api/series`               | GET    | List all published series       |
| `/api/series/[slug]`        | GET    | Get single series details       |
| `/api/session/start-series` | POST   | Start a specific series         |
| `/api/session`              | DELETE | Clear session                   |

## Soul Audit

### POST /api/soul-audit

Matches user input to the best devotional series using Claude AI.

**Request:**

```typescript
interface SoulAuditRequest {
  response: string // User's text response (max 2000 chars)
  sabbathPreference: 'saturday' | 'sunday'
  timezone: string // IANA timezone, e.g., "America/New_York"
}
```

**Response (200 Success):**

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

**Response (Error):**

```typescript
interface ErrorResponse {
  error: string
}
```

**Status Codes:**

- `200` - Success
- `400` - Invalid input
- `429` - Rate limit exceeded
- `500` - Server error

**Rate Limits:**

- 10 requests per hour per IP
- Max 3 Soul Audits per session

**Example:**

```bash
curl -X POST http://localhost:3000/api/soul-audit \
  -H "Content-Type: application/json" \
  -d '{
    "response": "I feel overwhelmed with work and have no time for anything spiritual",
    "sabbathPreference": "sunday",
    "timezone": "America/New_York"
  }'
```

## Daily Bread

### GET /api/daily-bread

Returns today's devotional content for the current session.

**Request:** No body. Session token from httpOnly cookie.

**Response (200 Success):**

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
  available_days: number[] // Unlocked days
  locked_days: number[] // Still locked
}
```

**Module Types:**

```typescript
type Module =
  | { type: 'scripture'; data: ScriptureData }
  | { type: 'teaching'; data: TeachingData }
  | { type: 'vocab'; data: VocabData }
  | { type: 'story'; data: StoryData }
  | { type: 'insight'; data: InsightData }
  | { type: 'chronology'; data: ChronologyData }
  | { type: 'geography'; data: GeographyData }
  | { type: 'profile'; data: ProfileData }
  | { type: 'bridge'; data: BridgeData }
  | { type: 'visual'; data: VisualData }
  | { type: 'art'; data: ArtData }
  | { type: 'voice'; data: VoiceData }
  | { type: 'comprehension'; data: ComprehensionData }
  | { type: 'reflection'; data: ReflectionData }
  | { type: 'interactive'; data: InteractiveData }
  | { type: 'takeaway'; data: TakeawayData }
  | { type: 'resource'; data: ResourceData }
  | { type: 'prayer'; data: PrayerData }
  | { type: 'match'; data: MatchData }
  | { type: 'order'; data: OrderData }
  | { type: 'reveal'; data: RevealData }
```

**Status Codes:**

- `200` - Success
- `401` - No active session
- `404` - Series not found
- `500` - Server error

**Example:**

```bash
curl http://localhost:3000/api/daily-bread \
  -H "Cookie: euongelion_session=your-session-token"
```

## Progress

### POST /api/progress

Marks a devotional day as complete.

**Request:**

```typescript
interface ProgressRequest {
  day_number: number
}
```

**Response (200 Success):**

```typescript
interface ProgressResponse {
  success: true
  completed_day: number
  next_day: number | null
  series_complete: boolean
}
```

**Status Codes:**

- `200` - Success
- `400` - Invalid day number
- `401` - No session
- `500` - Server error

**Example:**

```bash
curl -X POST http://localhost:3000/api/progress \
  -H "Content-Type: application/json" \
  -H "Cookie: euongelion_session=your-session-token" \
  -d '{"day_number": 1}'
```

## Series

### GET /api/series

Returns all published series.

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

**Example:**

```bash
curl http://localhost:3000/api/series
```

### GET /api/series/[slug]

Returns details for a single series.

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

**Example:**

```bash
curl http://localhost:3000/api/series/too-busy-for-god
```

## Session Management

### POST /api/session/start-series

Starts a specific series from the browse page.

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

### DELETE /api/session

Clears the current session (for testing/reset).

**Response:**

```typescript
{ success: true, message: 'Session cleared' }
```

## Day Gating Logic

Days unlock based on start date and time:

```typescript
function canAccessDay(
  dayNumber: number,
  startDate: string,
  timezone: string,
): boolean {
  // Day 1: Available immediately
  // Day 2+: Unlocks at 7:00 AM local time on subsequent days
  const unlockTime = addDays(startDate, dayNumber - 1)
  unlockTime.setHours(7, 0, 0, 0)
  return now > unlockTime
}
```

## Error Handling

All routes return consistent error format:

```typescript
interface ErrorResponse {
  error: string
}
```

**Status Code Reference:**
| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Request completed |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | No/invalid session |
| 404 | Not Found | Series doesn't exist |
| 429 | Too Many Requests | Rate limit |
| 500 | Server Error | Internal error |

## Security

### Rate Limiting

```typescript
// Soul Audit: 10 per hour
rateLimits.soulAudit = Ratelimit.slidingWindow(10, '1h')

// Daily Bread: 60 per minute
rateLimits.dailyBread = Ratelimit.slidingWindow(60, '1m')

// General: 100 per minute
rateLimits.general = Ratelimit.slidingWindow(100, '1m')
```

### Input Sanitization

All user input is sanitized:

```typescript
function sanitizeInput(input: string): string {
  return input
    .trim()
    .slice(0, 2000) // Max length
    .replace(/<[^>]*>/g, '') // Strip HTML
    .replace(/[<>'"&]/g, '') // Strip dangerous chars
}
```

### Session Security

- httpOnly cookies (no JS access)
- secure flag in production
- sameSite: 'lax' (CSRF protection)
- 30-day expiration

## Claude API Integration

Soul Audit uses Claude for intelligent matching:

```typescript
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
  "reasoning": "Brief explanation",
  "suggestedPathway": "sleep|awake|shepherd",
  "alternatives": ["slug-2", "slug-3"]
}`,
    },
  ],
})
```

## Testing API Routes

### Using Curl

```bash
# Soul Audit
curl -X POST http://localhost:3000/api/soul-audit \
  -H "Content-Type: application/json" \
  -d '{"response": "test", "sabbathPreference": "sunday", "timezone": "UTC"}'

# Daily Bread
curl http://localhost:3000/api/daily-bread \
  -H "Cookie: euongelion_session=token"

# Progress
curl -X POST http://localhost:3000/api/progress \
  -H "Content-Type: application/json" \
  -d '{"day_number": 1}'
```

### Using Fetch

```typescript
// Soul Audit
const response = await fetch('/api/soul-audit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    response: 'User input',
    sabbathPreference: 'sunday',
    timezone: 'America/New_York',
  }),
})

// Daily Bread
const data = await fetch('/api/daily-bread').then((r) => r.json())
```
