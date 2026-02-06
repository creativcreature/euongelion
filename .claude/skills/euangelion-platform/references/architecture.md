# Project Architecture

**Version:** 1.0

---

## TECH STACK

| Layer     | Technology               | Why                                |
| --------- | ------------------------ | ---------------------------------- |
| Framework | Next.js 14+ (App Router) | Server components, easy deployment |
| Styling   | Tailwind CSS             | Utility-first, fast iteration      |
| Database  | Supabase (PostgreSQL)    | Free tier, built-in auth for later |
| AI        | Claude API (Anthropic)   | Best for nuanced matching          |
| Hosting   | Vercel                   | Zero-config Next.js deployment     |
| Domain    | wokegod.world            | Already owned                      |

---

## FILE STRUCTURE

```
euangelion/
├── .claude/
│   └── skills/
│       ├── euangelion-platform/    # App logic skill
│       └── wokegod-brand/          # Visual design skill
│
├── app/
│   ├── page.tsx                    # Landing / Soul Audit
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles + Tailwind
│   │
│   ├── daily-bread/
│   │   └── page.tsx                # Main devotional feed
│   │
│   ├── series/
│   │   ├── page.tsx                # Browse all series
│   │   └── [slug]/
│   │       └── page.tsx            # Single series view
│   │
│   └── api/
│       ├── soul-audit/
│       │   └── route.ts            # POST: Match user to series
│       ├── daily-bread/
│       │   └── route.ts            # GET: Today's content
│       ├── progress/
│       │   └── route.ts            # POST: Mark day complete
│       ├── series/
│       │   └── route.ts            # GET: List all series
│       └── session/
│           └── route.ts            # Manage session
│
├── components/
│   ├── modules/                    # 21 module components
│   │   ├── Scripture.tsx
│   │   ├── Teaching.tsx
│   │   ├── Vocab.tsx
│   │   ├── Story.tsx
│   │   ├── Insight.tsx
│   │   ├── Chronology.tsx
│   │   ├── Geography.tsx
│   │   ├── Profile.tsx
│   │   ├── Bridge.tsx
│   │   ├── Visual.tsx
│   │   ├── Art.tsx
│   │   ├── Voice.tsx
│   │   ├── Comprehension.tsx
│   │   ├── Reflection.tsx
│   │   ├── Interactive.tsx
│   │   ├── Takeaway.tsx
│   │   ├── Resource.tsx
│   │   ├── Prayer.tsx
│   │   ├── Match.tsx              # Game module
│   │   ├── Order.tsx              # Game module
│   │   ├── Reveal.tsx             # Game module
│   │   └── index.ts               # Module registry
│   │
│   ├── ui/                        # Generic UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Textarea.tsx
│   │   ├── Modal.tsx
│   │   ├── Toast.tsx
│   │   ├── Skeleton.tsx
│   │   └── index.ts
│   │
│   ├── SoulAuditForm.tsx          # Main Soul Audit component
│   ├── DailyBreadFeed.tsx         # Main feed component
│   ├── SeriesCard.tsx             # Series preview card
│   ├── DaySelector.tsx            # Day navigation
│   ├── Navigation.tsx             # Header/nav
│   └── ModuleRenderer.tsx         # Dynamic module loader
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser client
│   │   ├── server.ts              # Server client (admin)
│   │   └── types.ts               # TypeScript types
│   │
│   ├── claude.ts                  # Claude API client
│   ├── session.ts                 # Cookie/session management
│   ├── dayGating.ts               # Day unlock logic
│   ├── security.ts                # Input sanitization
│   └── utils.ts                   # Shared utilities
│
├── content/
│   └── series/                    # JSON content files
│       ├── too-busy-for-god.json
│       ├── hearing-god-in-the-noise.json
│       └── ... (17 total)
│
├── public/
│   ├── fonts/
│   │   └── SBLHebrew.woff2
│   └── images/
│       └── og-image.png
│
├── .env.local                     # Environment variables
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## DATA FLOW

### Soul Audit Flow

```
User types response
       ↓
POST /api/soul-audit
       ↓
Sanitize input
       ↓
Rate limit check
       ↓
Claude API → Match to series
       ↓
Create session in Supabase
       ↓
Set httpOnly cookie
       ↓
Return matched series
       ↓
Client redirects to /daily-bread
```

### Daily Bread Flow

```
User visits /daily-bread
       ↓
Check session cookie
       ↓
GET /api/daily-bread
       ↓
Validate session in Supabase
       ↓
Calculate available days (day-gating)
       ↓
Fetch current day's modules
       ↓
Return structured content
       ↓
Client renders modules
```

### Progress Flow

```
User completes day content
       ↓
POST /api/progress
       ↓
Validate session
       ↓
Record completion in Supabase
       ↓
Update current_day
       ↓
Check if series complete
       ↓
Return next steps
```

---

## COMPONENT HIERARCHY

```
RootLayout
├── Navigation
│   ├── Logo (EUANGELION)
│   ├── MenuButton
│   └── ThemeToggle
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
│           └── ... (dynamic)
│
└── SeriesBrowsePage (/series)
    └── SeriesGrid
        └── SeriesCard (×17)
```

---

## STATE MANAGEMENT

### Server State (Supabase)

- User sessions
- Series content
- Progress tracking
- Soul Audit history

### Client State (Cookies + localStorage)

```typescript
// Cookie (httpOnly, server-managed)
euangelion_session: "uuid-token"

// localStorage (client preferences)
{
  theme: 'light' | 'dark',
  fontSize: 'normal' | 'large',
  reduceMotion: boolean
}
```

### URL State

- `/series/[slug]` - Current series
- `/daily-bread?day=3` - Jump to specific day (if available)

---

## RENDERING STRATEGY

| Route            | Rendering        | Why                                  |
| ---------------- | ---------------- | ------------------------------------ |
| `/` (Landing)    | Static + Client  | Fast load, Soul Audit is interactive |
| `/daily-bread`   | Server (Dynamic) | Personalized content                 |
| `/series`        | Static (ISR)     | Content rarely changes               |
| `/series/[slug]` | Static (ISR)     | Content rarely changes               |
| `/api/*`         | Server           | All API routes                       |

### ISR (Incremental Static Regeneration)

```typescript
// For series pages
export const revalidate = 3600 // Rebuild every hour
```

---

## ENVIRONMENT VARIABLES

```bash
# .env.local

# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Anthropic (Required)
ANTHROPIC_API_KEY=sk-ant-...

# Site (Optional)
NEXT_PUBLIC_SITE_URL=https://wokegod.world
NEXT_PUBLIC_SITE_NAME=EUANGELION

# Rate Limiting (Optional - for production)
UPSTASH_REDIS_URL=https://...
UPSTASH_REDIS_TOKEN=...
```

---

## DEPLOYMENT

### Vercel Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ANTHROPIC_API_KEY
```

### Domain Setup

```
1. In Vercel Dashboard → Domains
2. Add: wokegod.world
3. In your registrar, add:
   - A record: @ → 76.76.21.21
   - CNAME: www → cname.vercel-dns.com
4. Wait for DNS propagation (~24 hours)
```

---

## PERFORMANCE TARGETS

| Metric | Target  | How                                   |
| ------ | ------- | ------------------------------------- |
| LCP    | < 2.5s  | Static generation, image optimization |
| FID    | < 100ms | Minimal JS, server components         |
| CLS    | < 0.1   | Reserved space for images             |
| TTI    | < 3.5s  | Code splitting, lazy loading          |
