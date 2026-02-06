# Architecture

This document describes the technical architecture of the EUONGELION platform.

## System Overview

EUONGELION is built as a Next.js 16+ application using the App Router, deployed on Vercel with Supabase as the database backend and Claude API for AI-powered content matching.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ React Components │  Zustand Stores │  Service Workers (PWA) │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js App Router                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  API Routes  │  │ Server Components │  Static Generation  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└──────────┬─────────────────┬────────────────────┬───────────────┘
           │                 │                    │
           ▼                 ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│     Supabase     │ │    Claude API    │ │      Vercel CDN      │
│   (PostgreSQL)   │ │   (Anthropic)    │ │   (Static Assets)    │
└──────────────────┘ └──────────────────┘ └──────────────────────┘
```

## File Structure

```
app/
├── api/                          # API Routes
│   ├── devotionals/              # Devotional CRUD
│   └── notifications/            # Push notifications
│
├── components/                   # React Components
│   ├── analytics/               # Analytics components
│   ├── animated/                # Animation components
│   ├── devotional/              # Devotional display
│   ├── forms/                   # Form components
│   ├── icons/                   # Icon components
│   ├── interactive/             # Interactive elements
│   ├── layout/                  # Layout components
│   ├── loading/                 # Loading states
│   ├── notifications/           # Notification UI
│   ├── offline/                 # Offline support
│   ├── reading-animations/      # Reading UX
│   ├── series/                  # Series components
│   ├── transitions/             # Page transitions
│   └── ui/                      # Base UI components
│
├── lib/                         # Utilities
│   ├── analytics/               # Analytics helpers
│   ├── animations/              # Animation utilities
│   ├── content/                 # Content helpers
│   ├── notifications/           # Notification logic
│   ├── offline/                 # Offline support
│   ├── theme/                   # Theme utilities
│   ├── validation/              # Input validation
│   └── date.ts                  # Date utilities
│
├── stores/                      # Zustand State
│   ├── middleware.ts            # Store middleware
│   └── types.ts                 # Store type definitions
│
├── types/                       # TypeScript Types
│   ├── content.ts              # Content types
│   ├── devotional.ts           # Devotional types
│   ├── progress.ts             # Progress types
│   ├── series.ts               # Series types
│   ├── soul-audit.ts           # Soul audit types
│   └── user.ts                 # User types
│
├── src/                         # Source modules
│   ├── app/                     # App router pages
│   └── ...
│
├── public/                      # Static assets
├── globals.css                  # Global styles
├── layout.tsx                   # Root layout
└── tailwind.config.ts           # Tailwind config
```

## Data Flow

### Soul Audit Flow

```
User visits site
       │
       ▼
┌──────────────────┐
│  Soul Audit Form │  ← User answers prompt
└────────┬─────────┘
         │
         ▼
POST /api/soul-audit
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Sanitize   Rate Limit
Input      Check
    │         │
    └────┬────┘
         │
         ▼
┌──────────────────┐
│    Claude API    │  ← Match to best series
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Create Session  │  ← Store in Supabase
└────────┬─────────┘
         │
         ▼
Set httpOnly Cookie
         │
         ▼
Redirect to /daily-bread
```

### Daily Bread Flow

```
User visits /daily-bread
         │
         ▼
Check session cookie
         │
         ▼
GET /api/daily-bread
         │
         ▼
┌──────────────────┐
│ Validate Session │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Calculate Day   │  ← Day gating logic
│   Availability   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Fetch Modules   │
└────────┬─────────┘
         │
         ▼
Return structured content
         │
         ▼
┌──────────────────┐
│ ModuleRenderer   │  ← Dynamic component loading
└──────────────────┘
```

### Progress Flow

```
User completes day
         │
         ▼
POST /api/progress
         │
         ▼
Validate session
         │
         ▼
┌──────────────────┐
│  Record in DB    │  ← Upsert progress
└────────┬─────────┘
         │
         ▼
Update current_day
         │
         ▼
Check series completion
         │
         ▼
Return next steps
```

## Component Hierarchy

```
RootLayout
├── ThemeProvider
│   └── Navigation
│       ├── Logo (EUONGELION)
│       ├── MenuButton
│       └── ThemeToggle
│
├── LandingPage (/)
│   └── SoulAuditForm
│       ├── PromptText
│       ├── Textarea
│       ├── SabbathSelector
│       └── SubmitButton
│
├── DailyBreadPage (/daily-bread)
│   ├── SeriesHeader
│   ├── DaySelector
│   └── DailyBreadFeed
│       └── ModuleRenderer
│           ├── Scripture
│           ├── Teaching
│           ├── Vocab
│           ├── Reflection
│           └── ... (21 module types)
│
└── SeriesBrowsePage (/series)
    └── SeriesGrid
        └── SeriesCard (multiple)
```

## State Management

### Server State (Supabase)

- User sessions
- Series content
- Progress tracking
- Soul Audit history
- Bookmarks

### Client State (Zustand)

```typescript
// Store structure
AuthStore       → Session, login status
UserStore       → Profile, preferences
DevotionalStore → Current content, reading state
ProgressStore   → Streaks, statistics
BookmarkStore   → Saved items
UIStore         → Modals, toasts, navigation
OfflineStore    → Cached content, sync status
SoulAuditStore  → Assessment state
```

### URL State

- `/series/[slug]` - Current series
- `/daily-bread?day=3` - Jump to specific day

## Rendering Strategy

| Route            | Rendering        | Reason                               |
| ---------------- | ---------------- | ------------------------------------ |
| `/` (Landing)    | Static + Client  | Fast load, Soul Audit is interactive |
| `/daily-bread`   | Server (Dynamic) | Personalized content                 |
| `/series`        | Static (ISR)     | Content rarely changes               |
| `/series/[slug]` | Static (ISR)     | Content rarely changes               |
| `/api/*`         | Server           | All API routes                       |

### ISR Configuration

```typescript
// For series pages
export const revalidate = 3600 // Rebuild every hour
```

## Module System

The platform uses 21 interchangeable module types:

### Content Modules (18)

1. Scripture - Bible passages
2. Teaching - Main theological content
3. Vocab - Hebrew/Greek word studies
4. Story - Narrative illustrations
5. Insight - Quick revelations
6. Chronology - Timeline context
7. Geography - Location context
8. Profile - Character studies
9. Bridge - Ancient-modern connections
10. Visual - Diagrams/infographics
11. Art - Photography/fine art
12. Voice - Audio content
13. Comprehension - Understanding checks
14. Reflection - Personal questions
15. Interactive - Engagement elements
16. Takeaway - Summary points
17. Resource - Further reading
18. Prayer - Closing prayers

### Game Modules (3)

19. Match - Pairing exercises
20. Order - Sequencing exercises
21. Reveal - Progressive disclosure

## Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...

# Optional
NEXT_PUBLIC_SITE_URL=https://wokegod.world
NEXT_PUBLIC_SITE_NAME=EUONGELION

# Rate Limiting (Production)
UPSTASH_REDIS_URL=https://...
UPSTASH_REDIS_TOKEN=...
```

## Performance Targets

| Metric | Target  | Strategy                              |
| ------ | ------- | ------------------------------------- |
| LCP    | < 2.5s  | Static generation, image optimization |
| FID    | < 100ms | Minimal JS, server components         |
| CLS    | < 0.1   | Reserved space for images             |
| TTI    | < 3.5s  | Code splitting, lazy loading          |

## Security Considerations

- httpOnly cookies for sessions
- Input sanitization on all user content
- Rate limiting on AI-powered endpoints
- Row Level Security in Supabase
- Service role key server-side only

See [Authentication](./technical/authentication.md) for detailed security documentation.
