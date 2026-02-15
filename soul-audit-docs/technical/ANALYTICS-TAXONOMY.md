# EUONGELION Analytics Taxonomy

**Version:** 1.0
**Last Updated:** January 17, 2026

---

## Overview

Complete event tracking plan for EUONGELION. This document defines every trackable event, its properties, naming conventions, and how events connect into conversion funnels.

**Primary Tool:** Vercel Analytics (MVP) or Plausible (privacy-respecting alternative)
**Implementation:** Custom events via `@vercel/analytics` or Plausible script

---

## Naming Conventions

### Event Names

- Use `snake_case` for all event names
- Format: `{noun}_{verb}` or `{category}_{action}`
- Keep names under 40 characters
- Use consistent verbs: `start`, `complete`, `view`, `click`, `submit`, `share`

### Property Names

- Use `snake_case` for all property names
- Keep names under 30 characters
- Use consistent property names across events

### Priority Levels

| Priority | Description                               | Implementation         |
| -------- | ----------------------------------------- | ---------------------- |
| **P0**   | Critical for MVP success metrics          | Must have for launch   |
| **P1**   | Important for understanding user behavior | Should have for launch |
| **P2**   | Nice to have for deeper insights          | Can add post-launch    |

---

## Core Events

### Page View Events

| Event Name          | Trigger                    | Properties                        | Priority |
| ------------------- | -------------------------- | --------------------------------- | -------- |
| `page_view`         | Every page load            | `path`, `referrer`, `title`       | P0       |
| `page_scroll_depth` | User scrolls 25/50/75/100% | `path`, `depth_percent`           | P2       |
| `page_time_spent`   | User leaves page           | `path`, `seconds`, `scroll_depth` | P2       |

**page_view Properties:**

```typescript
{
  path: string;           // "/", "/series/fear-not", etc.
  referrer: string;       // Previous URL or "direct"
  title: string;          // Page title
  utm_source?: string;    // Campaign source
  utm_medium?: string;    // Campaign medium
  utm_campaign?: string;  // Campaign name
}
```

---

### Soul Audit Events

| Event Name                 | Trigger                     | Properties                                                    | Priority |
| -------------------------- | --------------------------- | ------------------------------------------------------------- | -------- |
| `soul_audit_view`          | Soul Audit form visible     | `entry_point`                                                 | P0       |
| `soul_audit_start`         | User begins typing          | `entry_point`                                                 | P0       |
| `soul_audit_submit`        | User submits response       | `response_length`, `entry_point`                              | P0       |
| `soul_audit_complete`      | Match returned successfully | `matched_series`, `confidence`, `pathway`, `response_time_ms` | P0       |
| `soul_audit_error`         | API error occurred          | `error_type`, `response_length`                               | P1       |
| `soul_audit_limit_reached` | User hit 3 audit limit      | `previous_matches`                                            | P1       |

**soul_audit_complete Properties:**

```typescript
{
  matched_series: string // Series slug
  confidence: number // 0-1 confidence score
  pathway: string // "sleep", "awake", "shepherd"
  response_time_ms: number // Time from submit to result
  alternatives_count: number // Number of alternative suggestions
  response_length: number // Character count of user input
}
```

---

### Series Events

| Event Name        | Trigger                                  | Properties                                         | Priority |
| ----------------- | ---------------------------------------- | -------------------------------------------------- | -------- |
| `series_view`     | Series detail page loaded                | `series_slug`, `source`                            | P0       |
| `series_start`    | User begins a series                     | `series_slug`, `source`, `pathway`                 | P0       |
| `series_resume`   | User returns to active series            | `series_slug`, `current_day`                       | P1       |
| `series_complete` | User finishes all days                   | `series_slug`, `days_count`, `total_time_days`     | P0       |
| `series_abandon`  | User starts new series before completing | `abandoned_series`, `new_series`, `days_completed` | P1       |
| `series_browse`   | Series browse page viewed                | `filter_pathway`, `sort_by`                        | P1       |

**series_start Properties:**

```typescript
{
  series_slug: string // "fear-not", "good-news", etc.
  source: string // "soul_audit", "browse", "share_link", "direct"
  pathway: string // User's pathway
  day_count: number // Total days in series
  sabbath_preference: string // "saturday" or "sunday"
}
```

**series_complete Properties:**

```typescript
{
  series_slug: string
  days_count: number
  total_time_days: number // Calendar days from start to complete
  missed_days: number // Days where user didn't engage
  completion_rate: number // days_completed / total_time_days
}
```

---

### Day/Devotional Events

| Event Name        | Trigger                         | Properties                                                            | Priority |
| ----------------- | ------------------------------- | --------------------------------------------------------------------- | -------- |
| `day_view`        | Day content loaded              | `series_slug`, `day_number`, `is_locked`                              | P0       |
| `day_start`       | User begins reading day         | `series_slug`, `day_number`, `time_of_day`                            | P0       |
| `day_complete`    | User marks day complete         | `series_slug`, `day_number`, `reading_time_seconds`, `modules_viewed` | P0       |
| `day_skip`        | User views but doesn't complete | `series_slug`, `day_number`, `time_on_page_seconds`                   | P1       |
| `day_unlock`      | Locked day becomes available    | `series_slug`, `day_number`                                           | P2       |
| `day_locked_view` | User tries to view locked day   | `series_slug`, `day_number`, `unlock_time`                            | P1       |

**day_complete Properties:**

```typescript
{
  series_slug: string
  day_number: number
  reading_time_seconds: number // Time from day_start to day_complete
  modules_viewed: number // Count of modules scrolled into view
  modules_total: number // Total modules in day
  scroll_depth: number // 0-100 percentage
  time_of_day: string // "morning", "afternoon", "evening", "night"
  is_catchup: boolean // True if completing a previous day
}
```

---

### Module Events

| Event Name        | Trigger                        | Properties                                                     | Priority |
| ----------------- | ------------------------------ | -------------------------------------------------------------- | -------- |
| `module_view`     | Module scrolls into viewport   | `module_type`, `series_slug`, `day_number`, `position`         | P1       |
| `module_interact` | User interacts with module     | `module_type`, `interaction_type`, `series_slug`, `day_number` | P2       |
| `module_expand`   | User expands collapsed content | `module_type`, `series_slug`, `day_number`                     | P2       |

**module_view Properties:**

```typescript
{
  module_type: string // "scripture", "teaching", "vocab", "prayer", etc.
  series_slug: string
  day_number: number
  position: number // Module position in day (1-indexed)
  viewport_time_ms: number // Time module was visible
}
```

---

### Authentication Events

| Event Name              | Trigger                         | Properties                     | Priority |
| ----------------------- | ------------------------------- | ------------------------------ | -------- |
| `auth_prompt_view`      | Auth modal/prompt shown         | `trigger_point`, `series_slug` | P0       |
| `auth_email_submit`     | User submits email              | `trigger_point`                | P0       |
| `auth_magic_link_sent`  | Magic link email sent           | `trigger_point`                | P0       |
| `auth_magic_link_click` | User clicks magic link          | `time_to_click_seconds`        | P0       |
| `auth_complete`         | User successfully authenticated | `is_new_user`, `trigger_point` | P0       |
| `auth_error`            | Auth failed                     | `error_type`, `trigger_point`  | P1       |
| `auth_skip`             | User dismisses auth prompt      | `trigger_point`, `series_slug` | P1       |

**auth_complete Properties:**

```typescript
{
  is_new_user: boolean // First time authenticating
  trigger_point: string // "soul_audit", "series_start", "settings"
  session_linked: boolean // Whether anonymous session was linked
  previous_progress: boolean // Whether user had previous progress
}
```

---

### Share Events

| Event Name              | Trigger                    | Properties                                                | Priority |
| ----------------------- | -------------------------- | --------------------------------------------------------- | -------- |
| `share_initiated`       | User clicks share button   | `share_type`, `content_type`, `series_slug`, `day_number` | P0       |
| `share_method_selected` | User selects share method  | `method`, `content_type`, `series_slug`                   | P1       |
| `share_complete`        | Share action completed     | `method`, `content_type`, `series_slug`                   | P0       |
| `share_link_copied`     | Copy link clicked          | `content_type`, `series_slug`, `day_number`               | P0       |
| `share_link_visit`      | Someone visits shared link | `series_slug`, `day_number`, `referrer`                   | P0       |

**share_initiated Properties:**

```typescript
{
  share_type: string;         // "native", "copy_link", "social"
  content_type: string;       // "series", "day", "quote", "insight"
  series_slug: string;
  day_number?: number;        // Only for day-level shares
  quote_text?: string;        // For quote shares (truncated)
}
```

---

### Settings Events

| Event Name        | Trigger                | Properties                               | Priority |
| ----------------- | ---------------------- | ---------------------------------------- | -------- |
| `settings_view`   | Settings page loaded   | -                                        | P2       |
| `settings_change` | User changes a setting | `setting_name`, `old_value`, `new_value` | P1       |
| `theme_toggle`    | Theme changed          | `new_theme`, `trigger`                   | P1       |
| `timezone_change` | Timezone updated       | `old_timezone`, `new_timezone`           | P2       |

---

### Error Events

| Event Name        | Trigger                   | Properties                                 | Priority |
| ----------------- | ------------------------- | ------------------------------------------ | -------- |
| `error_page_view` | 404 or 500 page displayed | `error_code`, `attempted_path`, `referrer` | P0       |
| `api_error`       | API request failed        | `endpoint`, `status_code`, `error_message` | P1       |
| `client_error`    | JavaScript error          | `error_message`, `stack_trace`, `path`     | P1       |

---

### Engagement Events

| Event Name        | Trigger                         | Properties                                              | Priority |
| ----------------- | ------------------------------- | ------------------------------------------------------- | -------- |
| `return_visit`    | User returns after 24+ hours    | `days_since_last_visit`, `active_series`, `current_day` | P0       |
| `streak_achieved` | User completes consecutive days | `streak_length`, `series_slug`                          | P1       |
| `print_initiated` | User initiates print            | `series_slug`, `day_number`                             | P1       |
| `print_complete`  | Print dialog confirmed          | `series_slug`, `day_number`                             | P2       |

---

## Conversion Funnels

### Funnel 1: First-Time User Conversion

**Goal:** Anonymous visitor becomes active user

```
1. page_view (path="/")
   ↓
2. soul_audit_view
   ↓
3. soul_audit_start
   ↓
4. soul_audit_submit
   ↓
5. soul_audit_complete
   ↓
6. auth_prompt_view
   ↓
7. auth_complete
   ↓
8. series_start
   ↓
9. day_complete (day_number=1)
```

**Key Metrics:**

- Soul Audit Start Rate: `soul_audit_start` / `soul_audit_view`
- Soul Audit Completion Rate: `soul_audit_complete` / `soul_audit_submit`
- Auth Conversion Rate: `auth_complete` / `auth_prompt_view`
- Day 1 Completion Rate: `day_complete (day=1)` / `series_start`

---

### Funnel 2: Series Completion

**Goal:** User who starts completes entire series

```
1. series_start
   ↓
2. day_complete (day=1)
   ↓
3. return_visit (day 2+)
   ↓
4. day_complete (day=2)
   ↓
   ... (repeat for each day)
   ↓
N. series_complete
```

**Key Metrics:**

- Day 1→2 Retention: `day_complete (day=2)` / `day_complete (day=1)`
- Day N→N+1 Retention: `day_complete (day=N+1)` / `day_complete (day=N)`
- Series Completion Rate: `series_complete` / `series_start`
- Average Days to Complete: Mean of `total_time_days` in `series_complete`

---

### Funnel 3: Share Conversion

**Goal:** Content shared leads to new user

```
1. share_initiated
   ↓
2. share_complete
   ↓
3. share_link_visit (new session)
   ↓
4. soul_audit_complete OR series_start
```

**Key Metrics:**

- Share Completion Rate: `share_complete` / `share_initiated`
- Share-to-Visit Rate: `share_link_visit` / `share_complete`
- Share-to-Start Rate: `series_start (source="share_link")` / `share_link_visit`

---

### Funnel 4: Browse Conversion

**Goal:** User browses and starts a series (non-Soul Audit path)

```
1. page_view (path="/series")
   ↓
2. series_browse
   ↓
3. series_view
   ↓
4. series_start (source="browse")
```

**Key Metrics:**

- Browse-to-View Rate: `series_view` / `series_browse`
- View-to-Start Rate: `series_start (source="browse")` / `series_view`

---

## Property Schemas

### Standard Properties (All Events)

```typescript
interface StandardProperties {
  // Auto-captured
  timestamp: string // ISO 8601
  session_id: string // Anonymous session identifier
  user_id?: string // After auth (hashed)

  // Device/Browser
  device_type: string // "mobile", "tablet", "desktop"
  browser: string // "chrome", "safari", etc.
  os: string // "ios", "android", "macos", "windows"

  // Context
  path: string // Current URL path
  referrer?: string // Previous URL
}
```

### Series Context Properties

```typescript
interface SeriesContext {
  series_slug: string
  series_title: string
  pathway: string
  day_count: number
  current_day?: number
}
```

### User Context Properties

```typescript
interface UserContext {
  is_authenticated: boolean
  sabbath_preference?: string
  timezone?: string
  theme_preference?: string
  soul_audit_count?: number
  active_series?: string
}
```

---

## Implementation Guide

### Vercel Analytics Setup

```typescript
// lib/analytics.ts
import { track } from '@vercel/analytics'

export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>,
) {
  // Add standard properties
  const enrichedProps = {
    ...properties,
    timestamp: new Date().toISOString(),
    path: typeof window !== 'undefined' ? window.location.pathname : '',
  }

  track(name, enrichedProps)
}

// Usage
trackEvent('soul_audit_complete', {
  matched_series: 'fear-not',
  confidence: 0.87,
  pathway: 'sleep',
  response_time_ms: 2340,
})
```

### Plausible Setup

```typescript
// lib/analytics.ts
declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props: Record<string, any> },
    ) => void
  }
}

export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>,
) {
  if (typeof window !== 'undefined' && window.plausible) {
    window.plausible(name, { props: properties || {} })
  }
}
```

### React Hook for Event Tracking

```typescript
// hooks/useAnalytics.ts
import { useCallback } from 'react'
import { trackEvent } from '@/lib/analytics'

export function useAnalytics() {
  const track = useCallback(
    (eventName: string, properties?: Record<string, any>) => {
      trackEvent(eventName, properties)
    },
    [],
  )

  const trackPageView = useCallback(
    (path: string, title: string) => {
      track('page_view', { path, title })
    },
    [track],
  )

  const trackSoulAuditComplete = useCallback(
    (data: {
      matched_series: string
      confidence: number
      pathway: string
      response_time_ms: number
    }) => {
      track('soul_audit_complete', data)
    },
    [track],
  )

  // Add more typed helpers...

  return {
    track,
    trackPageView,
    trackSoulAuditComplete,
  }
}
```

### Server-Side Event Tracking

```typescript
// For API routes (server-side events)
// lib/analytics-server.ts
export async function trackServerEvent(
  name: string,
  properties: Record<string, any>,
  sessionId?: string,
) {
  // If using Plausible, call their Events API
  // If using Vercel Analytics, events are client-side only

  // Log for now, implement proper server tracking later
  console.log(`[Analytics] ${name}`, { ...properties, sessionId })
}
```

---

## Dashboard Metrics

### Primary KPIs (Weekly Review)

| Metric                     | Calculation                                                | Target   |
| -------------------------- | ---------------------------------------------------------- | -------- |
| New Users                  | `auth_complete (is_new_user=true)` count                   | +10% WoW |
| Soul Audit Completion Rate | `soul_audit_complete` / `soul_audit_start`                 | >70%     |
| Series Start Rate          | `series_start` / `soul_audit_complete`                     | >80%     |
| Day 1 Completion           | `day_complete (day=1)` / `series_start`                    | >60%     |
| Return Rate (Day 2)        | Users with `day_complete (day=2)` / `day_complete (day=1)` | >40%     |
| Series Completion Rate     | `series_complete` / `series_start`                         | >25%     |
| Share Rate                 | Users with `share_complete` / Total Active Users           | >5%      |

### Secondary Metrics (Monthly Review)

| Metric               | Calculation                                     | Notes                |
| -------------------- | ----------------------------------------------- | -------------------- |
| Avg Reading Time     | Mean `reading_time_seconds` from `day_complete` | Target: 8-15 min     |
| Module Completion    | `modules_viewed` / `modules_total`              | Track by module type |
| Pathway Distribution | Count by `pathway` in `series_start`            | Monitor balance      |
| Error Rate           | `api_error` + `client_error` / Total Events     | Target: <1%          |
| Auth Conversion      | `auth_complete` / `auth_prompt_view`            | Target: >50%         |

---

## Privacy Considerations

### What We Track

- Anonymous session identifiers (UUID, not linked to email)
- Aggregated behavior patterns
- Content engagement (series, days, modules)
- Technical context (device type, browser)

### What We Don't Track

- Email addresses in analytics (stored separately in auth)
- Soul Audit response content (only length)
- IP addresses (not stored)
- Precise geolocation (only timezone)
- Cross-site behavior

### Data Retention

- Event data: 12 months rolling
- Aggregated metrics: Indefinite
- Raw logs: 30 days

### User Rights

- No personal data in analytics to delete
- Session can be cleared by user (clears cookies)
- Opt-out via browser Do Not Track (if using Plausible)

---

## Testing Events

### Event Validation Checklist

Before launch, verify each P0 event fires correctly:

- [ ] `page_view` - All pages
- [ ] `soul_audit_view` - Landing page loads
- [ ] `soul_audit_start` - First keystroke
- [ ] `soul_audit_submit` - Form submission
- [ ] `soul_audit_complete` - Successful match
- [ ] `series_start` - Begin any series
- [ ] `day_view` - View devotional content
- [ ] `day_complete` - Mark day done
- [ ] `series_complete` - Finish all days
- [ ] `auth_complete` - Successful authentication
- [ ] `share_initiated` - Click share
- [ ] `share_link_copied` - Copy link
- [ ] `return_visit` - Return after 24h

### Debug Mode

```typescript
// Enable debug logging in development
const DEBUG_ANALYTICS = process.env.NODE_ENV === 'development'

export function trackEvent(name: string, properties?: Record<string, any>) {
  if (DEBUG_ANALYTICS) {
    console.log(`[Analytics Debug] ${name}`, properties)
  }
  // ... actual tracking
}
```

---

_This taxonomy should be reviewed and updated as new features are added or user behavior patterns change._
