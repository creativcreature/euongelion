# EUONGELION

> **EU·ON·GE·LION** (yoo-on-GEL-ee-on) · Greek: "Good News"

Daily bread for the cluttered, hungry soul. A devotional platform offering clarity, rest, and truth in apocalyptic times.

## Live Site

**Production:** https://euangelion.vercel.app (redirects to euongelion.vercel.app)

## Features

### Core Experience
- **7 Series × 5 Days = 35 Devotionals** — Each series addresses a searching question
- **Soul Audit** — 24-question assessment to discover your spiritual pathway
- **Daily Bread** — Personalized devotional recommendations based on pathway
- **AI Spiritual Guide** — Floating chat for seeking guidance (Claude 3.5 Sonnet)

### Reading Features
- Text highlighting (3 colors, persists to localStorage)
- Reflection prompts with journaling
- Progress tracking with completion badges
- Sequential day unlocking (chiastic structure)
- Bookmarks and sharing

### Technical
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4
- **Database:** Supabase (with localStorage fallback)
- **AI:** Anthropic Claude API
- **Hosting:** Vercel

## Module Types

The platform supports 21 module types for rich devotional content:

**Content (18):** scripture, teaching, vocab, story, insight, chronology, geography, profile, bridge, visual, art, voice, comprehension, reflection, interactive, takeaway, resource, prayer

**Game (3):** match (pair matching), order (sequence), reveal (guess and reveal)

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# Run development server
npm run dev
```

Open [http://localhost:3333](http://localhost:3333) to see the app.

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Anthropic (for AI chat)
ANTHROPIC_API_KEY=sk-ant-...

# Site URL
NEXT_PUBLIC_SITE_URL=https://wokegod.world
```

## Project Structure

```
euongelion/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── api/chat/         # AI chat API route
│   │   ├── daily-bread/      # Personalized feed
│   │   ├── devotional/[slug] # Devotional reader
│   │   ├── series/[slug]     # Series overview
│   │   └── soul-audit/       # Pathway assessment
│   ├── components/           # React components
│   │   ├── modules/          # 21 module types
│   │   └── SpiritualChat.tsx # AI chat component
│   ├── lib/                  # Utilities
│   └── hooks/                # React hooks
├── content/                  # Devotional content (JSON)
└── public/                   # Static assets
```

## Three Pathways

Based on Soul Audit results, users are matched to one of three pathways:

| Pathway | Name | Audience |
|---------|------|----------|
| sleep | Seeker | Far from faith, exploring |
| awake | Growing | Believers seeking depth |
| shepherd | Mature | Ready for deeper theology |

## Chiastic Structure

Each 5-day series follows an A-B-C-B'-A' chiastic arc:
- **Day 1 (A):** Introduction
- **Day 2 (B):** Building
- **Day 3 (C):** THE PIVOT — Core revelation
- **Day 4 (B'):** Application
- **Day 5 (A'):** Resolution

## Credits

- **Built with:** Claude Sonnet 4.5 + Human collaboration
- **Framework:** Matthew 6:33 — "Seek first the kingdom"
- **Mantras:** VENERATE THE MIRACLE. DISMANTLE THE HAVEL.

---

A [wokeGod](https://wokegod.world) project.
