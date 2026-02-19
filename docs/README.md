# EUONGELION

**A modern devotional platform that meets people where they are spiritually.**

## Overview

EUONGELION is a Progressive Web App (PWA) designed to deliver personalized devotional content through an innovative "Soul Audit" matching system. The platform guides users through 5-day devotional series using a rich module system with 21 different content types.

## Key Features

- **Soul Audit**: AI-powered matching that connects users with devotional series based on their spiritual state
- **Daily Bread Feed**: Personalized devotional content delivered at the right pace
- **21 Module Types**: Rich content including Scripture, Hebrew word studies, teaching, reflection questions, and interactive elements
- **Chiastic Structure**: Content organized using A-B-C-B'-A' patterns that mirror biblical literary structures
- **PaRDeS Framework**: Four layers of interpretation woven throughout (Peshat, Remez, Derash, Sod)
- **Three Pathways**: Sleep, Awake, and Shepherd - meeting users at different spiritual depths
- **Day Gating**: Content unlocks progressively to encourage consistent engagement

## Tech Stack

| Layer     | Technology               |
| --------- | ------------------------ |
| Framework | Next.js 16+ (App Router) |
| Language  | TypeScript               |
| Styling   | Tailwind CSS             |
| Database  | Supabase (PostgreSQL)    |
| AI        | Claude API (Anthropic)   |
| State     | Zustand                  |
| Hosting   | Vercel                   |
| Domain    | wokegod.world            |

## Project Structure

```
EUONGELION-STARTUP/
├── app/                    # Next.js application
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── lib/               # Utilities and helpers
│   ├── stores/            # Zustand state management
│   └── types/             # TypeScript definitions
│
├── content/               # Devotional content and assets
│   ├── approved/          # Published content
│   ├── drafts/            # Work in progress
│   ├── reference/         # Biblical reference data
│   └── series-json/       # JSON content files
│
├── database/              # Database schema and migrations
│   └── migrations/        # SQL migration files
│
├── design-system/         # Design tokens and styles
│
├── docs/                  # Documentation (you are here)
│   ├── technical/         # Technical documentation
│   └── components/        # Component documentation
│
└── .claude/               # AI agent configuration
    └── skills/            # Claude Code skills
```

## Quick Start

1. **Clone and install dependencies**

   ```bash
   cd euongelion
   npm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

3. **Run the development server**

   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Documentation Index

### Main Documentation

- [Architecture](./ARCHITECTURE.md) - System design and data flow
- [Contributing](./CONTRIBUTING.md) - How to contribute
- [Deployment](./DEPLOYMENT.md) - Deployment instructions
- [Development](./DEVELOPMENT.md) - Local setup guide
- [Euangelion Design System](./design/EUANGELION-DESIGN-SYSTEM.md) - Cross-platform Apple-HIG-aligned foundations, components, patterns, and token architecture
- [Change Execution Protocol](./process/CHANGE-EXECUTION-PROTOCOL.md) - Required plan-first and live UI verification workflow

### Technical Documentation

- [Database Schema](./technical/database-schema.md) - Supabase schema
- [API Routes](./technical/api-routes.md) - REST API documentation
- [Authentication](./technical/authentication.md) - Auth flow and security
- [State Management](./technical/state-management.md) - Zustand stores
- [Testing](./technical/testing.md) - Testing guide

### Component Documentation

- [Overview](./components/overview.md) - Component architecture
- [Primitives](./components/primitives.md) - Base UI components
- [Patterns](./components/patterns.md) - Common patterns

## The Vision

EUONGELION ("good news" in Greek) aims to make deep theological content accessible to everyone. Through the Soul Audit, users receive content tailored to their current life circumstances and spiritual journey. The chiastic structure and PaRDeS framework ensure that every devotional has depth while remaining approachable.

### Three Pathways

| Pathway      | Description                  | Target                   |
| ------------ | ---------------------------- | ------------------------ |
| **Sleep**    | Gentle awakening for seekers | New to faith or curious  |
| **Awake**    | Growing in understanding     | Believers wanting growth |
| **Shepherd** | Equipping to lead others     | Mature believers         |

## Brand Identity

The wokeGod brand uses a restrained, biblical color palette:

- **Tehom Black** (#1A1612) - Primary dark
- **Scroll White** (#F7F3ED) - Primary light
- **God is Gold** (#C19A6B) - Accent

Typography emphasizes architectural sans-serif with Hebrew text support for word studies.

## License

Proprietary - EUONGELION / wokeGod

---

_For the most up-to-date information, see the individual documentation files._
