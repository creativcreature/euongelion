# EUANGELION Platform Skill

**Version:** 1.0  
**Last Updated:** January 16, 2026

---

## PURPOSE

This skill defines how to build the EUANGELION devotional platform - all logic, routes, database, and user flows. For visual styling, use the `wokegod-brand` skill.

---

## QUICK REFERENCE

| Key          | Value                                        |
| ------------ | -------------------------------------------- |
| Product      | EUANGELION                                   |
| Parent Brand | wokeGod                                      |
| Domain       | wokegod.world                                |
| Tagline      | "Daily Bread for the cluttered, hungry soul" |
| Tech Stack   | Next.js 14+, Supabase, Claude API, Vercel    |

---

## CORE CONCEPTS

### Three Pathways

| Code       | Name     | Audience                  |
| ---------- | -------- | ------------------------- |
| `sleep`    | Sleep    | Far from faith, skeptical |
| `awake`    | Awake    | Believers seeking depth   |
| `shepherd` | Shepherd | Ministry leaders          |

### Chiastic Structure (A-B-C-B'-A')

```
Day 1 (A):  Introduction
Day 2 (B):  Building
Day 3 (C):  THE PIVOT ← Core revelation
Day 4 (B'): Application
Day 5 (A'): Resolution
```

### 21 Module Types

**Content (18):** scripture, teaching, vocab, story, insight, chronology, geography, profile, bridge, visual, art, voice, comprehension, reflection, interactive, takeaway, resource, prayer

**Game (3):** match, order, reveal

---

## REFERENCE FILES

Read these for implementation details:

| File                   | When to Read                        |
| ---------------------- | ----------------------------------- |
| `architecture.md`      | Setting up project structure        |
| `database.md`          | Creating Supabase schema            |
| `api-routes.md`        | Building API endpoints              |
| `auth-security.md`     | Session management, security        |
| `content-structure.md` | Module system, JSON format          |
| `user-flows.md`        | Onboarding, daily bread, completion |

---

## PRIORITY ORDER

When building, follow this sequence:

1. **Database** → Set up Supabase schema first
2. **Auth** → Session management (cookies)
3. **API Routes** → Soul Audit, Daily Bread, Progress
4. **Components** → UI modules
5. **Styling** → Apply wokegod-brand

---

## ENVIRONMENT VARIABLES

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SITE_URL=https://wokegod.world
```

---

## KEY DECISIONS (LOCKED)

These are final - don't change without explicit approval:

- ✅ MVP has NO user accounts (cookie sessions only)
- ✅ Day-gating unlocks at 7 AM user timezone
- ✅ Max 3 Soul Audits per user
- ✅ Sabbath is user's choice (Sat OR Sun)
- ✅ No payments, no email capture in MVP
- ✅ Content is public (no login to read)

---

## SUCCESS CRITERIA

MVP is complete when:

- [ ] Soul Audit → Match → Series works
- [ ] Day-gating respects timezone
- [ ] All 21 modules render correctly
- [ ] Mobile responsive (320px-1920px)
- [ ] WCAG 2.1 AA compliant
- [ ] Deployed to wokegod.world

---

**For visual styling, see:** `wokegod-brand/SKILL.md`
