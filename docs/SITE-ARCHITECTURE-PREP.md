# EUONGELION Site Architecture Preparation

**For:** Architecture Sprint (January 19, 2026)
**Version:** 1.0
**Last Updated:** January 17, 2026

---

## Purpose

This document prepares for the architecture sprint in 2 days. It catalogues every architectural decision needed, identifies open questions, and provides a discussion framework for the sprint session.

**Goal:** Leave the sprint with clear decisions on all architectural components so implementation can proceed without ambiguity.

---

## 1. Page Inventory

### Public Pages (No Auth Required)

| Route            | Description                  | Static/Dynamic                    | SEO Priority               |
| ---------------- | ---------------------------- | --------------------------------- | -------------------------- |
| `/`              | Landing page with Soul Audit | Static shell + Client interactive | HIGH - Primary entry point |
| `/series`        | Browse all series            | ISR (hourly)                      | HIGH - Discoverability     |
| `/series/[slug]` | Series detail/preview        | ISR (hourly)                      | HIGH - Shareable, indexed  |
| `/about`         | About EUONGELION/wokeGod     | Static                            | MEDIUM - Trust building    |
| `/privacy`       | Privacy Policy               | Static                            | LOW - Legal requirement    |
| `/terms`         | Terms of Service             | Static                            | LOW - Legal requirement    |

### Authenticated Pages (Session Required)

| Route                | Description                  | Static/Dynamic | SEO Priority        |
| -------------------- | ---------------------------- | -------------- | ------------------- |
| `/daily-bread`       | Main devotional feed         | Server Dynamic | NONE - Personalized |
| `/daily-bread/[day]` | Specific day (if accessible) | Server Dynamic | NONE - Gated        |
| `/settings`          | User preferences             | Server Dynamic | NONE - Personal     |
| `/progress`          | Series completion history    | Server Dynamic | NONE - Personal     |

### Utility Pages

| Route              | Description                | Static/Dynamic | SEO Priority |
| ------------------ | -------------------------- | -------------- | ------------ |
| `/auth/callback`   | Magic link handler         | Server Dynamic | NONE         |
| `/auth/verify`     | Email verification pending | Static         | NONE         |
| `/404`             | Not found                  | Static         | NONE         |
| `/500`             | Server error               | Static         | NONE         |
| `/session-expired` | Session timeout            | Static         | NONE         |

### OPEN QUESTIONS - Pages

1. **Do we need a dedicated `/start` page?** Currently Soul Audit lives on landing. Should there be a separate flow for returning users who want to browse vs. take the audit?

2. **Series completion page?** When a user finishes all days, is there a `/complete` or `/celebration` page, or just a state within `/daily-bread`?

3. **Print/download route?** Does print-friendly view need its own route (`/daily-bread/print`) or is it CSS-only?

4. **Onboarding flow pages?** The onboarding content (Welcome to EUONGELION) - does it get its own routing pattern or is it just another series?

---

## 2. Route Structure

### Proposed URL Patterns

```
Public Content:
/                                   Landing + Soul Audit
/series                             Series browse grid
/series/[slug]                      Series preview (before starting)
/about                              About page

Authenticated Experience:
/daily-bread                        Current day's devotional
/daily-bread?day=3                  Specific day (query param)
/settings                           User preferences
/progress                           Completion history

Auth Flow:
/auth/callback                      Supabase magic link return
/auth/verify                        Pending verification state

Sharing (Public but content-gated):
/share/[series-slug]/[day]          Shareable deep link (shows preview if not auth'd)
```

### Nested Routing Considerations

**Option A: Flat Structure**

```
/daily-bread?series=fear-not&day=3
```

- Simpler implementation
- State managed via query params
- Less semantic

**Option B: Nested Structure**

```
/daily-bread/[series-slug]/day/[day-number]
```

- More semantic URLs
- Better for deep linking
- More complex routing

### Dynamic Segments

| Segment  | Source                      | Validation                      |
| -------- | --------------------------- | ------------------------------- |
| `[slug]` | `series.slug` from database | Must match published series     |
| `[day]`  | Integer 1-N                 | Must be within series day_count |

### Query Parameter Patterns

| Parameter        | Used On          | Purpose                      |
| ---------------- | ---------------- | ---------------------------- |
| `?day=N`         | `/daily-bread`   | Jump to specific day         |
| `?pathway=sleep` | `/series`        | Filter by pathway            |
| `?share=true`    | `/series/[slug]` | Track share referrals        |
| `?ref=audit`     | `/daily-bread`   | Track Soul Audit conversions |

### OPEN QUESTIONS - Routes

1. **Daily bread routing: query params vs. path segments?** Query params are simpler but path segments are more shareable/bookmarkable.

2. **Should authenticated routes use route groups?** E.g., `(auth)/daily-bread` to share auth layout.

3. **API route versioning?** Should we prefix with `/api/v1/` for future flexibility or keep it simple?

4. **Parallel routes needed?** Any modals or overlays that need their own URL state (e.g., settings modal)?

---

## 3. Data Requirements by Page

### `/` (Landing)

| Data Needed                              | Source   | Caching      |
| ---------------------------------------- | -------- | ------------ |
| Series count (for "X devotional series") | Supabase | ISR - 1 hour |
| Featured series (optional)               | Supabase | ISR - 1 hour |
| None for Soul Audit (client-side)        | N/A      | N/A          |

### `/series` (Browse)

| Data Needed                   | Source                  | Caching      |
| ----------------------------- | ----------------------- | ------------ |
| All published series metadata | Supabase `series` table | ISR - 1 hour |
| Pathway filters               | Static                  | None         |

**Query:**

```sql
SELECT slug, title, subtitle, pathway, day_count, core_theme
FROM series
WHERE published = true
ORDER BY created_at DESC
```

### `/series/[slug]` (Preview)

| Data Needed                      | Source            | Caching      |
| -------------------------------- | ----------------- | ------------ |
| Series full metadata             | Supabase `series` | ISR - 1 hour |
| Day titles/previews (no content) | Supabase `days`   | ISR - 1 hour |
| Hero image                       | CDN/public        | CDN cached   |

**Query:**

```sql
SELECT s.*,
       array_agg(json_build_object('day_number', d.day_number, 'title', d.title, 'chiasm_position', d.chiasm_position)) as days
FROM series s
LEFT JOIN days d ON d.series_id = s.id
WHERE s.slug = $1 AND s.published = true
GROUP BY s.id
```

### `/daily-bread` (Main Feed)

| Data Needed             | Source                             | Caching                |
| ----------------------- | ---------------------------------- | ---------------------- |
| User session            | Cookie + Supabase `user_sessions`  | No cache (real-time)   |
| Active series full data | Supabase `series`                  | Could cache per-series |
| Current day content     | Supabase `days.modules`            | Could cache per-day    |
| User progress           | Supabase `progress`                | No cache (real-time)   |
| Unlock status           | Calculated (timezone + start_date) | No cache (real-time)   |

**Caching Strategy:**

- Series metadata: Could use React Query with 5-min stale time
- Day content: Could cache since content is static
- User state: Never cache, always fresh

### `/settings`

| Data Needed         | Source                   | Caching  |
| ------------------- | ------------------------ | -------- |
| Current preferences | Supabase `user_sessions` | No cache |
| Timezone list       | Static                   | None     |

### OPEN QUESTIONS - Data

1. **Server components vs. client fetch?** For `/daily-bread`, should we fetch in server component (faster FCP) or client (more interactive)?

2. **React Query or SWR?** For client-side data, which library? Or just `fetch` with Suspense?

3. **Optimistic updates?** Should progress marking be optimistic (immediate UI) or wait for server confirmation?

4. **Prefetching strategy?** When viewing Day 2, should we prefetch Day 3 content?

5. **Content caching granularity?** Cache entire day modules, or cache by module type?

---

## 4. State Management Needs

### Global State (App-Wide)

| State               | Type       | Storage                     | Notes                       |
| ------------------- | ---------- | --------------------------- | --------------------------- |
| Theme (light/dark)  | Preference | localStorage + CSS          | Sync with system preference |
| Session token       | Auth       | httpOnly cookie             | Server-managed              |
| Auth status         | Auth       | Derived from cookie         | Not stored separately       |
| Toast notifications | UI         | In-memory (Zustand/Context) | Ephemeral                   |

### Local State (Component-Level)

| Component      | State                              | Notes                      |
| -------------- | ---------------------------------- | -------------------------- |
| SoulAuditForm  | Input text, loading, error         | Controlled form            |
| DaySelector    | Selected day                       | URL-synced (`?day=N`)      |
| ModuleRenderer | Scroll position, expanded sections | Per-session, not persisted |
| Settings       | Form values, dirty state           | Controlled form            |

### Server State (Async Data)

| Data                | Pattern                     | Refetch Triggers        |
| ------------------- | --------------------------- | ----------------------- |
| Series list         | Fetch on mount, long stale  | Manual refresh only     |
| Current day content | Fetch on mount, per-day key | Day change, auth change |
| User progress       | Fetch on mount, real-time   | Progress update         |
| Soul Audit result   | Mutation, one-time          | Never (redirect after)  |

### Form State

| Form                | Fields                             | Validation        | Submission     |
| ------------------- | ---------------------------------- | ----------------- | -------------- |
| Soul Audit          | response (text), sabbath, timezone | Min 10 chars      | API POST       |
| Settings            | sabbath, theme, timezone           | Select validation | API PATCH      |
| (Future) Reflection | user_reflection text               | None              | Local/API POST |

### Proposed State Architecture

```
Global (Context or Zustand):
- theme: 'light' | 'dark'
- toasts: Toast[]

Server State (React Query or SWR):
- useSession() - Current user session
- useSeries(slug) - Single series data
- useSeriesList() - All series
- useDailyBread() - Today's content + progress
- useProgress() - User's completion data

Local (useState):
- Form inputs
- UI state (modals, expanded sections)
- Scroll positions
```

### OPEN QUESTIONS - State

1. **Zustand vs. Context for global state?** Theme toggle and toasts - is Zustand overkill?

2. **React Query vs. SWR vs. neither?** Given most data is fetched once per page load, do we need a caching library?

3. **Server Actions vs. API routes?** Next.js 14+ supports Server Actions - should we use them for mutations?

4. **Offline state?** (Phase 2 consideration) Should we design state to support offline-first from the start?

---

## 5. API Endpoints Needed

### Core Endpoints (MVP)

| Method | Endpoint                    | Purpose                   | Auth                 |
| ------ | --------------------------- | ------------------------- | -------------------- |
| POST   | `/api/soul-audit`           | Match user to series      | No (creates session) |
| GET    | `/api/daily-bread`          | Get today's content       | Yes                  |
| POST   | `/api/progress`             | Mark day complete         | Yes                  |
| GET    | `/api/series`               | List all published series | No                   |
| GET    | `/api/series/[slug]`        | Get single series details | No                   |
| POST   | `/api/session/start-series` | Start specific series     | Optional\*           |
| DELETE | `/api/session`              | Clear session (testing)   | Yes                  |
| PATCH  | `/api/session/preferences`  | Update settings           | Yes                  |

\*Start series from browse may work without auth, creating session on the fly

### Auth Endpoints (Supabase Handles)

| Endpoint            | Purpose                  | Notes                         |
| ------------------- | ------------------------ | ----------------------------- |
| Supabase Magic Link | Send magic link email    | Built into Supabase Auth      |
| `/auth/callback`    | Handle magic link return | Next.js route, calls Supabase |

### Request/Response Shapes

**POST /api/soul-audit**

```typescript
// Request
{
  response: string // Max 2000 chars
  sabbathPreference: 'saturday' | 'sunday'
  timezone: string // IANA timezone
}

// Response (200)
{
  success: true
  matched_series: {
    ;(slug, title, subtitle, reasoning)
  }
  confidence: number // 0-1
  alternatives: Array<{ slug; title }>
  session_created: boolean
}
```

**GET /api/daily-bread**

```typescript
// Response (200)
{
  series: { slug, title, subtitle, pathway, day_count };
  today: {
    day_number: number;
    title: string;
    chiasm_position: string;
    modules: Module[];
    is_locked: boolean;
    unlock_time: string | null;
  };
  progress: {
    current_day: number;
    total_days: number;
    completed_days: number[];
  };
  available_days: number[];
  locked_days: number[];
}
```

### Rate Limiting Considerations

| Endpoint          | Limit      | Window   | Notes                         |
| ----------------- | ---------- | -------- | ----------------------------- |
| `/api/soul-audit` | 3 per user | Lifetime | Enforced via session count    |
| `/api/soul-audit` | 10 per IP  | 1 hour   | Prevent abuse without account |
| `/api/progress`   | 60         | 1 minute | Generous for normal use       |
| `/api/series`     | 100        | 1 minute | Generous for browsing         |

### Error Response Standard

```typescript
// All errors follow this shape
{
  error: string;           // Human-readable message
  code?: string;           // Machine-readable code (optional)
  details?: any;           // Additional context (optional)
}
```

### OPEN QUESTIONS - API

1. **Rate limiting implementation?** Upstash Redis (as noted in architecture.md) or simpler in-memory for MVP?

2. **API response envelope?** Always wrap in `{ data, error }` or return data directly on success?

3. **Webhook endpoints?** Does Supabase Auth need a webhook for user events?

4. **Analytics endpoint?** Track events via API or client-side Plausible/Vercel Analytics?

5. **Content versioning?** If content updates, how do we handle users mid-series? Add version field?

---

## 6. Database Relationships

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│     series      │       │      days       │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │
│ slug (UNIQUE)   │  │    │ series_id (FK)  │←─┐
│ title           │  │    │ day_number      │  │
│ subtitle        │  └───→│ title           │  │
│ pathway         │       │ chiasm_position │  │
│ day_count       │       │ modules (JSONB) │  │
│ published       │       └─────────────────┘  │
│ soul_audit_keys │                            │
│ ...metadata     │                            │
└─────────────────┘                            │
                                               │
┌─────────────────┐       ┌─────────────────┐  │
│  user_sessions  │       │    progress     │  │
├─────────────────┤       ├─────────────────┤  │
│ id (PK)         │──┐    │ id (PK)         │  │
│ session_token   │  │    │ session_id (FK) │←─┤
│ active_series   │──┼───→│ series_id (FK)  │──┘
│ current_day     │  │    │ day_number      │
│ start_date      │  │    │ completed_at    │
│ sabbath_pref    │  │    └─────────────────┘
│ timezone        │  │
│ soul_audit_count│  │    ┌─────────────────┐
│ user_id (FK)*   │  │    │   soul_audits   │
└─────────────────┘  │    ├─────────────────┤
       │             │    │ id (PK)         │
       │             └───→│ session_id (FK) │
       │                  │ user_input      │
       ↓                  │ matched_series  │
┌─────────────────┐       │ confidence      │
│   auth.users    │       │ reasoning       │
│   (Supabase)    │       └─────────────────┘
└─────────────────┘
```

\*user_id added when user authenticates (magic link)

### Key Relationships

| Parent        | Child                       | Relationship | ON DELETE |
| ------------- | --------------------------- | ------------ | --------- |
| series        | days                        | One-to-Many  | CASCADE   |
| series        | user_sessions.active_series | One-to-Many  | SET NULL  |
| series        | progress                    | One-to-Many  | CASCADE   |
| user_sessions | progress                    | One-to-Many  | CASCADE   |
| user_sessions | soul_audits                 | One-to-Many  | CASCADE   |
| auth.users    | user_sessions               | One-to-Many  | CASCADE   |

### Common Query Patterns

1. **Get user's current state:**

   ```sql
   SELECT us.*, s.title, s.day_count,
          array_agg(p.day_number) as completed_days
   FROM user_sessions us
   LEFT JOIN series s ON s.id = us.active_series_id
   LEFT JOIN progress p ON p.session_id = us.id
   WHERE us.session_token = $1
   GROUP BY us.id, s.id
   ```

2. **Get series for Soul Audit matching:**

   ```sql
   SELECT slug, title, soul_audit_keywords, emotional_tones, life_circumstances
   FROM series
   WHERE published = true AND pathway != 'shepherd'
   ```

3. **Check day accessibility:**
   ```sql
   -- This is calculated in application code (not pure SQL)
   -- Based on: start_date + (day_number - 1) days + 7:00 AM in user timezone
   ```

### Indexing Strategy

| Table         | Index                | Columns       | Purpose                 |
| ------------- | -------------------- | ------------- | ----------------------- |
| series        | idx_series_slug      | slug          | Slug lookup             |
| series        | idx_series_published | published     | Filter published        |
| days          | idx_days_series      | series_id     | Join optimization       |
| user_sessions | idx_sessions_token   | session_token | Auth lookup             |
| user_sessions | idx_sessions_user    | user_id       | User lookup (post-auth) |
| progress      | idx_progress_session | session_id    | Progress queries        |
| soul_audits   | idx_audits_session   | session_id    | Audit history           |

### OPEN QUESTIONS - Database

1. **Soft delete or hard delete?** Should series/content have `deleted_at` for recovery?

2. **Audit logging?** Should we log all data changes for debugging/analytics?

3. **JSON modules vs. separate table?** Modules are JSONB in days. Should they be normalized for querying?

4. **User data on account delete?** Anonymize progress or delete completely?

5. **Series versioning?** If we update a series, do we version it or update in place?

---

## 7. Third-Party Integrations

### Supabase (Auth + Database)

| Service           | Usage                     | Configuration Needed         |
| ----------------- | ------------------------- | ---------------------------- |
| Supabase Auth     | Magic link authentication | SMTP settings, redirect URLs |
| Supabase Database | PostgreSQL for all data   | RLS policies, indexes        |
| Supabase Storage  | (Future) User uploads     | Not MVP                      |
| Supabase Realtime | (Future) Live updates     | Not MVP                      |

**Auth Configuration:**

- Magic link expiry: 1 hour (default)
- Redirect URL: `https://wokegod.world/auth/callback`
- Email template: Custom branded template

### Claude API (Anthropic)

| Usage               | Model                    | Notes              |
| ------------------- | ------------------------ | ------------------ |
| Soul Audit matching | claude-sonnet-4-20250514 | Low latency needed |

**Configuration:**

- API key in environment
- Timeout: 30 seconds
- Retry: 1 retry on failure
- Fallback: If API fails, show browse page

### Analytics (TBD)

| Option           | Pros                         | Cons                            |
| ---------------- | ---------------------------- | ------------------------------- |
| Vercel Analytics | Zero config, built-in        | Limited customization           |
| Plausible        | Privacy-respecting, detailed | Additional cost (~$9/mo)        |
| PostHog          | Full product analytics       | More complex, possibly overkill |

**Metrics to Track:**

- Page views (all pages)
- Soul Audit completion rate
- Series start rate
- Day completion rate
- Return visit rate
- Share clicks

### Email Service

| Service                     | Usage                | Notes                           |
| --------------------------- | -------------------- | ------------------------------- |
| Supabase Auth               | Magic link emails    | Built-in, customizable template |
| (Future) Resend or Postmark | Transactional emails | Phase 2                         |

### Social Sharing APIs

| API           | Usage                        | Implementation                  |
| ------------- | ---------------------------- | ------------------------------- |
| Web Share API | Native share dialog (mobile) | Navigator.share()               |
| Clipboard API | Copy link fallback           | Navigator.clipboard.writeText() |
| Open Graph    | Social previews              | Meta tags in head               |

**OG Image Strategy:**

- Static OG image for home/about
- Dynamic OG images per series (pre-generated)
- Day-level OG images: use series image

### Payment (Future - Phase 2+)

| Option                | Notes                      |
| --------------------- | -------------------------- |
| Stripe                | Industry standard, good DX |
| Lemon Squeezy         | Simpler, handles taxes     |
| None (donations only) | Link to external giving    |

### OPEN QUESTIONS - Integrations

1. **Analytics choice?** Vercel Analytics is free and easy. Is it enough for MVP?

2. **Error tracking?** Sentry integration, or rely on Vercel logs for MVP?

3. **OG image generation?** Pre-generate all images, or use Vercel OG (@vercel/og)?

4. **Magic link email branding?** How much can we customize Supabase's email template?

5. **Crisis resources?** Link to external resources (988, etc.) - where do they live?

---

## 8. Performance Considerations

### Critical Rendering Path

**Home Page (`/`):**

1. HTML with inlined critical CSS (Tailwind JIT)
2. Hero text visible immediately (no font flash)
3. Soul Audit form interactive after hydration (~1s)
4. Non-critical JS deferred

**Daily Bread (`/daily-bread`):**

1. Server-render current day content
2. Module content visible immediately
3. Day selector interactive after hydration
4. Images lazy-loaded below fold

### Bundle Splitting Strategy

```
Bundles:
├── main.js              # Core framework, navigation
├── soul-audit.js        # Soul Audit form (lazy, home only)
├── daily-bread.js       # Module renderer, day selector
├── series.js            # Series browse, cards
├── settings.js          # Settings form (lazy)
└── modules/
    ├── scripture.js     # Each module can be code-split
    ├── vocab.js
    └── ...
```

**Loading Strategy:**

- Use Next.js dynamic imports for modules
- Prefetch likely next pages (e.g., daily-bread after soul audit)
- Module components loaded on demand

### Image Optimization

| Image Type        | Format                  | Size Strategy                    |
| ----------------- | ----------------------- | -------------------------------- |
| Hero images       | WebP with JPEG fallback | Multiple sizes (640, 1280, 1920) |
| Module images     | WebP                    | Max 1280px width                 |
| Vocab backgrounds | WebP                    | Small (400px), heavy compression |
| OG images         | PNG                     | 1200x630 fixed                   |

**Implementation:**

- Use Next.js Image component (`next/image`)
- Serve from `/public/images/` or Vercel CDN
- Blur placeholder for hero images

### Caching Layers

| Layer        | What                          | TTL               | Invalidation           |
| ------------ | ----------------------------- | ----------------- | ---------------------- |
| Browser      | Static assets (fonts, images) | 1 year            | Cache-busting hash     |
| CDN (Vercel) | ISR pages                     | Revalidate 1 hour | On-demand revalidation |
| CDN (Vercel) | Static pages                  | Until deploy      | Automatic              |
| Server       | Series/day content            | Could add Redis   | Manual invalidation    |
| Client       | React Query cache             | 5 min stale       | On mutation            |

### Performance Targets

| Metric | Target  | Strategy                                |
| ------ | ------- | --------------------------------------- |
| LCP    | < 2.5s  | Server-render, optimized images         |
| FID    | < 100ms | Minimal JS, defer non-critical          |
| CLS    | < 0.1   | Reserved image dimensions, font preload |
| TTI    | < 3.5s  | Code splitting, lazy loading            |
| TTFB   | < 200ms | Edge functions (Vercel)                 |

### OPEN QUESTIONS - Performance

1. **Edge vs. Node runtime?** Should API routes run at edge for lower latency?

2. **ISR vs. SSR for daily-bread?** Personalized content needs SSR, but can we cache common elements?

3. **Font loading strategy?** Self-host or use Google Fonts? Font-display: swap or optional?

4. **Service worker for MVP?** Even without offline, could improve return visits. Worth it?

5. **Preconnect domains?** Which third-party domains need preconnect hints?

---

## 9. Security Considerations

### Authentication Flow

```
Magic Link Flow:
1. User enters email
2. Server calls Supabase Auth → sends magic link
3. User clicks link → redirected to /auth/callback
4. Callback verifies token with Supabase
5. Supabase sets auth cookies (httpOnly)
6. Session created/linked in user_sessions
7. Redirect to /daily-bread
```

**Token Security:**

- Magic links expire in 1 hour
- Session tokens are UUIDs (unpredictable)
- All auth cookies are httpOnly, Secure, SameSite=Strict

### Authorization Patterns

| Resource           | Rule              | Implementation          |
| ------------------ | ----------------- | ----------------------- |
| Published series   | Public read       | RLS: `published = true` |
| Unpublished series | Admin only        | RLS: service role only  |
| User session       | Own session only  | Token match in cookie   |
| Progress           | Own progress only | Session ID from cookie  |
| Soul audit history | Own history only  | Session ID from cookie  |

### Data Protection

| Data                 | Protection              | Notes                        |
| -------------------- | ----------------------- | ---------------------------- |
| User email           | Stored in Supabase Auth | Not in user_sessions         |
| Soul audit responses | Stored for matching     | Consider retention policy    |
| IP addresses         | Not stored              | Rate limiting uses in-memory |
| Session tokens       | UUID, httpOnly cookie   | Never exposed to JS          |

### Input Validation

| Input               | Validation            | Sanitization                    |
| ------------------- | --------------------- | ------------------------------- |
| Soul audit response | Max 2000 chars        | HTML strip, trim                |
| Series slug         | Alphanumeric + hyphen | Lowercase, validated against DB |
| Day number          | Integer 1-N           | Range check against series      |
| Timezone            | IANA format           | Validated against list          |
| Sabbath             | Enum                  | Must be 'saturday' or 'sunday'  |

### Security Headers

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com;
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### OPEN QUESTIONS - Security

1. **CSRF protection?** Supabase handles auth CSRF. Do we need additional for API routes?

2. **Soul audit response retention?** How long do we keep responses? Privacy implications?

3. **Session duration?** How long before session expires? 30 days? 90 days?

4. **Account linking?** If anonymous user authenticates, how do we link existing progress?

5. **Admin access?** How do admins access unpublished content for preview?

---

## 10. Scalability Considerations

### What Needs to Scale

| Component       | Scale Concern         | Current Approach                         |
| --------------- | --------------------- | ---------------------------------------- |
| Database reads  | High traffic          | Supabase handles, consider read replicas |
| Claude API      | Cost + rate limits    | 3 audits per user limit                  |
| Static content  | High CDN load         | Vercel CDN handles automatically         |
| Auth            | Concurrent logins     | Supabase handles                         |
| Session storage | Many concurrent users | Supabase handles                         |

### Potential Bottlenecks

1. **Claude API for Soul Audit**
   - Cost: ~$0.003 per audit
   - Rate: API rate limits
   - Mitigation: 3 audit limit per user, cache common patterns

2. **Database connections**
   - Supabase free tier: Limited connections
   - Mitigation: Connection pooling (Supabase handles), upgrade tier

3. **Series content loading**
   - Large JSONB modules column
   - Mitigation: Cache at CDN/server level

### Future Expansion Points

| Feature              | Architecture Impact                     |
| -------------------- | --------------------------------------- |
| More series          | Just content, no schema change          |
| More modules         | Add to modules JSONB, add component     |
| User accounts (full) | auth.users already supports             |
| Community features   | New tables: comments, groups            |
| Offline mode         | Service worker, IndexedDB               |
| Multi-language       | Add `locale` column to content          |
| Payments             | New tables: subscriptions, transactions |

### Horizontal vs. Vertical Scaling

- **Vercel**: Automatic horizontal scaling (serverless)
- **Supabase**: Vertical scaling (upgrade tier)
- **CDN**: Automatic (Vercel/Cloudflare)
- **Claude API**: Rate limited, not scalable without Anthropic coordination

### OPEN QUESTIONS - Scalability

1. **Database tier for launch?** Supabase free tier has limits. When to upgrade?

2. **Multi-region?** Is US-only acceptable for MVP, or do we need global presence?

3. **Content delivery?** Should heavy content (images) use separate CDN (Cloudflare)?

4. **Monitoring alerts?** What thresholds trigger scaling concerns?

5. **Cost projections?** What does 1K DAU / 10K DAU / 100K DAU cost?

---

## 11. Key Architecture Decisions to Make

### Decision 1: Data Fetching Pattern

**Options:**

- A) Server Components only (fetch in RSC, pass as props)
- B) Client fetching with React Query/SWR
- C) Hybrid (server for initial, client for updates)

**Trade-offs:**
| Option | Pros | Cons |
|--------|------|------|
| A | Simpler, faster FCP, no loading states | Less interactive, full page refreshes |
| B | More interactive, optimistic updates | Loading states everywhere, larger bundle |
| C | Best of both | More complexity, two data paths |

**Recommendation:** C (Hybrid) - Server render critical content, client fetch for mutations and real-time needs.

---

### Decision 2: State Management Library

**Options:**

- A) React Context only
- B) Zustand (lightweight)
- C) Jotai (atomic)
- D) Redux Toolkit (heavy)

**Trade-offs:**

- A: Zero dependencies but verbose for complex state
- B: Simple API, 1KB, good DX
- C: Atomic model, good for derived state
- D: Overkill for this app

**Recommendation:** A or B - Context for simple global state (theme, toasts), Zustand if we need more.

---

### Decision 3: Routing Pattern for Daily Bread

**Options:**

- A) `/daily-bread?day=3` (query params)
- B) `/daily-bread/3` (path segment)
- C) `/daily-bread/[series]/[day]` (full path)

**Trade-offs:**
| Option | Shareable | Bookmarkable | Complexity |
|--------|-----------|--------------|------------|
| A | Medium | Yes | Low |
| B | Good | Yes | Medium |
| C | Best | Yes | High |

**Recommendation:** B - Clean URLs, good for sharing, moderate complexity.

---

### Decision 4: Module Component Architecture

**Options:**

- A) Single ModuleRenderer with switch statement
- B) Dynamic imports per module type
- C) Module registry with lazy loading

**Trade-offs:**

- A: Simple but large initial bundle
- B: Smaller chunks but more complexity
- C: Most flexible, good for Phase 2 modules

**Recommendation:** C - Registry pattern allows easy addition of Phase 2 modules.

---

### Decision 5: Session Management

**Options:**

- A) Cookie only (httpOnly, server-managed)
- B) Cookie + localStorage (for client preferences)
- C) JWT in cookie (self-contained)

**Trade-offs:**

- A: Most secure, requires server for all session data
- B: Balance of security and convenience
- C: Reduces DB lookups but larger cookies, refresh complexity

**Recommendation:** B - Cookie for session token, localStorage for non-sensitive preferences (theme, font size).

---

### Decision 6: API Response Format

**Options:**

- A) Direct data on success, error object on failure
- B) Always wrap: `{ data, error, meta }`
- C) Follow specific standard (JSON:API, etc.)

**Trade-offs:**

- A: Simple, less boilerplate
- B: Consistent handling, easier client code
- C: Standardized but verbose

**Recommendation:** A for MVP - Keep it simple. Can standardize later if needed.

---

### Decision 7: Image Handling

**Options:**

- A) All images in `/public/images/`
- B) Supabase Storage
- C) External CDN (Cloudflare Images, Cloudinary)

**Trade-offs:**
| Option | Cost | Optimization | Complexity |
|--------|------|--------------|------------|
| A | Free (Vercel) | next/image handles | Simplest |
| B | Supabase limits | Basic | Medium |
| C | Per-transform cost | Best | Most complex |

**Recommendation:** A for MVP - Use `/public/images/` with next/image optimization.

---

### Decision 8: Error Handling Strategy

**Options:**

- A) Error boundaries + fallback UI
- B) Try/catch everywhere + toast notifications
- C) Hybrid (boundaries for crashes, toasts for expected errors)

**Trade-offs:**

- A: Catches all but can hide issues
- B: More control but verbose
- C: Best UX, moderate complexity

**Recommendation:** C - Error boundaries for unexpected crashes, toast for user-facing errors.

---

## 12. Dependencies on Design Decisions

### Blocked Until Design Provides

| Architecture Decision    | Waiting On               |
| ------------------------ | ------------------------ |
| Module component specs   | Final module designs     |
| Loading state patterns   | Skeleton/spinner designs |
| Toast/notification style | Toast component design   |
| Error page layouts       | 404/500 page designs     |
| Print stylesheet         | Print layout decisions   |

### Blocked Until Content Provides

| Architecture Decision  | Waiting On                   |
| ---------------------- | ---------------------------- |
| Module JSONB structure | Final module content format  |
| Series metadata fields | Content categorization needs |
| Soul Audit keywords    | Content tagging approach     |

### Blocked Until Strategy Provides

| Architecture Decision    | Waiting On               |
| ------------------------ | ------------------------ |
| Analytics events         | What metrics matter most |
| Legal page content       | Privacy policy, terms    |
| Crisis resource handling | Where/how to display     |

---

## Sprint Session Agenda

### Pre-Sprint Prep (Before Session)

- [ ] Review this document
- [ ] Note questions/concerns
- [ ] Review MVP-SCOPE.md for feature requirements

### Sprint Session (2-3 hours)

**Block 1: Core Decisions (45 min)**

- Data fetching pattern
- State management choice
- Routing pattern

**Block 2: Technical Details (45 min)**

- API response format
- Session management
- Error handling

**Block 3: Integrations (30 min)**

- Analytics choice
- Image handling
- Third-party services

**Block 4: Open Questions (30 min)**

- Review all OPEN QUESTIONS sections
- Make decisions or assign for research

**Block 5: Documentation (30 min)**

- Document all decisions
- Update architecture.md
- Create implementation tickets

### Post-Sprint Deliverables

- [ ] Updated architecture.md with all decisions
- [ ] API specification document
- [ ] Component checklist with data requirements
- [ ] Implementation task list

---

## Appendix: Reference Links

**Project Documents:**

- `/docs/MVP-SCOPE.md` - Feature scope
- `/docs/VISION.md` - Mission and vision
- `/docs/SPRINT-PLAN.md` - 4-week timeline
- `/.claude/skills/euongelion-platform/references/database.md` - Schema
- `/.claude/skills/euongelion-platform/references/api-routes.md` - API details
- `/.claude/skills/euongelion-platform/references/architecture.md` - File structure

**External References:**

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Vercel Edge Functions](https://vercel.com/docs/functions/edge-functions)

---

_Prepared for architecture sprint. All decisions made here will guide the 4-week implementation._
