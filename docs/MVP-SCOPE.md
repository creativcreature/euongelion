# EUONGELION — MVP Scope

**Version:** 1.1
**Last Updated:** January 16, 2026

---

## The Focus

**The lost and wandering.**

MVP serves people finding their way back to God — the drifted, the skeptical, the seeking. Shepherd tools and community features come later.

---

## IN (MVP — Launch)

### Core Experience

| Feature              | Description                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Soul Audit**       | "What are you wrestling with today?" — Claude API matches response to appropriate series                           |
| **Daily Bread Feed** | Cinematic scroll through day's modules                                                                             |
| **Day-Gating**       | Content unlocks at 7 AM user's timezone, one day at a time                                                         |
| **12 Core Modules**  | Scripture, Teaching, Vocab, Story, Insight, Prayer, Takeaway, Reflection, Bridge, Comprehension, Resource, Profile |
| **Series Browse**    | View all available series                                                                                          |
| **Series Detail**    | Preview series before starting                                                                                     |

### User Management

| Feature                   | Description                                                                     |
| ------------------------- | ------------------------------------------------------------------------------- |
| **Accounts (Magic Link)** | Supabase Auth, email-only, required before starting series                      |
| **Account Flow**          | Soul Audit → Match → "Enter email to save progress" → Magic link → Start series |
| **Sabbath Preference**    | User chooses Saturday or Sunday                                                 |
| **Max 3 Soul Audits**     | Per user, encourages browsing after                                             |

### Engagement

| Feature                     | Description                                                    |
| --------------------------- | -------------------------------------------------------------- |
| **Share Flow**              | Copy link + native share API for series and days               |
| **Print-Friendly Download** | Styled print view, browser print → PDF, available to all users |
| **Progress Tracking**       | Know where you left off, what's completed                      |

### Navigation & UI

| Feature               | Description                     |
| --------------------- | ------------------------------- |
| **Header/Navigation** | Logo, menu, theme toggle        |
| **Settings Page**     | Change Sabbath, theme, timezone |
| **Error Pages**       | 404, 500, session expired       |
| **Loading States**    | Feedback for all async actions  |

### Design & Experience

| Feature               | Description                                              |
| --------------------- | -------------------------------------------------------- |
| **Brand Styling**     | Full wokegod-brand applied (colors, typography, spacing) |
| **Dark Mode**         | Complete light/dark support                              |
| **Mobile Responsive** | 320px → 1920px, mobile-first                             |
| **Accessibility**     | WCAG 2.1 AA compliant                                    |
| **SEO Basics**        | Meta tags, Open Graph images for sharing                 |

### Analytics

| Feature            | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| **Core Metrics**   | Track: new users, series starts, completions, return visits, shares |
| **Implementation** | Vercel Analytics or Plausible (privacy-respecting)                  |

---

## Module Tiers

### MVP (12 Modules)

**Simple (text-based):**

- Scripture
- Teaching
- Vocab
- Story
- Insight
- Prayer
- Takeaway
- Reflection

**Medium (structured):**

- Bridge
- Comprehension
- Resource
- Profile

### Phase 2 (9 Modules)

**Supporting:**

- Chronology
- Geography

**Media:**

- Visual
- Art
- Voice

**Interactive/Games:**

- Interactive
- Match
- Order
- Reveal

---

## OUT (Phase 2+)

### Take It With You

| Feature               | Description                              |
| --------------------- | ---------------------------------------- |
| Server-generated PDFs | Proper branded downloadable PDFs         |
| Offline mode          | Service worker, works without connection |

### Shepherd Tools (All)

| Feature                    | Reason                        |
| -------------------------- | ----------------------------- |
| Shepherd-tagged series     | Focus is lost/wandering first |
| Ministry materials builder | Phase 2                       |
| Print templates            | Phase 2                       |
| Presentation mode          | Phase 2                       |

### Remaining Modules

| Feature                           | Reason           |
| --------------------------------- | ---------------- |
| Chronology, Geography             | Scope            |
| Visual, Art, Voice                | Media complexity |
| Match, Order, Reveal, Interactive | Game complexity  |

### Community & Social

| Feature                        | Reason           |
| ------------------------------ | ---------------- |
| Group devotionals              | Pinned for later |
| Discussion features            | Pinned for later |
| Testimonies / Stories of Faith | Need users first |
| Save/Bookmark specific content | Phase 2          |

### Growth Features

| Feature                  | Reason                  |
| ------------------------ | ----------------------- |
| Email sequences          | Not MVP                 |
| Push notifications       | Pressure tactic — avoid |
| Payments / subscriptions | Not MVP                 |

---

## The Line

If it's not in the "IN" list, it's not MVP.

When scope creep tempts, ask:

1. Does this serve the lost and wandering?
2. Can we launch without it?
3. Will adding it delay reaching people?

If the answer to #2 is "yes" — it's Phase 2.

---

## Success Criteria (MVP)

MVP is complete when:

- [ ] Soul Audit → Match → Account creation → Series works end-to-end
- [ ] Day-gating respects 7 AM user timezone
- [ ] All 12 core modules render correctly
- [ ] Series completion flow works
- [ ] Magic link auth functional (Supabase Auth)
- [ ] Share flow works (copy link + native share)
- [ ] Print-friendly download works
- [ ] Navigation, settings, error pages complete
- [ ] Mobile responsive (tested at 320px, 768px, 1440px)
- [ ] Dark mode complete
- [ ] WCAG 2.1 AA accessibility
- [ ] Analytics tracking core metrics
- [ ] Deployed to wokegod.world

---

## Content Requirement

MVP launches with:

- Minimum 5 series converted to JSON format
- Content targeting "Sleep" and "Awake" pathways
- Only uses the 12 MVP modules
- Shepherd content waits for Phase 2

---

## Database Schema Updates Needed

```sql
-- Link sessions to authenticated users
ALTER TABLE user_sessions
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Index for user lookup
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
```

Supabase Auth handles `auth.users` table automatically.

---

## Technical Stack

| Layer     | Choice                            |
| --------- | --------------------------------- |
| Framework | Next.js 14+ (App Router)          |
| Auth      | Supabase Auth (magic link)        |
| Database  | Supabase (PostgreSQL)             |
| AI        | Claude API (Anthropic)            |
| Hosting   | Vercel                            |
| Analytics | Vercel Analytics or Plausible     |
| Email     | Supabase Auth handles magic links |

---

_Ship this. Learn. Iterate. The lost are waiting._
