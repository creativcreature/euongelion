# Soul Audit: Consolidated Analysis

**Generated:** 2026-02-14
**Sources reviewed:** 63 files across 9 categories
**Purpose:** Single reference for the complete Soul Audit feature — flow, architecture, contracts, conflicts, and gaps.

---

## Table of Contents

1. [What the Soul Audit Is](#1-what-the-soul-audit-is)
2. [The Complete User Journey](#2-the-complete-user-journey)
3. [Locked Decisions (Do Not Revisit)](#3-locked-decisions)
4. [API Contracts](#4-api-contracts)
5. [State Management & Tokens](#5-state-management--tokens)
6. [Day-Gating & Scheduling](#6-day-gating--scheduling)
7. [Curation Engine & Matching](#7-curation-engine--matching)
8. [Crisis Path](#8-crisis-path)
9. [Navigation & Routing Architecture](#9-navigation--routing-architecture)
10. [Database Schema](#10-database-schema)
11. [Analytics Events](#11-analytics-events)
12. [Conflicts Found](#12-conflicts-found)
13. [Recommendations](#13-recommendations)
14. [Gap Questions](#14-gap-questions)

---

## 1. What the Soul Audit Is

A single open-ended question ("What are you wrestling with today?") that matches users to a curated 5-day devotional series. Not a quiz. Not a diagnostic. A pastoral intake that listens to what the user is carrying and responds with focused content.

**Core contract:**

- 1 question in, 5 options out (3 AI-matched + 2 curated prefab)
- User selects 1 series, which becomes their "active devotional"
- 5-day reading plan unlocks one day at a time (7 AM local)
- 3 audits per series cycle, then browse manually
- No account required to start; session cookie tracks state

---

## 2. The Complete User Journey

### 2.1 First-Time User (Happy Path)

```
LANDING PAGE (/)
  │  Inline Soul Audit textarea visible above fold
  │  Prompt: "What are you wrestling with today?"
  │  Subtext: "Write one honest paragraph, and we will customize a 5 day devotional plan for you."
  │
  ▼
SUBMIT (user types 10+ chars, clicks "GET MY DEVOTION")
  │  Processing: "BUILDING YOUR PLAN..." (2-4 seconds)
  │  Claude API semantic analysis + keyword fallback
  │  Crisis detection runs in parallel
  │
  ▼
RESULTS PAGE (/soul-audit/results)
  │  5 equal cards presented (no visual hierarchy between them):
  │    3 AI-matched options (Claude-ranked by relevance)
  │    2 curated prefab options (hand-selected by editorial team)
  │  Each card shows: series title, question, pathway badge, Day 1 preview
  │  User clicks one card to select
  │
  ▼
SELECTION LOCKED
  │  Chosen series becomes "active devotional"
  │  Session stored (cookie + sessionStorage)
  │  Plan instantiated: 5-day schedule calculated from today
  │
  ▼
SERIES PAGE (/wake-up/series/[slug])
  │  Series overview with 5 days listed
  │  Day 1 unlocked, Days 2-5 locked with unlock times shown
  │  "Begin" button starts Day 1
  │
  ▼
DEVOTIONAL PAGE (/wake-up/devotional/[slug])
  │  Full reading experience: Scripture → Teaching → Prayer
  │  "Mark as Complete" button at bottom
  │  Next day unlocks at 7 AM tomorrow
  │
  ▼
SERIES COMPLETION (Day 5 complete)
  │  Recap/celebration state
  │  Two options offered:
  │    "Take Another Soul Audit" (if < 3 audits used)
  │    "Browse All Series" (always available)
  │
  ▼
CYCLE REPEATS or MANUAL BROWSE
```

### 2.2 Returning User (Has Active Devotional)

```
LANDING PAGE (/)
  │  Detects active devotional via session/cookie
  │  Shows "You have a devotional waiting" state
  │  CTA: "CONTINUE MY DEVOTIONAL"
  │
  ▼
SERIES PAGE or DEVOTIONAL PAGE
  │  Resumes at last unlocked day
  │  Progress bar shows completion
```

### 2.3 Returning User (Series Complete, Audits Remaining)

```
LANDING PAGE (/)
  │  No active devotional detected
  │  Soul Audit textarea shown (fresh)
  │  Audit count: "Audit 2 of 3" shown
  │
  ▼
[Same flow as first-time user]
```

### 2.4 Returning User (3 Audits Exhausted)

```
LANDING PAGE (/)
  │  Audit limit reached
  │  Message: "You've explored enough. Time to dive in."
  │  CTA redirects to /series (full browse)
  │
  ▼
SERIES BROWSE (/series)
  │  All 26 series displayed
  │  User selects manually
```

### 2.5 Reset Flow

```
USER CLICKS "Reset Audit"
  │  Clears: sessionStorage, Zustand store, server state
  │  Audit count resets to 0
  │  Active devotional cleared
  │  Returns to fresh Soul Audit state
```

---

## 3. Locked Decisions

These are finalized and should not be revisited without founder approval.

| ID     | Decision                                                  | Detail                                                         |
| ------ | --------------------------------------------------------- | -------------------------------------------------------------- |
| D3     | Inline audit on homepage                                  | Textarea lives on `/`, not a separate page                     |
| D5     | 3 equal match cards                                       | No visual primary/secondary distinction                        |
| D21    | Match to existing series only                             | No custom plan generation from audit input                     |
| SA-001 | Submit returns options only                               | Never a full plan on submit                                    |
| SA-002 | 5 options: 3 AI + 2 prefab                                | Enforced split                                                 |
| SA-003 | Essential consent required, analytics opt-in defaults OFF | Never pre-checked                                              |
| SA-004 | Crisis acknowledgement gate required                      | Must acknowledge before continuing                             |
| SA-005 | Curated-first with fail-closed core                       | Missing curated core = error, not empty                        |
| SA-006 | No full plan until selection                              | Plan renders only after user picks a series                    |
| SA-007 | Monday scheduling policy                                  | Mid-week starts get onboarding devotional, cycle begins Monday |
| —      | Single open-ended question                                | "What are you wrestling with today?"                           |
| —      | 3 audits per series cycle                                 | Resets on series completion, not lifetime                      |
| —      | 10+ character minimum                                     | Soft validation with gentle nudge                              |
| —      | Claude API + keyword fallback                             | Graceful degradation if API fails                              |
| —      | Crisis 4-step protocol                                    | Acknowledge → Resources → Prayer offer → Continue path         |

---

## 4. API Contracts

### POST /api/soul-audit/submit

**Purpose:** Accept user text, return 5 matched options (no plan).

**Request:**

```json
{
  "response": "string (10-2000 chars, sanitized)"
}
```

**Response (200):**

```json
{
  "options": [
    {
      "slug": "identity",
      "title": "Identity Crisis",
      "question": "When everything that defined you is shaken, who are you?",
      "pathway": "Awake",
      "reasoning": "string (why this matches)",
      "kind": "ai_primary" | "curated_prefab",
      "preview": { "verse": "...", "teaching_snippet": "..." }
    }
  ],
  "auditRunId": "string (token for this audit run)",
  "requiresEssentialConsent": true,
  "requiresCrisisAcknowledgement": false
}
```

**Error responses:**

- `400` — Input too short (< 10 chars) or missing
- `429` — Rate limit (5 per hour per IP) or audit limit (3 per session)
- `500` — Claude API failure (falls back to keyword matching)

**Forbidden response tokens:** `customPlan`, `customDevotional` — must never appear.

### POST /api/soul-audit/consent

**Purpose:** Record essential consent + optional analytics consent.

**Request:**

```json
{
  "auditRunId": "string",
  "essentialConsent": true,
  "analyticsConsent": false
}
```

**Response (200):**

```json
{
  "consentRecorded": true,
  "proceedToSelection": true
}
```

### POST /api/soul-audit/select

**Purpose:** Lock user's choice, instantiate plan.

**Request:**

```json
{
  "auditRunId": "string",
  "selectedSlug": "identity"
}
```

**Response (200):**

```json
{
  "planCreated": true,
  "route": "/wake-up/series/identity",
  "startDate": "2026-02-14",
  "schedule": [
    {
      "day": 1,
      "date": "2026-02-14",
      "slug": "identity-crisis-day-1",
      "unlockAt": "..."
    },
    {
      "day": 2,
      "date": "2026-02-15",
      "slug": "identity-crisis-day-2",
      "unlockAt": "..."
    }
  ]
}
```

### GET /api/soul-audit/current

**Purpose:** Check if user has an active audit/plan.

**Response (200):**

```json
{
  "hasCurrent": true,
  "route": "/wake-up/series/identity"
}
```

### POST /api/soul-audit/reset

**Purpose:** Clear active audit run and route state.

**Response (200):**

```json
{
  "reset": true
}
```

### Rate Limiting

| Endpoint                   | Limit      | Window           |
| -------------------------- | ---------- | ---------------- |
| /api/soul-audit/submit     | 5 per IP   | 1 hour (sliding) |
| /api/soul-audit/\* (other) | 100 per IP | 1 minute         |
| Auth endpoints             | 10 per IP  | 15 minutes       |

---

## 5. State Management & Tokens

### Three State Layers

| Layer                       | What It Holds                                 | Lifetime                  | Cleared By                 |
| --------------------------- | --------------------------------------------- | ------------------------- | -------------------------- |
| **Zustand store** (client)  | auditCount, lastResults, lastInput            | Page session              | Reset button, page refresh |
| **sessionStorage** (client) | soul-audit-submit-v2, soul-audit-selection-v2 | Browser tab               | Reset button, tab close    |
| **Server session** (cookie) | Active devotional, audit run ID, progress     | 30 days (httpOnly cookie) | Reset API, cookie expiry   |

### Token Types

| Token              | Purpose                                | Generated When            | Consumed When                 |
| ------------------ | -------------------------------------- | ------------------------- | ----------------------------- |
| **auditRunId**     | Links submit → consent → select stages | /submit response          | /consent and /select requests |
| **Session cookie** | Identifies user across visits          | First submit or selection | Every API request (auto)      |
| **consentToken**   | Proves consent was given               | /consent response         | /select validation            |

### Zustand Store Shape

```typescript
interface SoulAuditStoreState {
  auditCount: number // 0-3
  lastInput: string | null // Last audit text
  lastResults: object | null // Last API response
  MAX_AUDITS: 3

  recordAudit(text: string, result: object): void
  hasReachedLimit(): boolean
  resetAudit(): void
}
```

Persisted to localStorage via Zustand persist middleware.

---

## 6. Day-Gating & Scheduling

### Standard Schedule (Monday Start)

| Day | Date      | Content              | Unlocks At    |
| --- | --------- | -------------------- | ------------- |
| 1   | Monday    | Series Day 1         | Immediately   |
| 2   | Tuesday   | Series Day 2         | 7:00 AM local |
| 3   | Wednesday | Series Day 3         | 7:00 AM local |
| 4   | Thursday  | Series Day 4         | 7:00 AM local |
| 5   | Friday    | Series Day 5         | 7:00 AM local |
| 6   | Saturday  | Recap                | 7:00 AM local |
| 7   | Sunday    | Sabbath (no content) | —             |

### Mid-Week Start Variants

| Start Day        | What Happens                                                    |
| ---------------- | --------------------------------------------------------------- |
| Monday           | Normal 5-day cycle begins immediately                           |
| Tuesday          | Day 1 starts, archived Monday content available readonly        |
| Wednesday–Sunday | Onboarding devotional first, then full cycle begins next Monday |

### Unlock Algorithm

```
available_day = floor((now - start_date) / 24_hours) + 1
unlocked = current_time >= 7:00 AM AND day_number <= available_day AND NOT sabbath
```

### Locked Day Copy

- Primary: "This day isn't ready yet. Good things take time. Including you."
- Shows: unlock timestamp ("Unlocks tomorrow at 7:00 AM")
- CTA: "Review Previous Days"

### Sabbath Day

- No new content
- Shows: rest screen with Psalm 46:10
- Copy: "Today is Sabbath. No new content today. Just rest."

---

## 7. Curation Engine & Matching

### How Matching Works

1. **User submits text** → sanitized, sent to Claude API
2. **Claude analyzes** emotional state, themes, circumstances
3. **Claude ranks** against series metadata (keywords, tones, circumstances)
4. **Engine builds 5 options:**
   - Top 3 Claude-ranked matches → `ai_primary` kind
   - 2 editorial prefabs → `curated_prefab` kind
5. **If Claude fails** → keyword matching fallback (zero cost)
6. **If both fail** → full series browse offered

### Confidence Thresholds

| Confidence | Behavior                                |
| ---------- | --------------------------------------- |
| > 85%      | Direct match, high-conviction card      |
| 70-85%     | Match + "also consider" alternatives    |
| 50-70%     | Match but emphasize "Browse All Series" |
| < 50%      | Default to browse, no forced match      |

### Curated-First Principle

Source priority for plan content assembly:

1. `content/approved` (manually vetted by founder)
2. `content/final` (ready for publish)
3. `content/series-json` (structured JSON files)
4. AI generation is assistive only (polish, not core)

**Fail-closed:** If curated core modules are missing, the system errors rather than serving AI-generated replacements silently.

### Series Metadata Required for Matching

```typescript
{
  slug: string,
  title: string,
  question: string,
  pathway: 'Sleep' | 'Awake' | 'Shepherd',
  keywords: string[],          // e.g. ["busy", "overwhelmed", "exhausted"]
  // NEEDED BUT NOT CONFIRMED PRESENT:
  emotional_tones: string[],   // e.g. ["anxious", "restless", "empty"]
  life_circumstances: string[] // e.g. ["career stress", "burnout"]
}
```

### Known Series Gaps (No Direct Match)

| User Signal                | Status                                      |
| -------------------------- | ------------------------------------------- |
| Grief / Loss               | NO DEDICATED SERIES                         |
| Anger / Frustration        | NO DEDICATED SERIES                         |
| Anxiety / Existential Fear | NO DEDICATED SERIES (different from "busy") |
| Shame / Guilt              | Partial (Once Saved Always Saved)           |
| Relationship struggles     | Partial (Blueprint of Community)            |

---

## 8. Crisis Path

### Detection

Claude analyzes audit text for crisis signals: suicidal ideation, abuse disclosure, acute distress, self-harm references.

### 4-Step Protocol

1. **Acknowledge** — "We hear you. What you're carrying sounds incredibly heavy."
2. **Resources** — Display crisis hotlines. User MUST acknowledge before continuing.
   - National Suicide Prevention Lifeline: 988
   - Crisis Text Line: Text HOME to 741741
   - International Association for Suicide Prevention: [link]
3. **Warm offer** — "Would you like someone to pray for you?"
4. **Clear path** — "Continue to Euangelion" button always available

**Rule:** No user is ever dead-ended at the crisis screen. A path to content always exists after acknowledgement.

---

## 9. Navigation & Routing Architecture

### Route Map

```
/                           Landing page (inline Soul Audit)
/soul-audit                 Standalone audit page (alternative entry)
/soul-audit/results         Match results (5 cards)
/series                     Browse all 26 series
/wake-up                    Wake Up magazine landing (7 original series)
/wake-up/series/[slug]      Series overview + day list
/wake-up/devotional/[slug]  Devotional reader
/settings                   User settings
/privacy                    Privacy policy
/terms                      Terms of service
```

### Navigation Components

**Desktop:** Sticky top bar (logo left, nav links center, dark toggle right). Docks to top on scroll.

**Mobile:** Hamburger menu, slide-out panel. Same links as desktop.

### Breadcrumb Expectations

| Page                                      | Expected Breadcrumb                        |
| ----------------------------------------- | ------------------------------------------ |
| /wake-up/series/identity                  | ← All Series                               |
| /wake-up/devotional/identity-crisis-day-1 | ← Back (to series) + Previous/Next day nav |
| /soul-audit/results                       | ← (back to homepage audit)                 |

### Dead-End Prevention Rules

Per production governance, these states must NEVER exist:

- "You have no series" without a path forward
- Locked day without unlock time shown
- Error state without recovery CTA
- Empty results without browse fallback
- Broken link or 404 without navigation back

### Current Routing Concerns

1. **Two audit entry points** — `/` (inline) and `/soul-audit` (standalone). Are they in sync?
2. **Results page** (`/soul-audit/results`) — Can user navigate here directly without submitting? What happens?
3. **Active devotional routing** — When user has active series, homepage shows "Continue" CTA. But what if they navigate to `/soul-audit` directly?
4. **Series page vs devotional page** — User lands on series page first, then clicks into devotional. Is this always the flow, or can users deep-link to devotionals?
5. **Back navigation from devotional** — Footer has "← Back" but breadcrumb behavior on mobile not specified.

---

## 10. Database Schema

### Core Tables

```sql
-- User sessions (anonymous, cookie-based)
user_sessions (
  id UUID PRIMARY KEY,
  session_token VARCHAR UNIQUE NOT NULL,
  active_series_id UUID,
  start_date DATE,
  current_day INTEGER DEFAULT 1,
  sabbath_preference 'saturday' | 'sunday',
  soul_audit_count INTEGER DEFAULT 0,
  timezone VARCHAR,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Soul Audit structured assessment (multi-question format)
soul_audit_questions (
  id UUID PRIMARY KEY,
  question_text TEXT NOT NULL,
  category question_category,  -- 8 categories
  question_type question_type, -- scale, multiple_choice, text, yes_no
  weight DECIMAL(3,2) DEFAULT 1.00,
  is_active BOOLEAN DEFAULT true
)

-- Soul Audit responses
soul_audit_responses (
  id UUID PRIMARY KEY,
  user_id UUID,
  question_id UUID,
  session_id UUID,
  response_value INTEGER,
  response_text TEXT,
  created_at TIMESTAMPTZ
)

-- Soul Audit sessions (tracking audit runs)
soul_audit_sessions (
  id UUID PRIMARY KEY,
  user_id UUID,
  completed_at TIMESTAMPTZ,
  total_score INTEGER,
  category_scores JSONB,
  recommendations JSONB,
  created_at TIMESTAMPTZ
)

-- Progress tracking
progress (
  id UUID PRIMARY KEY,
  session_id UUID,
  series_id UUID,
  day_number INTEGER,
  created_at TIMESTAMPTZ
)
```

---

## 11. Analytics Events

### P0 (Must Ship)

| Event                 | Trigger            | Key Properties                                                           |
| --------------------- | ------------------ | ------------------------------------------------------------------------ |
| `soul_audit_view`     | Form visible       | —                                                                        |
| `soul_audit_start`    | User begins typing | —                                                                        |
| `soul_audit_submit`   | Form submitted     | `response_length`                                                        |
| `soul_audit_complete` | Match returned     | `matched_series`, `confidence`, `response_time_ms`, `alternatives_count` |
| `series_start`        | User begins series | `series_slug`, `source` (soul_audit/browse/share), `pathway`             |
| `day_view`            | Devotional loaded  | `series_slug`, `day_number`, `is_locked`                                 |
| `day_complete`        | Marked complete    | `series_slug`, `day_number`, `reading_time_seconds`, `scroll_depth`      |
| `series_complete`     | All days done      | `series_slug`, `total_time_days`, `completion_rate`                      |
| `return_visit`        | After 24+ hours    | `days_since_last_visit`, `active_series`, `current_day`                  |

### Funnel Targets

| Step                               | Target Rate            |
| ---------------------------------- | ---------------------- |
| Audit Start → Submit               | > 70%                  |
| Submit → Complete (match returned) | > 90%                  |
| Match → Series Start               | > 50%                  |
| Day 1 Complete                     | > 60% of series starts |
| Series Complete                    | > 25% of series starts |

---

## 12. Conflicts Found

### CRITICAL CONFLICTS

#### C1: Three-Stage Flow vs. Single-Stage Implementation

| Document                                     | Says                                                    |
| -------------------------------------------- | ------------------------------------------------------- |
| flow-contracts.md, production-decisions.yaml | 3-stage required: submit → consent → select             |
| Current `/api/soul-audit` route              | Single POST returns match + creates session immediately |

**Impact:** Consent gating not enforced. Plan visibility not controlled. Selection locking bypassed.
**Recommendation:** Implement the 3-stage flow as documented. The single-endpoint approach was likely an early prototype.

#### C2: Rate Limit Disagreement

| Document                                  | Limit                               |
| ----------------------------------------- | ----------------------------------- |
| api-routes.md (technical)                 | 10 per hour per IP                  |
| SECURITY-CHECKLIST.md                     | 5 per hour per IP                   |
| Current implementation (auth-security.md) | 5 per hour (Upstash sliding window) |

**Recommendation:** Standardize on 5 per hour (more conservative). Update api-routes.md.

#### C3: Authentication Model Confusion

| Document                      | Says                                           |
| ----------------------------- | ---------------------------------------------- |
| SOUL-AUDIT-DESIGN.md (#11)    | "Account required to see results"              |
| Homepage implementation       | No account required, results shown immediately |
| authentication.md             | Magic link auth infrastructure exists          |
| PRODUCTION-SOURCE-OF-TRUTH.md | No account requirement mentioned               |

**Recommendation:** The current implementation (no account required) matches the production source of truth. Update SOUL-AUDIT-DESIGN.md decision #11 to mark as SUPERSEDED.

#### C4: Question Format — Single Open-Ended vs. Multi-Question

| Document                | Says                                                                          |
| ----------------------- | ----------------------------------------------------------------------------- |
| SOUL-AUDIT-DESIGN.md    | Single open-ended question: "What's weighing on your heart?"                  |
| Homepage implementation | "What are you wrestling with today?"                                          |
| database-schema.md      | Multi-question schema with 8 categories, scale/multiple-choice types, scoring |
| state-management.md     | Multi-question Zustand store with `SoulAuditQuestion[]` and `categoryScores`  |

**Impact:** The database schema and Zustand store types describe a COMPLETELY DIFFERENT feature (structured multi-question assessment) than what's actually built (single open-ended textarea). These are two different products.

**Recommendation:** Decide which model is canonical:

- **Option A (current):** Single open-ended question → Claude matching. Delete/archive the multi-question schema and types.
- **Option B (future):** Multi-question structured assessment. Requires new UI, new API, new scoring. Major rebuild.
- **Option C:** Both exist — open-ended for quick start, structured assessment as a deeper follow-up post-series.

#### C5: Audit Limit Scope

| Document             | Says                                                    |
| -------------------- | ------------------------------------------------------- |
| SOUL-AUDIT-DESIGN.md | 3 audits per series cycle (resets on series completion) |
| api-routes.md        | Max 3 Soul Audits per session                           |
| soulAuditStore.ts    | `MAX_AUDITS: 3` (Zustand, persisted to localStorage)    |
| Homepage             | "Audit X of 3" counter, "Reset Audit" button            |

**Ambiguity:** "Per series cycle" vs "per session" vs "persisted in localStorage" are three different scoping mechanisms. What actually resets the counter?

**Recommendation:** Clarify: The counter resets when (a) user completes a series, OR (b) user explicitly clicks "Reset Audit". The Zustand store with localStorage persistence is the source of truth client-side. Server-side `soul_audit_count` on `user_sessions` should mirror this.

#### C6: Option Count — 3 vs 5

| Document                           | Says                                                         |
| ---------------------------------- | ------------------------------------------------------------ |
| SOUL-AUDIT-DESIGN.md (#14)         | "AI Audit Recommends ONE Series at a time"                   |
| SOUL-AUDIT-DESIGN.md (#6)          | "Top 3 Matches" on low confidence                            |
| D5 (MASTER-LOG)                    | "3 equal match cards"                                        |
| SA-002 (production-decisions.yaml) | "5 options: 3 AI + 2 prefab"                                 |
| Homepage implementation            | Shows 3 AI options only (soul-audit/results page shows more) |

**Impact:** The evolution from "1 match" → "3 matches" → "5 options (3+2)" is documented across time but the final canonical answer is SA-002: **5 options total**.

**Recommendation:** SA-002 is the locked decision. All documents should reference 5 options. Update SOUL-AUDIT-DESIGN.md decisions #6 and #14 to note they were superseded by SA-002.

#### C7: Content Volume Expectations

| Document               | Says                                                   |
| ---------------------- | ------------------------------------------------------ |
| DEVOTIONAL-STRATEGY.md | 365+ devotionals planned                               |
| MASTER-DECISIONS.md    | 505+ devotionals needed, 42/week pace                  |
| Current inventory      | 26 series, ~130 devotionals (81+ JSON files confirmed) |
| Series day counts      | Mix of 5-day and 6-day series                          |

**Recommendation:** Accept current inventory as MVP scope. 365+ is a post-launch goal. Document this explicitly.

### MINOR CONFLICTS

| ID  | Conflict                                                                 | Resolution                                                                                       |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| M1  | "What's weighing on your heart?" vs "What are you wrestling with today?" | Two approved variants. Homepage uses "wrestling." SOUL-AUDIT-DESIGN uses "weighing." Both valid. |
| M2  | 12 MVP modules vs 21 total module types                                  | 12 is MVP; 9 additional are Phase 2. Already documented.                                         |
| M3  | Series cycle = "7 days" vs "5 days + recap + sabbath"                    | Same thing. 5 content days + Day 6 recap + Day 7 sabbath = 7 total.                              |

---

## 13. Recommendations

### R1: Resolve the Multi-Question vs Open-Ended Conflict (C4)

This is the biggest architectural ambiguity. The database has a full structured assessment schema (`soul_audit_questions` with 8 categories, scale types, scoring) while the actual product is a single textarea. These cannot coexist without a decision.

**Recommended action:** Archive the multi-question schema as "future consideration." The current single open-ended approach is working, aligns with the brand ("pastoral, not clinical"), and is the founder-approved design. Add a note to database-schema.md marking those tables as "reserved for future structured assessment."

### R2: Implement the 3-Stage API Flow (C1)

The documented flow (submit → consent → select) is the correct architecture. The current single-endpoint approach skips consent and selection locking. Implement:

1. `/api/soul-audit/submit` — returns options + auditRunId
2. `/api/soul-audit/consent` — records consent, returns consentToken
3. `/api/soul-audit/select` — locks selection, instantiates plan

### R3: Standardize the Rate Limit (C2)

Use 5 per hour for soul audit submit. Update api-routes.md to match SECURITY-CHECKLIST.md.

### R4: Define the Reset State Machine

Currently, reset behavior is scattered across multiple docs. Define explicitly:

```
STATES:
  IDLE          — No active audit, no active devotional
  AUDIT_PENDING — Audit submitted, viewing results
  PLAN_ACTIVE   — Series selected, reading in progress
  PLAN_COMPLETE — All 5 days done, series finished
  LIMIT_REACHED — 3 audits used, must browse manually

TRANSITIONS:
  IDLE → AUDIT_PENDING       via: submit audit
  AUDIT_PENDING → PLAN_ACTIVE via: select series
  AUDIT_PENDING → IDLE        via: reset / abandon
  PLAN_ACTIVE → PLAN_COMPLETE via: complete Day 5
  PLAN_COMPLETE → IDLE        via: series completion resets counter
  PLAN_COMPLETE → AUDIT_PENDING via: re-audit (if < 3)
  ANY → IDLE                  via: explicit reset button
  AUDIT_PENDING (3rd time) → LIMIT_REACHED
  LIMIT_REACHED → IDLE        via: explicit reset only
```

### R5: Populate Series Metadata Completely

For matching to work reliably, every series needs:

- `keywords[]` — confirmed present in `series.ts`
- `emotional_tones[]` — NOT confirmed. Add to series data.
- `life_circumstances[]` — NOT confirmed. Add to series data.

### R6: Create the 3 Missing Series

Before launch, address the matching gaps:

1. **Grief/Loss** — "When the person you love is gone and God feels silent"
2. **Anger/Frustration** — "When the world is broken and you're done pretending it's fine"
3. **Anxiety/Fear** — "When dread lives in your chest and won't leave"

### R7: Audit the Two Entry Points

The Soul Audit lives in two places:

1. Homepage (`/`) — inline textarea
2. Standalone (`/soul-audit`) — dedicated page

Ensure they share state, produce identical results, and don't create parallel audit runs. Consider whether the standalone page is still needed or if it should redirect to `/#start-audit`.

### R8: Define Breadcrumb Rules for Every Route

| Route                        | Back Link        | Context                     |
| ---------------------------- | ---------------- | --------------------------- |
| `/soul-audit/results`        | ← Back to Home   | Returns to audit textarea   |
| `/wake-up/series/[slug]`     | ← All Series     | Goes to /wake-up or /series |
| `/wake-up/devotional/[slug]` | ← [Series Title] | Goes to series page         |
| `/series`                    | ← Home           | Goes to /                   |
| `/wake-up`                   | ← Home           | Goes to /                   |

### R9: Mark Superseded Decisions

SOUL-AUDIT-DESIGN.md contains 16 finalized decisions. Several have been superseded by later production decisions (SA-xxx). Add "SUPERSEDED BY SA-xxx" annotations to:

- Decision #6 (Top 3 matches → now 5 options per SA-002)
- Decision #11 (Account required → now no account per production implementation)
- Decision #14 (ONE series recommended → now 5 options per SA-002)

---

## 14. Gap Questions

These are questions the documentation does not answer but must be resolved before the Soul Audit can be considered production-complete.

### Flow & State

1. **What happens if a user navigates to `/soul-audit/results` without submitting an audit?** Does the page show an error? Redirect to home? Show stale results from sessionStorage?

2. **What happens if a user has an active devotional and navigates to `/soul-audit` directly?** Should they be blocked from re-auditing? Warned? Allowed to start a new audit (abandoning current series)?

3. **What happens to the active devotional if the user's session cookie expires mid-series?** Is progress lost? Can they resume by re-auditing? Is progress tied to the cookie or to a server-side record?

4. **What happens if the user closes the browser mid-audit (after submit, before select)?** Is the auditRunId still valid on return? How long does it persist?

5. **Can a user have multiple audit runs in parallel?** (e.g., open two tabs, submit two different audits). What resolves the conflict?

6. **What is the exact behavior of "Reset Audit"?** Does it clear only the client state (Zustand + sessionStorage) or also the server state? Does it delete the server session? Does it reset progress on the current series?

7. **After series completion, does the audit counter auto-reset or does the user need to click something?** The docs say "reset when series completes" but also "user chooses."

### Routing & Navigation

8. **What is the canonical "home" for a user with an active devotional?** Is it `/` (landing page with "Continue" CTA), `/wake-up/series/[slug]` (series page), or a `/daily-bread` dashboard that doesn't exist yet?

9. **Should `/soul-audit` (standalone page) exist at all?** The homepage has inline audit. Having two entry points creates state sync risk. Should `/soul-audit` redirect to `/#start-audit`?

10. **What is the mobile back-button behavior on the devotional reader?** Does hardware back go to series page? To homepage? To browser history?

11. **Is there a "My Progress" or "My Journey" page?** Several docs reference `/daily-bread` as a dashboard, but it doesn't exist in the current route structure. Where does the user see their overall progress?

12. **What happens when a user shares a devotional link and the recipient doesn't have a session?** Do they see the content directly? Get redirected to Soul Audit? See a preview with a CTA to start their own journey?

### Content & Matching

13. **Are the `emotional_tones` and `life_circumstances` arrays actually populated in the series data?** The matching algorithm depends on them, but only `keywords` is confirmed in `series.ts`.

14. **How does the 2 prefab options selection work?** Who curates them? Are they static per audit, or do they rotate? Are they the same 2 for every user?

15. **What happens when Claude returns a match to a series that has incomplete content (< 5 days of devotional JSON)?** Does the system validate content availability before presenting the option?

16. **How are the 7 Wake-Up series and 19 Substack series weighted differently in matching?** Are Substack series treated as equal candidates, or are Wake-Up series preferred?

### Technical

17. **What is the exact session cookie name?** `euongelion_session` (per auth docs) or something else? Is it consistent across all API routes?

18. **Is Upstash Redis actually provisioned?** The rate limiting implementation references it, but `UPSTASH_REDIS_URL` is not listed in the Vercel env vars (MEMORY.md only lists Supabase and Anthropic keys).

19. **How does the system handle timezone edge cases?** DST transitions, users who travel, users who don't set timezone. What's the fallback timezone?

20. **Is the `soul_audit_questions` table in Supabase actually populated?** The schema exists but if the product uses a single open-ended question, this table may be empty/unused.

### UX & Design

21. **What does the "Mark as Complete" button look like on mobile?** Is it sticky at the bottom? Does it appear only after scrolling to a threshold?

22. **What feedback does the user get immediately after marking a day complete?** A toast? A modal? An animation? A redirect?

23. **What does the locked-day state look like on the series page?** Gray text? Lock icon? Disabled click? All three?

24. **Is there a loading/skeleton state for the Soul Audit results page?** The processing takes 2-4 seconds. What does the user see during that time?

25. **What is the Sabbath preference selection UX?** When is it asked? Is it part of the audit flow? Part of settings? Defaulted and skippable?

### Business & Legal

26. **Are audit responses stored permanently?** SOUL-AUDIT-DESIGN.md says "anonymized" but doesn't specify retention period. GDPR/CCPA may require a defined retention policy.

27. **Can a user request deletion of their audit responses?** No data deletion flow is documented.

28. **Is the crisis detection implementation tested against false positives?** A user writing about a fictional scenario, or using metaphorical language, could trigger crisis mode incorrectly.

29. **What happens if the Claude API key hits its spending limit?** Is there a fallback beyond keyword matching? Does the system degrade gracefully or error out?

30. **Who maintains the 2 curated prefab options?** Is this a manual editorial process? Is there a CMS? How often do they rotate?

---

_End of consolidated analysis. This document should be treated as a working reference — update it as decisions are made and gaps are closed._
