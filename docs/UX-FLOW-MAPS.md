# EUANGELION UX Flow Maps

**Version:** 1.0
**Last Updated:** January 17, 2026

---

## Document Purpose

This document maps every user journey in the EUANGELION platform. Each flow includes:

- Decision points and branches
- Emotional states at each step
- Visual design considerations (referencing our design system)
- Edge cases and error handling

**Design System Reference:**

- **Tehom Black** (#1A1612): Deep void, authority, ancient leather
- **Scroll White** (#F7F3ED): Rest, parchment, breathing room
- **God is Gold** (#C19A6B): Glory, divine emphasis, signature moments

---

## Table of Contents

1. [First-Time User Flow](#1-first-time-user-flow)
2. [Returning User Flow](#2-returning-user-flow)
3. [Day-Gating Flow](#3-day-gating-flow)
4. [Soul Audit Flow](#4-soul-audit-flow)
5. [Devotional Reading Flow](#5-devotional-reading-flow)
6. [Series Management Flow](#6-series-management-flow)
7. [Account & Settings Flow](#7-account--settings-flow)
8. [Share Flow](#8-share-flow)
9. [Edge Cases & Error States](#9-edge-cases--error-states)

---

## 1. First-Time User Flow

### Overview

The journey from stranger to engaged reader. Every step should feel like an invitation, not a demand.

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FIRST-TIME USER JOURNEY                           │
│                                                                             │
│  Emotional Arc: Curiosity → Vulnerability → Hope → Anticipation → Relief    │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │   LANDING PAGE   │
    │   wokegod.world  │
    │                  │
    │  [No Session]    │
    └────────┬─────────┘
             │
             │ User sees: Clean, stark design
             │ Emotional state: CURIOSITY
             │ "What is this?"
             │
             ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                        SOUL AUDIT                                 │
    │                                                                   │
    │  ┌────────────────────────────────────────────────────────────┐  │
    │  │                                                            │  │
    │  │   "What's weighing on your heart?"                         │  │
    │  │                                                            │  │
    │  │   Share honestly. This helps us find the right             │  │
    │  │   words for where you are right now.                       │  │
    │  │                                                            │  │
    │  │   ┌────────────────────────────────────────────────────┐   │  │
    │  │   │                                                    │   │  │
    │  │   │  (autofocus textarea)                              │   │  │
    │  │   │                                                    │   │  │
    │  │   │  Placeholder: "I've been feeling..."               │   │  │
    │  │   │                                                    │   │  │
    │  │   └────────────────────────────────────────────────────┘   │  │
    │  │                                                            │  │
    │  │   Take your time. There's no wrong answer.                 │  │
    │  │                                                            │  │
    │  │   [ Continue → ] (God is Gold, enabled when >10 chars)     │  │
    │  │                                                            │  │
    │  └────────────────────────────────────────────────────────────┘  │
    │                                                                   │
    │  Emotional state: VULNERABILITY                                   │
    │  "This feels different. They want to listen."                     │
    └────────────────────────────────┬──────────────────────────────────┘
                                     │
                                     │ Submit
                                     ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                      PROCESSING STATE                            │
    │                                                                   │
    │                         ○ ○ ○                                     │
    │                                                                   │
    │                     "Listening..."                                │
    │                                                                   │
    │  Duration: 2-4 seconds (genuine processing, not artificial)      │
    │  Animation: Subtle pulse in God is Gold                          │
    │  Emotional state: ANTICIPATION + slight nervousness              │
    │  "What will they say about what I shared?"                       │
    └────────────────────────────────┬──────────────────────────────────┘
                                     │
                                     │ Claude API returns match
                                     ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                      MATCH PRESENTATION                          │
    │                                                                   │
    │  ┌────────────────────────────────────────────────────────────┐  │
    │  │                                                            │  │
    │  │   Based on what you shared...                              │  │
    │  │                                                            │  │
    │  │   ┌────────────────────────────────────────────────────┐   │  │
    │  │   │                                                    │   │  │
    │  │   │   TOO BUSY FOR GOD                                 │   │  │
    │  │   │   When Your Schedule Becomes Your Savior           │   │  │
    │  │   │                                                    │   │  │
    │  │   │   5 days · Sleep Pathway                           │   │  │
    │  │   │                                                    │   │  │
    │  │   └────────────────────────────────────────────────────┘   │  │
    │  │                                                            │  │
    │  │   "You mentioned feeling overwhelmed and having no         │  │
    │  │   time. This series explores how busyness can become       │  │
    │  │   a form of idolatry—and how to find sacred rest."         │  │
    │  │                                                            │  │
    │  │   [ Begin This Journey ]  (Primary, God is Gold)           │  │
    │  │                                                            │  │
    │  │   Or see other options →  (Text link)                      │  │
    │  │                                                            │  │
    │  └────────────────────────────────────────────────────────────┘  │
    │                                                                   │
    │  Emotional state: HOPE + recognition                              │
    │  "They understand. This might actually help."                     │
    └────────────────────────────────┬──────────────────────────────────┘
                                     │
                         ┌───────────┴───────────┐
                         │                       │
                    [Begin]               [See Others]
                         │                       │
                         │                       ▼
                         │         ┌─────────────────────────┐
                         │         │   ALTERNATIVE SERIES    │
                         │         │                         │
                         │         │  Your match: Too Busy   │
                         │         │                         │
                         │         │  Also consider:         │
                         │         │  • Wrestling with Doubt │
                         │         │  • Finding Purpose      │
                         │         │  • Learning to Rest     │
                         │         │                         │
                         │         │  [ Browse All Series ]  │
                         │         └─────────────────────────┘
                         │                       │
                         │         (User can select alternative
                         │          or return to matched series)
                         │                       │
                         └───────────┬───────────┘
                                     │
                                     │ Series selected
                                     ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                    ACCOUNT CREATION GATE                         │
    │                                                                   │
    │  ┌────────────────────────────────────────────────────────────┐  │
    │  │                                                            │  │
    │  │   One more thing...                                        │  │
    │  │                                                            │  │
    │  │   Enter your email to save your progress.                  │  │
    │  │   We'll send you a link to continue.                       │  │
    │  │                                                            │  │
    │  │   ┌────────────────────────────────────────────────────┐   │  │
    │  │   │  your@email.com                                    │   │  │
    │  │   └────────────────────────────────────────────────────┘   │  │
    │  │                                                            │  │
    │  │   [ Send Magic Link ]                                      │  │
    │  │                                                            │  │
    │  │   No passwords. No spam. Just your journey.                │  │
    │  │                                                            │  │
    │  └────────────────────────────────────────────────────────────┘  │
    │                                                                   │
    │  Emotional state: Slight friction, but understandable             │
    │  "Fair enough. I want to keep this."                              │
    └────────────────────────────────┬──────────────────────────────────┘
                                     │
                                     │ Submit email
                                     ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                    MAGIC LINK SENT                               │
    │                                                                   │
    │  ┌────────────────────────────────────────────────────────────┐  │
    │  │                                                            │  │
    │  │                        ✓                                   │  │
    │  │                                                            │  │
    │  │   Check your email                                         │  │
    │  │                                                            │  │
    │  │   We sent a link to john@example.com                       │  │
    │  │   Click it to continue your journey.                       │  │
    │  │                                                            │  │
    │  │   Didn't get it? [ Resend ] (available after 60s)          │  │
    │  │                                                            │  │
    │  └────────────────────────────────────────────────────────────┘  │
    │                                                                   │
    │  Emotional state: Anticipation                                    │
    │  "Almost there..."                                                │
    └────────────────────────────────┬──────────────────────────────────┘
                                     │
                                     │ User clicks magic link
                                     ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                   SABBATH PREFERENCE                             │
    │                                                                   │
    │  ┌────────────────────────────────────────────────────────────┐  │
    │  │                                                            │  │
    │  │   One quick thing...                                       │  │
    │  │                                                            │  │
    │  │   Which day is your Sabbath?                               │  │
    │  │                                                            │  │
    │  │   ┌─────────────┐    ┌─────────────┐                       │  │
    │  │   │  Saturday   │    │   Sunday    │                       │  │
    │  │   │             │    │      ●      │                       │  │
    │  │   └─────────────┘    └─────────────┘                       │  │
    │  │                                                            │  │
    │  │   We'll give you rest that day.                            │  │
    │  │   (No new content—just breathing room.)                    │  │
    │  │                                                            │  │
    │  │   [ Let's Begin ]                                          │  │
    │  │                                                            │  │
    │  └────────────────────────────────────────────────────────────┘  │
    │                                                                   │
    │  Emotional state: Appreciation                                    │
    │  "They care about rest. This is already different."               │
    └────────────────────────────────┬──────────────────────────────────┘
                                     │
                                     │ Preference saved
                                     ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                  SESSION CREATION (Backend)                      │
    │                                                                   │
    │  • Create user session in Supabase                               │
    │  • Link to authenticated user (auth.users)                       │
    │  • Set active_series_id                                          │
    │  • Set start_date to today                                       │
    │  • Set current_day to 1                                          │
    │  • Record Soul Audit response (count: 1)                         │
    │  • Record Sabbath preference                                     │
    │  • Set httpOnly session cookie                                   │
    │                                                                   │
    └────────────────────────────────┬──────────────────────────────────┘
                                     │
                                     │ Redirect
                                     ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                    FIRST DEVOTIONAL                              │
    │                    /daily-bread                                  │
    │                                                                   │
    │  ┌────────────────────────────────────────────────────────────┐  │
    │  │                                                            │  │
    │  │   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━              │  │
    │  │   TOO BUSY FOR GOD                                         │  │
    │  │   Day 1 of 5                                               │  │
    │  │   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━              │  │
    │  │                                                            │  │
    │  │   "Meaningless! Meaningless!"                              │  │
    │  │   says the Teacher.                                        │  │
    │  │   "Utterly meaningless!                                    │  │
    │  │   Everything is meaningless."                              │  │
    │  │                                                            │  │
    │  │   — Ecclesiastes 1:2 (NIV)                                 │  │
    │  │                                                            │  │
    │  │              ↓ scroll to continue                          │  │
    │  │                                                            │  │
    │  └────────────────────────────────────────────────────────────┘  │
    │                                                                   │
    │  Emotional state: RELIEF + engagement                             │
    │  "I'm here. Let's begin."                                         │
    └──────────────────────────────────────────────────────────────────┘
```

### Decision Points

| Point              | Options            | Outcome                              |
| ------------------ | ------------------ | ------------------------------------ |
| Soul Audit empty   | Continue disabled  | Cannot proceed until content entered |
| Match presentation | Begin / See others | Primary path or browse alternatives  |
| Email submission   | Valid / Invalid    | Proceed or show validation error     |
| Magic link         | Clicked / Expired  | Login success or request new link    |
| Sabbath choice     | Saturday / Sunday  | Stored, affects day-gating schedule  |

### Emotional Journey Summary

```
CURIOSITY          VULNERABILITY       HOPE              ANTICIPATION      RELIEF
    |                   |                |                    |              |
 Landing           Soul Audit       Match Shown         Email/Auth     First Day
    |                   |                |                    |              |
"What is this?"   "This is personal"  "They get me"    "Almost there"  "I'm home"
```

---

## 2. Returning User Flow

### Overview

The daily experience for users who have already begun a series. Should feel effortless.

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RETURNING USER JOURNEY                             │
│                                                                             │
│  Emotional Arc: Anticipation → Engagement → Satisfaction → Commitment       │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌───────────────────┐
                    │    USER RETURNS   │
                    │  (any entry point)│
                    └─────────┬─────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │     SESSION VALIDATION        │
              │                               │
              │  Check: Session cookie?       │
              │     │                         │
              │     ├─── No ──────────────────┼───► Soul Audit
              │     │                         │
              │     └─── Yes                  │
              │           │                   │
              │     Validate with Supabase    │
              │           │                   │
              │     ┌─────┴─────┐             │
              │     │           │             │
              │  Invalid     Valid            │
              │     │           │             │
              │     ▼           │             │
              │  Clear cookie   │             │
              │  → Soul Audit   │             │
              └─────────────────┼─────────────┘
                                │
                                ▼
              ┌─────────────────────────────────────────────────────┐
              │                    DASHBOARD                        │
              │                   /daily-bread                      │
              │                                                     │
              │  ┌───────────────────────────────────────────────┐  │
              │  │                                               │  │
              │  │  Welcome back, John                           │  │
              │  │                                               │  │
              │  │  ═══════════════════════════════════════════  │  │
              │  │                                               │  │
              │  │  TOO BUSY FOR GOD                             │  │
              │  │  Day 3 of 5                                   │  │
              │  │                                               │  │
              │  │  ┌─────┬─────┬─────┬─────┬─────┐              │  │
              │  │  │  1  │  2  │ ▶3  │  4  │  5  │              │  │
              │  │  │  ✓  │  ✓  │     │  🔒 │  🔒 │              │  │
              │  │  └─────┴─────┴─────┴─────┴─────┘              │  │
              │  │                                               │  │
              │  │  [ Continue Reading ]  (God is Gold)          │  │
              │  │                                               │  │
              │  │  You left off at: "Sacred Rest"               │  │
              │  │                                               │  │
              │  └───────────────────────────────────────────────┘  │
              │                                                     │
              │  Emotional state: RECOGNITION + anticipation        │
              │  "Right where I left off. Easy."                    │
              └───────────────────────┬─────────────────────────────┘
                                      │
                                      │ Click "Continue Reading"
                                      ▼
              ┌─────────────────────────────────────────────────────┐
              │              DAILY BREAD CONTENT                    │
              │              /daily-bread/day-3                     │
              │                                                     │
              │  (Full cinematic scroll experience)                 │
              │                                                     │
              │  • Series header with progress                      │
              │  • Module sections (100vh each)                     │
              │  • Scripture → Teaching → Vocab → etc.              │
              │  • Reflection questions (with save)                 │
              │  • Closing prayer                                   │
              │                                                     │
              │  Emotional state: ENGAGEMENT + discovery            │
              │  "This is exactly what I needed today."             │
              └───────────────────────┬─────────────────────────────┘
                                      │
                                      │ Scroll to end
                                      ▼
              ┌─────────────────────────────────────────────────────┐
              │              COMPLETION STATE                       │
              │                                                     │
              │  ┌───────────────────────────────────────────────┐  │
              │  │                                               │  │
              │  │                    ✓                          │  │
              │  │                                               │  │
              │  │            Day 3 Complete                     │  │
              │  │                                               │  │
              │  │   "Sabbath isn't about what you stop doing—   │  │
              │  │    it's about Who you start trusting."        │  │
              │  │                                               │  │
              │  │   ┌─────┬─────┬─────┬─────┬─────┐             │  │
              │  │   │  1  │  2  │  3  │  4  │  5  │             │  │
              │  │   │  ✓  │  ✓  │  ✓  │  🔒 │  🔒 │             │  │
              │  │   └─────┴─────┴─────┴─────┴─────┘             │  │
              │  │                                               │  │
              │  │   Day 4 unlocks tomorrow at 7:00 AM           │  │
              │  │                                               │  │
              │  │   [ Share This Day ]    [ View Past Days ]    │  │
              │  │                                               │  │
              │  └───────────────────────────────────────────────┘  │
              │                                                     │
              │  Emotional state: SATISFACTION + anticipation       │
              │  "That was worth my time. Can't wait for tomorrow." │
              └───────────────────────┬─────────────────────────────┘
                                      │
                                      │ Close browser / Exit
                                      ▼
              ┌─────────────────────────────────────────────────────┐
              │                NEXT DAY (7 AM)                      │
              │                                                     │
              │  • Day 4 content unlocks                            │
              │  • (If notifications enabled: optional reminder)    │
              │  • Progress bar updates                             │
              │                                                     │
              │  User returns whenever ready                        │
              │  No pressure, no guilt                              │
              └─────────────────────────────────────────────────────┘
```

### Day Selector States

```
┌─────────────────────────────────────────────────────────────────┐
│                     DAY SELECTOR STATES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  COMPLETED DAY           CURRENT DAY          LOCKED DAY        │
│                                                                 │
│  ┌─────────────┐        ┌─────────────┐      ┌─────────────┐   │
│  │             │        │             │      │             │   │
│  │      1      │        │      3      │      │      4      │   │
│  │      ✓      │        │     ▶       │      │      🔒     │   │
│  │             │        │             │      │             │   │
│  └─────────────┘        └─────────────┘      └─────────────┘   │
│                                                                 │
│  - Clickable            - Highlighted        - Not clickable   │
│  - Scroll White text    - God is Gold ring   - 50% opacity     │
│  - Can revisit          - Current position   - Shows lock icon │
│                                                                 │
│  Hover state:           Active state:        Hover state:      │
│  Underline appears      Filled background    Tooltip shows     │
│                                              unlock time       │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Progress Tracking

```
Each scroll-through records:
┌────────────────────────────────────────────────┐
│  • user_id                                     │
│  • series_id                                   │
│  • day_number                                  │
│  • started_at (timestamp)                      │
│  • completed_at (timestamp, set when scroll    │
│    reaches completion threshold ~90%)          │
│  • time_spent (seconds)                        │
│  • reflection_responses (if saved)             │
└────────────────────────────────────────────────┘
```

---

## 3. Day-Gating Flow

### Overview

Content unlocks progressively to encourage daily engagement without overwhelming. Sabbath respects the user's chosen rest day.

### Unlock Schedule Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DAY-GATING SCHEDULE                                │
│                                                                             │
│  User starts: Monday 7:00 AM (user's timezone)                              │
│  Sabbath preference: Sunday                                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────────────────────────────┐
    │ MONDAY      TUESDAY     WEDNESDAY   THURSDAY    FRIDAY      SATURDAY  │
    │ Day 1       Day 2       Day 3       Day 4       Day 5       Recap     │
    │ Unlocked    7:00 AM     7:00 AM     7:00 AM     7:00 AM     7:00 AM   │
    │ ═══════     ═══════     ═══════     ═══════     ═══════     ═══════   │
    │             │           │           │           │           │         │
    │             │           │           │           │           └──► Sabbath │
    │             │           │           │           │               (Sunday) │
    │             │           │           │           │               No content│
    └─────────────┴───────────┴───────────┴───────────┴───────────┴───────────┘

    TIME-BASED UNLOCK LOGIC:

    ┌────────────────────────────────────────────────────────────────────────┐
    │                                                                        │
    │  available_day = floor((now - start_date) / 24 hours) + 1              │
    │                                                                        │
    │  IF current_time >= 7:00 AM (user timezone)                            │
    │     AND day_number <= available_day                                    │
    │     AND day_number <= total_days                                       │
    │     AND NOT sabbath_day:                                               │
    │         → UNLOCKED                                                     │
    │  ELSE:                                                                 │
    │         → LOCKED                                                       │
    │                                                                        │
    └────────────────────────────────────────────────────────────────────────┘
```

### Locked Content Interaction

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LOCKED DAY EXPERIENCE                                │
└─────────────────────────────────────────────────────────────────────────────┘

    User clicks locked day (Day 4):

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │                                                                  │
    │                           🔒                                     │
    │                                                                  │
    │                   Day 4: Living Out the Rest                     │
    │                                                                  │
    │              Unlocks tomorrow at 7:00 AM                         │
    │                                                                  │
    │           ─────────────────────────────────────                  │
    │                                                                  │
    │           "Good things are worth waiting for."                   │
    │                                                                  │
    │           ─────────────────────────────────────                  │
    │                                                                  │
    │              [ Review Previous Days ]                            │
    │                                                                  │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    Visual treatment:
    - Background: Tehom Black (dark mode feel even in light mode)
    - Lock icon: Scroll White, 80px
    - Title: God is Gold (teaser)
    - Message: Scroll White, 60% opacity
    - Quote: Italicized, Scroll White

    Emotional state: Anticipation, not frustration
    "I want to read this tomorrow."
```

### 7 AM Unlock Experience

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         7 AM UNLOCK MOMENT                                  │
└─────────────────────────────────────────────────────────────────────────────┘

    IF user is on /daily-bread at 7:00 AM:

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │  ┌────────────────────────────────────────────────────────────┐  │
    │  │                                                            │  │
    │  │     ✦ New content available ✦                              │  │
    │  │                                                            │  │
    │  │     Day 4: Living Out the Rest                             │  │
    │  │                                                            │  │
    │  │     [ Begin Day 4 ]                                        │  │
    │  │                                                            │  │
    │  └────────────────────────────────────────────────────────────┘  │
    │                                                                  │
    │  Animation: Toast slides in from bottom                          │
    │  Duration: Stays until dismissed or clicked                      │
    │  Sound: None (respect user's environment)                        │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    IF user visits after 7 AM with new content:

    Dashboard shows updated state automatically:

    ┌────────────────────────────────────────────────────────────────┐
    │                                                                │
    │   Day 4 is ready                                               │
    │                                                                │
    │   ┌─────┬─────┬─────┬─────┬─────┐                              │
    │   │  1  │  2  │  3  │ ▶4  │  5  │                              │
    │   │  ✓  │  ✓  │  ✓  │ NEW │  🔒 │                              │
    │   └─────┴─────┴─────┴─────┴─────┘                              │
    │                                                                │
    │   [ Continue to Day 4 ]                                        │
    │                                                                │
    └────────────────────────────────────────────────────────────────┘

    "NEW" badge: God is Gold background, Tehom Black text, subtle pulse
```

### Sabbath Day Experience

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SABBATH DAY SCREEN                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │                                                                  │
    │                                                                  │
    │                                                                  │
    │                           ✦                                      │
    │                                                                  │
    │                     Today is Sabbath                             │
    │                                                                  │
    │             "Be still, and know that I am God."                  │
    │                       — Psalm 46:10                              │
    │                                                                  │
    │                                                                  │
    │          No new content today. Just rest.                        │
    │                                                                  │
    │          Tomorrow, your journey continues.                       │
    │                                                                  │
    │                                                                  │
    │              [ Review This Week ] (optional)                     │
    │                                                                  │
    │                                                                  │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    Visual treatment:
    - Full-screen, minimal
    - Star/asterisk: God is Gold
    - Text: Centered, generous whitespace
    - Background: Scroll White (light mode) or Tehom Black (dark mode)

    Emotional state: Permission to rest
    "I don't have to perform. I can just be."
```

### Recap Day Experience

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RECAP DAY CONTENT                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    Recap Day (Day 6 or 7, depending on Sabbath):

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   ═══════════════════════════════════════════════════════════    │
    │                                                                  │
    │   TOO BUSY FOR GOD                                               │
    │   Week in Review                                                 │
    │                                                                  │
    │   ═══════════════════════════════════════════════════════════    │
    │                                                                  │
    │   THIS WEEK'S JOURNEY                                            │
    │                                                                  │
    │   Day 1: The Vanity of Busyness                                  │
    │          Key insight: Busyness is modern idolatry                │
    │                                                                  │
    │   Day 2: The Tyranny of the Urgent                               │
    │          Key insight: Urgent ≠ Important                         │
    │                                                                  │
    │   Day 3: Sacred Rest                                             │
    │          Key insight: Sabbath is trust, not laziness             │
    │                                                                  │
    │   Day 4: Living Out the Rest                                     │
    │          Key insight: Rest is a practice, not a state            │
    │                                                                  │
    │   Day 5: Entering the Rest                                       │
    │          Key insight: God's rest is always available             │
    │                                                                  │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   YOUR REFLECTIONS                                               │
    │                                                                  │
    │   (Displays any saved reflection responses from the week)        │
    │                                                                  │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   CARRY THIS FORWARD                                             │
    │                                                                  │
    │   "This week, I will create margin by..."                        │
    │   ┌────────────────────────────────────────────────────────────┐ │
    │   │                                                            │ │
    │   │  (journaling textarea)                                     │ │
    │   │                                                            │ │
    │   └────────────────────────────────────────────────────────────┘ │
    │                                                                  │
    │   [ Save & Complete Series ]                                     │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘
```

---

## 4. Soul Audit Flow

### Overview

The Soul Audit is EUANGELION's signature intake experience. It matches users to the right series based on their current spiritual state.

### Entry Points

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SOUL AUDIT ENTRY POINTS                              │
└─────────────────────────────────────────────────────────────────────────────┘

    1. FIRST VISIT (No Session)
       ┌──────────────────┐
       │  wokegod.world   │──────► Soul Audit (automatic)
       └──────────────────┘

    2. SERIES COMPLETION
       ┌──────────────────┐
       │  Series Done     │──────► "Take Another Soul Audit"
       │  (count < 3)     │        (if audits remaining)
       └──────────────────┘

    3. MANUAL RESTART
       ┌──────────────────┐
       │  Menu > Settings │──────► "New Journey (Soul Audit)"
       │                  │        (clears current series)
       └──────────────────┘

    4. EXPIRED/CLEARED SESSION
       ┌──────────────────┐
       │  Session Invalid │──────► Soul Audit (automatic)
       └──────────────────┘
```

### Question Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SOUL AUDIT QUESTION DESIGN                            │
└─────────────────────────────────────────────────────────────────────────────┘

    The Soul Audit uses ONE open-ended question:

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │                                                                  │
    │         "What's weighing on your heart?"                         │
    │                                                                  │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    WHY ONE QUESTION:

    • Reduces friction (no multi-step quiz)
    • Allows authentic expression (not multiple choice)
    • Better data for Claude matching
    • Respects user's time
    • Creates memorable moment


    SUPPORTING MICROCOPY:

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │  Before textarea:                                                │
    │  "Share honestly. This helps us find the right words            │
    │   for where you are right now."                                  │
    │                                                                  │
    │  Below textarea:                                                 │
    │  "Take your time. There's no wrong answer."                      │
    │                                                                  │
    │  Placeholder text:                                               │
    │  "I've been feeling..."                                          │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘
```

### Matching Logic (Conceptual)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MATCHING ALGORITHM                                  │
└─────────────────────────────────────────────────────────────────────────────┘

    USER INPUT                    CLAUDE PROCESSING                   OUTPUT
        │                               │                                │
        ▼                               ▼                                ▼

    "I've been so busy         1. Parse emotional state        MATCHED SERIES:
     lately that I don't          - overwhelmed                "Too Busy for God"
     even have time to            - guilt
     pray anymore. I feel         - disconnection              REASONING:
     like God is distant..."                                   "You mentioned feeling
                               2. Identify key themes          overwhelmed and having
                                  - busyness                   no time. This series
                                  - prayer absence             explores how busyness
                                  - divine distance            can become idolatry—
                                                               and how to find sacred
                               3. Match to series keywords     rest."
                                  - "too busy"
                                  - "no time"                  ALTERNATIVES:
                                  - "exhausted"                - Wrestling with Doubt
                                  - "distant"                  - Finding Purpose
                                                               - When God Feels Far
                               4. Score and rank matches
                                  Primary: 0.89
                                  Alt 1: 0.67
                                  Alt 2: 0.54

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │  SERIES MATCHING CRITERIA (from content JSON):                   │
    │                                                                  │
    │  "soul_audit_keywords": [                                        │
    │    "too busy", "no time", "exhausted", "overwhelmed",            │
    │    "hustle", "schedule", "stressed", "burned out"                │
    │  ],                                                              │
    │  "emotional_tones": [                                            │
    │    "overwhelmed", "anxious", "restless", "empty"                 │
    │  ],                                                              │
    │  "life_circumstances": [                                         │
    │    "career stress", "overcommitment", "burnout"                  │
    │  ]                                                               │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘
```

### Results Presentation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MATCH RESULTS SCREEN                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   Based on what you shared...                                    │
    │                                                                  │
    │   ┌────────────────────────────────────────────────────────────┐ │
    │   │                                                            │ │
    │   │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │ │
    │   │   ▓                                                     ▓  │ │
    │   │   ▓   TOO BUSY FOR GOD                                  ▓  │ │
    │   │   ▓   When Your Schedule Becomes Your Savior            ▓  │ │
    │   │   ▓                                                     ▓  │ │
    │   │   ▓   ─────────────────────────────────────────────     ▓  │ │
    │   │   ▓                                                     ▓  │ │
    │   │   ▓   5 days  ·  Sleep Pathway                          ▓  │ │
    │   │   ▓                                                     ▓  │ │
    │   │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │ │
    │   │                                                            │ │
    │   │   (Card has subtle gold border, lifts on hover)            │ │
    │   │                                                            │ │
    │   └────────────────────────────────────────────────────────────┘ │
    │                                                                  │
    │   "You mentioned feeling overwhelmed and having no time.         │
    │    This series explores how busyness can become a form of        │
    │    idolatry—and how to find sacred rest."                        │
    │                                                                  │
    │                                                                  │
    │   [ Begin This Journey ]                                         │
    │                                                                  │
    │   ─────────────────────────── or ────────────────────────────    │
    │                                                                  │
    │   See other options →                                            │
    │                                                                  │
    │   • Wrestling with Doubt                                         │
    │   • Finding Purpose                                              │
    │   • When God Feels Far                                           │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    PATHWAY BADGES:

    ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
    │  💤 Sleep         │  │  ☀️ Awake         │  │  🐑 Shepherd      │
    │                   │  │                   │  │                   │
    │  For the drifted, │  │  For the seeking, │  │  For those who    │
    │  burned out,      │  │  questioning,     │  │  guide others     │
    │  spiritually      │  │  wanting to grow  │  │  (Phase 2)        │
    │  exhausted        │  │                   │  │                   │
    └───────────────────┘  └───────────────────┘  └───────────────────┘
```

### Soul Audit Limit Handling

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SOUL AUDIT LIMIT (Max 3)                             │
└─────────────────────────────────────────────────────────────────────────────┘

    WHEN USER HAS USED 3 SOUL AUDITS:

    After series completion screen:

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   What's Next?                                                   │
    │                                                                  │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   You've explored deeply through the Soul Audit.                 │
    │   Now browse our full library to find your next journey.         │
    │                                                                  │
    │   [ Browse All Series ]                                          │
    │                                                                  │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   Series you've completed:                                       │
    │   ✓ Too Busy for God                                             │
    │   ✓ Wrestling with Doubt                                         │
    │   ✓ Finding Purpose                                              │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    Note: "Take Another Soul Audit" button is HIDDEN when count >= 3

    WHY THE LIMIT:
    • Encourages self-direction
    • Prevents dependency on AI matching
    • Allows exploration of series they might not have matched to
    • Reduces API costs
```

---

## 5. Devotional Reading Flow

### Overview

The heart of EUANGELION. A cinematic, scroll-based experience that reveals content progressively.

### Entry to Devotional

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENTERING A DEVOTIONAL                                │
└─────────────────────────────────────────────────────────────────────────────┘

    FROM DASHBOARD:                    FROM DAY SELECTOR:

    ┌────────────────────┐             ┌────────────────────┐
    │ [ Continue Day 3 ] │             │  1  2  [3]  4  5   │
    │                    │             │         ↑          │
    └─────────┬──────────┘             └─────────┬──────────┘
              │                                   │
              └───────────────┬───────────────────┘
                              │
                              ▼
              ┌───────────────────────────────────────────────────────┐
              │                                                       │
              │   Transition: 400ms fade to black, then fade in       │
              │                                                       │
              └───────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────────────────────────────┐
              │                                                       │
              │                        03                             │
              │                                                       │
              │                  SACRED REST                          │
              │                                                       │
              │           (Full screen, centered)                     │
              │           (Scroll indicator at bottom)                │
              │                                                       │
              └───────────────────────────────────────────────────────┘
```

### Scroll Navigation Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DEVOTIONAL SECTION STRUCTURE                           │
│                                                                             │
│  Each day = 6-10 full-viewport sections (100vh)                             │
│  User scrolls vertically through the "manuscript"                           │
└─────────────────────────────────────────────────────────────────────────────┘

    SECTION 1: Day Number + Title Screen
    ═══════════════════════════════════════════════════════════════════════
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │                                                                     │
    │                               03                                    │
    │                         (120px, thin)                               │
    │                                                                     │
    │                        SACRED REST                                  │
    │                    (48px, all caps)                                 │
    │                                                                     │
    │                  Too Busy for God · Day 3                           │
    │                       (16px, muted)                                 │
    │                                                                     │
    │                              ↓                                      │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘

    SECTION 2: Primary Scripture
    ═══════════════════════════════════════════════════════════════════════
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │                                                                     │
    │              "Come to me, all you who are weary                     │
    │               and burdened, and I will give you rest."              │
    │                                                                     │
    │                        — Matthew 11:28 (NIV)                        │
    │                                                                     │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘

    Scripture treatment:
    - Large serif font (32-40px)
    - Generous line height (1.6)
    - Gold emphasis on key words (if specified)
    - Reference in muted tone below

    SECTION 3: Hero Image (optional)
    ═══════════════════════════════════════════════════════════════════════
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
    │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
    │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
    │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  (full-bleed photography)  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
    │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
    │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
    │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘

    - Parallax: 0.7x scroll speed (subtle)
    - Lazy loaded
    - Caption appears on scroll (fade in)

    SECTION 4-6: Teaching Content
    ═══════════════════════════════════════════════════════════════════════
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   ┌─────────────────────────────────────────────────────────────┐   │
    │   │                                                             │   │
    │   │  Sabbath has become a foreign concept in our always-on      │   │
    │   │  culture. We wear busyness like a badge of honor,           │   │
    │   │  confusing exhaustion with importance.                      │   │
    │   │                                                             │   │
    │   │  But the Hebrew word for Sabbath—shabbat (שַׁבָּת)—doesn't   │   │
    │   │  mean "stop working." It means "to cease, to desist,        │   │
    │   │  to rest."                                                  │   │
    │   │                                                             │   │
    │   │  ┌─────────────────────────────────────────────────────┐    │   │
    │   │  │                                                     │    │   │
    │   │  │  שַׁבָּת                                             │    │   │
    │   │  │  SHABBAT                                            │    │   │
    │   │  │  "to cease, to desist, to rest"                     │    │   │
    │   │  │                                                     │    │   │
    │   │  │  [ Tap to expand ]                                  │    │   │
    │   │  │                                                     │    │   │
    │   │  └─────────────────────────────────────────────────────┘    │   │
    │   │                                                             │   │
    │   └─────────────────────────────────────────────────────────────┘   │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘

    - Content width: max 680px, centered
    - Font size: 18-20px
    - Line height: 1.8
    - Hebrew vocab card: interactive, expands on click

    SECTION 7: Pull Quote / Insight
    ═══════════════════════════════════════════════════════════════════════
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │                                                                     │
    │                                                                     │
    │         "Sabbath isn't about what you stop doing—                   │
    │          it's about Who you start trusting."                        │
    │                                                                     │
    │                                                                     │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘

    - Full screen, centered
    - Large text (40-56px)
    - May have background image with text overlay
    - Key moment of the day

    SECTION 8: Reflection Questions
    ═══════════════════════════════════════════════════════════════════════
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   REFLECT                                                           │
    │                                                                     │
    │   ┌─────────────────────────────────────────────────────────────┐   │
    │   │  01                                                         │   │
    │   │  What does "rest" mean to you? Is it passive or active?     │   │
    │   │                                                             │   │
    │   │  ┌─────────────────────────────────────────────────────┐    │   │
    │   │  │ (optional journal input)                            │    │   │
    │   │  └─────────────────────────────────────────────────────┘    │   │
    │   │  [ Save Response ]                                          │   │
    │   └─────────────────────────────────────────────────────────────┘   │
    │                                                                     │
    │   ┌─────────────────────────────────────────────────────────────┐   │
    │   │  02                                                         │   │
    │   │  When did you last feel truly at rest—not just idle?        │   │
    │   └─────────────────────────────────────────────────────────────┘   │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘

    - Questions appear with stagger animation (100ms delay)
    - Journal input is optional but encouraged
    - Saved responses appear in Recap Day

    SECTION 9: Closing Prayer
    ═══════════════════════════════════════════════════════════════════════
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   A PRAYER                                                          │
    │                                                                     │
    │   ─────────────────────────────────────────────────────────────     │
    │                                                                     │
    │   Father,                                                           │
    │                                                                     │
    │   I confess that I have made busyness my idol.                      │
    │   I have trusted my productivity more than your provision.          │
    │   I have worn exhaustion as a badge instead of resting              │
    │   in your sufficiency.                                              │
    │                                                                     │
    │   Teach me to cease. Teach me to rest.                              │
    │   Not because I've earned it, but because you command it.           │
    │                                                                     │
    │   In Jesus' name, Amen.                                             │
    │                                                                     │
    │   ─────────────────────────────────────────────────────────────     │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘

    SECTION 10: Completion + Next
    ═══════════════════════════════════════════════════════════════════════
    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │                              ✓                                      │
    │                                                                     │
    │                       Day 3 Complete                                │
    │                                                                     │
    │   ─────────────────────────────────────────────────────────────     │
    │                                                                     │
    │   TODAY'S TAKEAWAY                                                  │
    │                                                                     │
    │   Rest is not a reward for work well done.                          │
    │   It's an act of trust in a God who never stops working.            │
    │                                                                     │
    │   ─────────────────────────────────────────────────────────────     │
    │                                                                     │
    │   ┌─────┬─────┬─────┬─────┬─────┐                                   │
    │   │  1  │  2  │  3  │  4  │  5  │                                   │
    │   │  ✓  │  ✓  │  ✓  │  🔒 │  🔒 │                                   │
    │   └─────┴─────┴─────┴─────┴─────┘                                   │
    │                                                                     │
    │   Day 4 unlocks tomorrow at 7:00 AM                                 │
    │                                                                     │
    │   [ Share This Day ]    [ Review Past Days ]                        │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
```

### Interactive Elements Within Devotional

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INTERACTIVE ELEMENTS                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    1. HEBREW/GREEK VOCAB CARD
    ─────────────────────────────────────────────────────────────────────────

    COLLAPSED STATE:
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │   שַׁבָּת                                                │
    │   SHABBAT                                               │
    │   "to cease, rest"        [ + Expand ]                  │
    │                                                         │
    └─────────────────────────────────────────────────────────┘

    EXPANDED STATE (click/tap):
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │   שַׁבָּת                                                │
    │   SHABBAT (shah-BAHT)                                   │
    │                                                         │
    │   Strong's: H7676                                       │
    │                                                         │
    │   Definition: To cease, to desist, to rest              │
    │                                                         │
    │   Root meaning: The root שָׁבַת means to stop or cease  │
    │   from labor. It's not passive—it's an active choice    │
    │   to trust God's provision.                             │
    │                                                         │
    │   See also: Genesis 2:2-3, Exodus 20:8-11               │
    │                                                         │
    │                                   [ − Collapse ]        │
    └─────────────────────────────────────────────────────────┘

    2. BREATH PRAYER (Interactive)
    ─────────────────────────────────────────────────────────────────────────

    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │   BREATH PRAYER                                         │
    │                                                         │
    │   Inhale slowly:                                        │
    │                                                         │
    │            "Lord, I am tired"                           │
    │                                                         │
    │   ○ ○ ○ ○ ○ ○ ○ ○  (4 second timer, dots fill)          │
    │                                                         │
    │   Exhale slowly:                                        │
    │                                                         │
    │            "Give me rest"                               │
    │                                                         │
    │   ● ● ● ● ● ● ● ●  (4 second timer, dots empty)         │
    │                                                         │
    │   Repeat 3 times                                        │
    │                                                         │
    │   [ Begin Prayer ]                                      │
    │                                                         │
    └─────────────────────────────────────────────────────────┘

    - Optional engagement
    - Timed animation guides breathing
    - Respects reduced-motion preference

    3. REFLECTION QUESTION WITH JOURNALING
    ─────────────────────────────────────────────────────────────────────────

    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │   01                                                    │
    │                                                         │
    │   What activity fills your schedule but leaves          │
    │   you empty?                                            │
    │                                                         │
    │   ┌─────────────────────────────────────────────────┐   │
    │   │                                                 │   │
    │   │  (Auto-expanding textarea)                      │   │
    │   │                                                 │   │
    │   │  Your response is saved locally and appears     │   │
    │   │  in your weekly recap.                          │   │
    │   │                                                 │   │
    │   └─────────────────────────────────────────────────┘   │
    │                                                         │
    │   [ Save Response ]  (shows "Saved ✓" after save)       │
    │                                                         │
    └─────────────────────────────────────────────────────────┘

    - Response saved to localStorage immediately (debounced)
    - Also saved to database if user is authenticated
    - Appears in Recap Day summary

    4. COMPREHENSION CHECK
    ─────────────────────────────────────────────────────────────────────────

    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │   CHECK YOUR UNDERSTANDING                              │
    │                                                         │
    │   What does "shabbat" literally mean?                   │
    │                                                         │
    │   ○ To work harder                                      │
    │   ○ To cease, to rest                                   │
    │   ○ To pray more                                        │
    │                                                         │
    └─────────────────────────────────────────────────────────┘

    AFTER CORRECT ANSWER:
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │   ✓ Correct                                             │
    │                                                         │
    │   Shabbat means "to cease, to rest." It's an active     │
    │   choice to stop working and trust God's provision.     │
    │                                                         │
    └─────────────────────────────────────────────────────────┘

    - No penalty for wrong answers
    - Educational, not punitive
    - Explanation always shown after answer
```

### Completion State Details

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       COMPLETION TRIGGER LOGIC                              │
└─────────────────────────────────────────────────────────────────────────────┘

    Completion is tracked when:

    1. User scrolls to final section (90% threshold)
    2. OR user clicks "Mark Complete" (explicit action)
    3. AND all required interactions completed (if any)

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │  const isComplete =                                              │
    │    scrollPosition >= (totalHeight * 0.9) &&                      │
    │    requiredInteractions.every(i => i.completed);                 │
    │                                                                  │
    │  // Required interactions (if module has allow_save: true):      │
    │  // - Reflection questions (at least viewed)                     │
    │  // - Comprehension checks (answered, any result)                │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘
```

### Exit Paths from Devotional

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXIT PATHS                                         │
└─────────────────────────────────────────────────────────────────────────────┘

    FROM ANYWHERE IN DEVOTIONAL:

    1. NAVIGATION (Header)
       ┌─────────────────────────────────────────────┐
       │  EUANGELION    ☰ Menu     ◐ Theme          │
       └─────────────────────────────────────────────┘
       │
       └──► Menu opens overlay with:
           - Home
           - Daily Bread (dashboard)
           - Browse Series
           - Settings

    2. DAY SELECTOR (Sticky, bottom-right)
       ┌─────────────────────────────┐
       │  1  2  3  4  5              │
       │  ✓  ✓  ●  🔒 🔒             │
       └─────────────────────────────┘
       │
       └──► Click any unlocked day to navigate

    3. BROWSER BACK
       │
       └──► Returns to previous page
           Progress saved automatically

    4. CLOSE BROWSER
       │
       └──► Progress saved
           Scroll position saved (resume later)
```

---

## 6. Series Management Flow

### Overview

How users view, track, switch, and complete series.

### Viewing Progress

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROGRESS VISUALIZATION                              │
└─────────────────────────────────────────────────────────────────────────────┘

    DASHBOARD VIEW (/daily-bread):

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   YOUR JOURNEY                                                   │
    │                                                                  │
    │   ═══════════════════════════════════════════════════════════    │
    │                                                                  │
    │   TOO BUSY FOR GOD                                               │
    │   When Your Schedule Becomes Your Savior                         │
    │                                                                  │
    │   ┌─────────────────────────────────────────────────────────┐    │
    │   │                                                         │    │
    │   │   ████████████████████░░░░░░░░░░  60%                   │    │
    │   │                                                         │    │
    │   │   Day 3 of 5 complete                                   │    │
    │   │                                                         │    │
    │   └─────────────────────────────────────────────────────────┘    │
    │                                                                  │
    │   ┌─────┬─────┬─────┬─────┬─────┐                                │
    │   │  1  │  2  │  3  │  4  │  5  │                                │
    │   │  ✓  │  ✓  │  ✓  │  🔒 │  🔒 │                                │
    │   │ Jan │ Jan │ Jan │ Jan │ Jan │                                │
    │   │ 14  │ 15  │ 16  │ 17  │ 18  │                                │
    │   └─────┴─────┴─────┴─────┴─────┘                                │
    │                                                                  │
    │   Started: January 14, 2026                                      │
    │   Expected completion: January 18, 2026                          │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    PROGRESS BAR STATES:

    Not started:  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0%
    In progress:  ████████████░░░░░░░░░░░░░░░░░░  40%
    Complete:     ██████████████████████████████  100% ✓
```

### Switching Series

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SWITCHING SERIES                                    │
└─────────────────────────────────────────────────────────────────────────────┘

    User wants to start a different series:

    PATH 1: Via Browse Series

    ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐
    │    Menu      │ ──► │  Browse All  │ ──► │   Series Detail Page     │
    │  > Browse    │     │   Series     │     │   "Wrestling with Doubt" │
    └──────────────┘     └──────────────┘     └────────────┬─────────────┘
                                                           │
                                                           ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   CONFIRM SWITCH                                                 │
    │                                                                  │
    │   ┌────────────────────────────────────────────────────────────┐ │
    │   │                                                            │ │
    │   │   You're currently reading:                                │ │
    │   │   "Too Busy for God" (Day 3 of 5)                          │ │
    │   │                                                            │ │
    │   │   Starting a new series will pause your current progress.  │ │
    │   │   You can return to it anytime from Browse Series.         │ │
    │   │                                                            │ │
    │   │   [ Keep Current Series ]    [ Start New Series ]          │ │
    │   │                                                            │ │
    │   └────────────────────────────────────────────────────────────┘ │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    If "Start New Series":
    - Current series paused (progress saved)
    - New series becomes active
    - start_date = today
    - current_day = 1
    - Redirect to /daily-bread

    PATH 2: Via Soul Audit (if audits remaining)

    Same flow, but series is chosen by matching algorithm.
```

### Completing a Series

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SERIES COMPLETION FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

    User completes Day 5 (final teaching day):

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │                         ✦                                        │
    │                                                                  │
    │                  JOURNEY COMPLETE                                │
    │                                                                  │
    │              "Too Busy for God"                                  │
    │                                                                  │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   You've completed all 5 days of this series.                    │
    │                                                                  │
    │   KEY TAKEAWAYS                                                  │
    │                                                                  │
    │   • Busyness is modern idolatry—we worship our schedules         │
    │   • Sabbath is trust, not laziness                               │
    │   • Rest is a practice, not a reward                             │
    │   • God's rest is always available to those who seek it          │
    │                                                                  │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   [ Continue to Recap Day ]                                      │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘
                              │
                              │ Day 6 (Recap) unlocks
                              ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   RECAP DAY                                                      │
    │                                                                  │
    │   (Full recap content as shown in Day-Gating section)            │
    │                                                                  │
    │   - Week summary                                                 │
    │   - Saved reflections                                            │
    │   - Final journaling prompt                                      │
    │   - "Carry this forward" commitment                              │
    │                                                                  │
    └────────────────────────────────┬─────────────────────────────────┘
                                     │
                                     │ After Sabbath + Recap
                                     ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   WHAT'S NEXT?                                                   │
    │                                                                  │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   OPTION A (if soul_audit_count < 3):                            │
    │                                                                  │
    │   [ Take Another Soul Audit ]                                    │
    │   Let us find your next journey based on where you are now.      │
    │                                                                  │
    │   [ Browse All Series ]                                          │
    │   Explore our full library of devotional series.                 │
    │                                                                  │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   OPTION B (if soul_audit_count >= 3):                           │
    │                                                                  │
    │   [ Browse All Series ]                                          │
    │   You've explored deeply. Now browse our full library.           │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘
```

### Starting New Series After Completion

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       STARTING NEW SERIES                                   │
└─────────────────────────────────────────────────────────────────────────────┘

    TIMING CONSIDERATION:

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   New series starts the next Monday after selection.             │
    │                                                                  │
    │   WHY:                                                           │
    │   - Maintains weekly rhythm                                      │
    │   - Prevents rushing                                             │
    │   - Honors Sabbath structure                                     │
    │                                                                  │
    │   EXCEPTION:                                                     │
    │   - If user completes on Saturday, they can start Monday         │
    │   - If user completes Monday-Friday, series starts next Monday   │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    USER SELECTS NEW SERIES (Browse or Soul Audit):

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   WRESTLING WITH DOUBT                                           │
    │   Finding Faith When Questions Linger                            │
    │                                                                  │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   Your journey begins Monday, January 20                         │
    │                                                                  │
    │   ┌─────────────────────────────────────────────────────────┐    │
    │   │   Mon     Tue     Wed     Thu     Fri     Sat     Sun   │    │
    │   │   Day 1   Day 2   Day 3   Day 4   Day 5   Recap   Rest  │    │
    │   └─────────────────────────────────────────────────────────┘    │
    │                                                                  │
    │   [ Confirm Start Date ]    [ Browse Other Series ]              │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘
```

---

## 7. Account & Settings Flow

### Overview

Profile management, preferences, and user control.

### Settings Page Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SETTINGS PAGE                                     │
│                           /settings                                         │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   SETTINGS                                                       │
    │                                                                  │
    │   ═══════════════════════════════════════════════════════════    │
    │                                                                  │
    │   APPEARANCE                                                     │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   Theme                                                          │
    │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
    │   │    Light    │    │    Dark     │    │   System    │          │
    │   │     ○       │    │     ●       │    │     ○       │          │
    │   └─────────────┘    └─────────────┘    └─────────────┘          │
    │                                                                  │
    │   Text Size                                                      │
    │   ○ Normal    ● Large    ○ Extra Large                           │
    │                                                                  │
    │   ═══════════════════════════════════════════════════════════    │
    │                                                                  │
    │   PREFERENCES                                                    │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   Sabbath Day                                                    │
    │   ○ Saturday    ● Sunday                                         │
    │                                                                  │
    │   Your Sabbath affects when content unlocks and when you         │
    │   receive the "rest" day in your series.                         │
    │                                                                  │
    │   Timezone                                                       │
    │   ┌─────────────────────────────────────────────────────────┐    │
    │   │  America/New_York (EST)                              ▼  │    │
    │   └─────────────────────────────────────────────────────────┘    │
    │                                                                  │
    │   Content unlocks at 7:00 AM in your timezone.                   │
    │                                                                  │
    │   ═══════════════════════════════════════════════════════════    │
    │                                                                  │
    │   ACCOUNT                                                        │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   Email                                                          │
    │   john@example.com                                               │
    │   [ Change Email ]                                               │
    │                                                                  │
    │   ═══════════════════════════════════════════════════════════    │
    │                                                                  │
    │   PROGRESS & DATA                                                │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   Series Completed: 2                                            │
    │   Soul Audits Used: 2 of 3                                       │
    │   Member Since: January 14, 2026                                 │
    │                                                                  │
    │   [ View Journey History ]                                       │
    │   [ Download My Data ]                                           │
    │                                                                  │
    │   ═══════════════════════════════════════════════════════════    │
    │                                                                  │
    │   DANGER ZONE                                                    │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   [ Reset All Progress ]                                         │
    │   Clears all series progress and starts fresh.                   │
    │   Your account will remain active.                               │
    │                                                                  │
    │   [ Delete Account ]                                             │
    │   Permanently removes your account and all data.                 │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘
```

### Profile Management Actions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROFILE ACTIONS                                     │
└─────────────────────────────────────────────────────────────────────────────┘

    CHANGE EMAIL:

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   Change Email                                                   │
    │                                                                  │
    │   Current: john@example.com                                      │
    │                                                                  │
    │   New Email:                                                     │
    │   ┌─────────────────────────────────────────────────────────┐    │
    │   │  new@example.com                                        │    │
    │   └─────────────────────────────────────────────────────────┘    │
    │                                                                  │
    │   We'll send a verification link to your new email.              │
    │                                                                  │
    │   [ Cancel ]    [ Send Verification ]                            │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    RESET PROGRESS (Confirmation):

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   Reset All Progress?                                            │
    │                                                                  │
    │   This will:                                                     │
    │   • Clear all series progress                                    │
    │   • Reset Soul Audit count to 0                                  │
    │   • Remove saved reflections                                     │
    │                                                                  │
    │   This cannot be undone.                                         │
    │                                                                  │
    │   [ Cancel ]    [ Yes, Reset Everything ]                        │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    DELETE ACCOUNT (Confirmation):

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   Delete Account?                                                │
    │                                                                  │
    │   This will permanently delete:                                  │
    │   • Your account                                                 │
    │   • All progress and history                                     │
    │   • Saved reflections and data                                   │
    │                                                                  │
    │   This cannot be undone.                                         │
    │                                                                  │
    │   Type "DELETE" to confirm:                                      │
    │   ┌─────────────────────────────────────────────────────────┐    │
    │   │                                                         │    │
    │   └─────────────────────────────────────────────────────────┘    │
    │                                                                  │
    │   [ Cancel ]    [ Delete Forever ]                               │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘
```

### Journey History View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         JOURNEY HISTORY                                     │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   YOUR JOURNEY HISTORY                                           │
    │                                                                  │
    │   ═══════════════════════════════════════════════════════════    │
    │                                                                  │
    │   COMPLETED                                                      │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   ┌─────────────────────────────────────────────────────────┐    │
    │   │  ✓  TOO BUSY FOR GOD                                    │    │
    │   │     January 14-18, 2026                                 │    │
    │   │     [ View Recap ]  [ Restart Series ]                  │    │
    │   └─────────────────────────────────────────────────────────┘    │
    │                                                                  │
    │   ┌─────────────────────────────────────────────────────────┐    │
    │   │  ✓  WRESTLING WITH DOUBT                                │    │
    │   │     December 28 - January 2, 2026                       │    │
    │   │     [ View Recap ]  [ Restart Series ]                  │    │
    │   └─────────────────────────────────────────────────────────┘    │
    │                                                                  │
    │   IN PROGRESS                                                    │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   ┌─────────────────────────────────────────────────────────┐    │
    │   │  ◐  FINDING PURPOSE (Paused)                            │    │
    │   │     Day 2 of 5 · Started January 7, 2026                │    │
    │   │     [ Continue Series ]                                 │    │
    │   └─────────────────────────────────────────────────────────┘    │
    │                                                                  │
    │   SOUL AUDIT HISTORY                                             │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   1. "I've been so busy lately..." → Too Busy for God            │
    │   2. "I'm not sure what I believe..." → Wrestling with Doubt     │
    │                                                                  │
    │   Soul Audits remaining: 1                                       │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘
```

---

## 8. Share Flow

### Overview

What users can share, how they share, and what recipients see.

### Shareable Content Types

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SHAREABLE CONTENT                                    │
└─────────────────────────────────────────────────────────────────────────────┘

    1. INDIVIDUAL DAY
       ─────────────────────────────────────────────────────────────────────
       URL: wokegod.world/series/too-busy-for-god/day-3

       Recipient sees: Series landing page with day preview
       (Requires Soul Audit or account to read full content)

    2. COMPLETE SERIES
       ─────────────────────────────────────────────────────────────────────
       URL: wokegod.world/series/too-busy-for-god

       Recipient sees: Series detail page with overview

    3. PULL QUOTE / INSIGHT
       ─────────────────────────────────────────────────────────────────────
       URL: wokegod.world/series/too-busy-for-god/day-3#insight-1

       Creates shareable image card (Open Graph)

    4. COMPLETION CELEBRATION
       ─────────────────────────────────────────────────────────────────────
       URL: wokegod.world/celebration/[unique-id]

       "I completed 'Too Busy for God' on EUANGELION"
```

### Share UI Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SHARE MODAL                                       │
└─────────────────────────────────────────────────────────────────────────────┘

    Triggered by "Share" button anywhere:

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   SHARE                                                     ✕    │
    │                                                                  │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   ┌─────────────────────────────────────────────────────────┐    │
    │   │                                                         │    │
    │   │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │    │
    │   │   ▓                                                 ▓   │    │
    │   │   ▓  "Sabbath isn't about what you stop doing—      ▓   │    │
    │   │   ▓   it's about Who you start trusting."           ▓   │    │
    │   │   ▓                                                 ▓   │    │
    │   │   ▓              — Too Busy for God, Day 3          ▓   │    │
    │   │   ▓                  EUANGELION                     ▓   │    │
    │   │   ▓                                                 ▓   │    │
    │   │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │    │
    │   │                                                         │    │
    │   │   (Preview of share card)                               │    │
    │   │                                                         │    │
    │   └─────────────────────────────────────────────────────────┘    │
    │                                                                  │
    │   SHARE TO                                                       │
    │                                                                  │
    │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
    │   │   Copy  │  │ Message │  │  Email  │  │  More   │            │
    │   │   Link  │  │         │  │         │  │   ...   │            │
    │   └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
    │                                                                  │
    │   (On mobile: "More" opens native share sheet)                   │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘
```

### Share Card Design (Open Graph)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SHARE CARD PREVIEW                                   │
│                        (1200 x 630px)                                       │
└─────────────────────────────────────────────────────────────────────────────┘

    SERIES SHARE CARD:

    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
    │   ▓                                                             ▓   │
    │   ▓   EUANGELION                                                ▓   │
    │   ▓                                                             ▓   │
    │   ▓   ──────────────────────────────────────────────            ▓   │
    │   ▓                                                             ▓   │
    │   ▓   TOO BUSY FOR GOD                                          ▓   │
    │   ▓   When Your Schedule Becomes Your Savior                    ▓   │
    │   ▓                                                             ▓   │
    │   ▓   A 5-day devotional journey                                ▓   │
    │   ▓                                                             ▓   │
    │   ▓   ──────────────────────────────────────────────            ▓   │
    │   ▓                                                             ▓   │
    │   ▓   wokegod.world                                             ▓   │
    │   ▓                                                             ▓   │
    │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
    │                                                                     │
    │   Background: Tehom Black                                           │
    │   Text: Scroll White                                                │
    │   Accent: God is Gold rule line                                     │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘

    QUOTE SHARE CARD:

    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
    │   ▓                                                             ▓   │
    │   ▓                                                             ▓   │
    │   ▓   "Sabbath isn't about what you                             ▓   │
    │   ▓    stop doing—it's about Who                                ▓   │
    │   ▓    you start trusting."                                     ▓   │
    │   ▓                                                             ▓   │
    │   ▓                                                             ▓   │
    │   ▓   ──────────────────────────────────────────────            ▓   │
    │   ▓                                                             ▓   │
    │   ▓   Too Busy for God · EUANGELION                             ▓   │
    │   ▓                                                             ▓   │
    │   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   │
    │                                                                     │
    │   Quote: Large, centered, Scroll White                              │
    │   Attribution: Smaller, God is Gold                                 │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘
```

### Share Destinations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SHARE DESTINATIONS                                    │
└─────────────────────────────────────────────────────────────────────────────┘

    DESKTOP:

    1. Copy Link
       - Copies URL to clipboard
       - Toast: "Link copied!"

    2. Email
       - Opens mailto: with pre-filled subject/body
       - Subject: "Check out this devotional"
       - Body: "[Quote or title] - [URL]"

    MOBILE (Native Share Sheet):

    Uses Web Share API when available:

    navigator.share({
      title: 'Too Busy for God',
      text: 'A 5-day devotional on finding rest',
      url: 'https://wokegod.world/series/too-busy-for-god'
    })

    Opens native share sheet with all apps:
    - Messages
    - WhatsApp
    - Instagram
    - Twitter/X
    - Facebook
    - Copy Link
    - etc.
```

### Recipient Experience

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      RECIPIENT EXPERIENCE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

    SHARED LINK CLICKED BY NEW USER:

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   (Series Landing Page)                                          │
    │                                                                  │
    │   TOO BUSY FOR GOD                                               │
    │   When Your Schedule Becomes Your Savior                         │
    │                                                                  │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   A 5-day devotional journey exploring how busyness can          │
    │   become idolatry—and how to find sacred rest in God.            │
    │                                                                  │
    │   WHAT YOU'LL EXPLORE:                                           │
    │   • Day 1: The Vanity of Busyness                                │
    │   • Day 2: The Tyranny of the Urgent                             │
    │   • Day 3: Sacred Rest                                           │
    │   • Day 4: Living Out the Rest                                   │
    │   • Day 5: Entering the Rest                                     │
    │                                                                  │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   Ready to begin?                                                │
    │                                                                  │
    │   [ Start This Series ]  (→ Soul Audit first)                    │
    │                                                                  │
    │   Or [ Take Soul Audit ] for a personalized recommendation       │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    NOTE: New users still go through Soul Audit before starting.
          This builds profile and ensures personalized experience.
```

---

## 9. Edge Cases & Error States

### Missed Days

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MISSED DAYS                                        │
└─────────────────────────────────────────────────────────────────────────────┘

    USER RETURNS AFTER MISSING MULTIPLE DAYS:

    Scenario: User was on Day 2, hasn't visited for 5 days

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   Welcome back!                                                  │
    │                                                                  │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   TOO BUSY FOR GOD                                               │
    │                                                                  │
    │   ┌─────┬─────┬─────┬─────┬─────┐                                │
    │   │  1  │  2  │  3  │  4  │  5  │                                │
    │   │  ✓  │  ✓  │  ◌  │  ◌  │  ◌  │                                │
    │   │     │     │ new │ new │ new │                                │
    │   └─────┴─────┴─────┴─────┴─────┘                                │
    │                                                                  │
    │   While you were away, Days 3-5 have unlocked.                   │
    │   No rush—continue at your own pace.                             │
    │                                                                  │
    │   [ Continue Where You Left Off (Day 3) ]                        │
    │                                                                  │
    │   ─────────────────────────────────────────────────────────────  │
    │                                                                  │
    │   Grace note: "Life happens. God's Word will wait for you."      │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    DESIGN PHILOSOPHY:

    - No guilt messaging
    - No "You missed X days!" warnings
    - All unlocked content available
    - User can read at their pace
    - No streak mechanics or gamification
```

### Multiple Devices

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MULTIPLE DEVICE SYNC                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    USER SWITCHES FROM PHONE TO LAPTOP:

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │  PHONE (morning):        LAPTOP (evening):                       │
    │                                                                  │
    │  Read Day 3              Opens wokegod.world                     │
    │  Saved reflections       Logs in (magic link or session)         │
    │  Completed 70%           │                                       │
    │                          │                                       │
    │                          ▼                                       │
    │                                                                  │
    │                    ┌─────────────────────────────┐               │
    │                    │                             │               │
    │                    │  Day 3 shows as complete    │               │
    │                    │  Reflections synced         │               │
    │                    │  Progress bar accurate      │               │
    │                    │                             │               │
    │                    └─────────────────────────────┘               │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    SYNC BEHAVIOR:

    - Progress synced to Supabase in real-time
    - Reflections saved immediately (debounced)
    - Scroll position NOT synced (starts fresh per device)
    - Theme preference synced
    - All devices see same state

    CONFLICT RESOLUTION:

    If user is reading on two devices simultaneously:
    - Last write wins for reflections
    - Progress = max(device1.progress, device2.progress)
    - No explicit conflict UI shown
```

### Offline Access

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OFFLINE ACCESS                                      │
│                         (Phase 2 - Not MVP)                                 │
└─────────────────────────────────────────────────────────────────────────────┘

    MVP BEHAVIOR (No offline support):

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   USER LOSES CONNECTION:                                         │
    │                                                                  │
    │   ┌────────────────────────────────────────────────────────────┐ │
    │   │                                                            │ │
    │   │                       📡                                   │ │
    │   │                                                            │ │
    │   │               Connection Lost                              │ │
    │   │                                                            │ │
    │   │   We couldn't load the content.                            │ │
    │   │   Please check your connection and try again.              │ │
    │   │                                                            │ │
    │   │   [ Retry ]                                                │ │
    │   │                                                            │ │
    │   └────────────────────────────────────────────────────────────┘ │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    WORKAROUND FOR MVP:

    - Print-Friendly Download available
    - User can save PDF for offline reading
    - Not interactive, but accessible

    PHASE 2 OFFLINE (Future):

    - Service Worker caches current series
    - Offline indicator in UI
    - Reflections queued for sync
    - Full reading available offline
```

### Error States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ERROR STATES                                       │
└─────────────────────────────────────────────────────────────────────────────┘

    1. SESSION EXPIRED
    ─────────────────────────────────────────────────────────────────────────

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │                         ⏳                                       │
    │                                                                  │
    │                  Session Expired                                 │
    │                                                                  │
    │       Your previous session has ended.                           │
    │       Let's get you back on track.                               │
    │                                                                  │
    │       [ Log In Again ]                                           │
    │       (sends new magic link)                                     │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    2. SERIES NOT FOUND (404)
    ─────────────────────────────────────────────────────────────────────────

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │                         🔍                                       │
    │                                                                  │
    │                   Series Not Found                               │
    │                                                                  │
    │       We couldn't find the series you're looking for.            │
    │       It may have been moved or removed.                         │
    │                                                                  │
    │       [ Browse All Series ]    [ Go Home ]                       │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    3. NETWORK ERROR
    ─────────────────────────────────────────────────────────────────────────

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │                         📡                                       │
    │                                                                  │
    │                  Something Went Wrong                            │
    │                                                                  │
    │       We couldn't connect to the server.                         │
    │       Please check your connection and try again.                │
    │                                                                  │
    │       [ Retry ]                                                  │
    │                                                                  │
    │       If this keeps happening, contact support@wokegod.world     │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    4. SERVER ERROR (500)
    ─────────────────────────────────────────────────────────────────────────

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │                         ⚠️                                       │
    │                                                                  │
    │                  We Hit a Snag                                   │
    │                                                                  │
    │       Something went wrong on our end.                           │
    │       Our team has been notified.                                │
    │                                                                  │
    │       [ Try Again ]    [ Go Home ]                               │
    │                                                                  │
    │       Error reference: ERR-2026011715432                         │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    5. MAGIC LINK EXPIRED
    ─────────────────────────────────────────────────────────────────────────

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │                         ⏰                                       │
    │                                                                  │
    │                  Link Expired                                    │
    │                                                                  │
    │       This login link has expired.                               │
    │       Magic links are valid for 24 hours.                        │
    │                                                                  │
    │       [ Request New Link ]                                       │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    6. SOUL AUDIT API ERROR
    ─────────────────────────────────────────────────────────────────────────

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   We couldn't process your response right now.                   │
    │                                                                  │
    │   [ Try Again ]                                                  │
    │                                                                  │
    │   Or browse our series directly:                                 │
    │   [ Browse All Series ]                                          │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    (Graceful degradation: user can still browse manually)
```

### Rate Limiting

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RATE LIMITING                                       │
└─────────────────────────────────────────────────────────────────────────────┘

    SOUL AUDIT (Claude API) RATE LIMIT:

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   Please Wait                                                    │
    │                                                                  │
    │   You've submitted several requests recently.                    │
    │   Please wait a moment before trying again.                      │
    │                                                                  │
    │   Try again in: 45 seconds                                       │
    │                                                                  │
    │   Or [ Browse All Series ] to continue without matching          │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

    MAGIC LINK RATE LIMIT:

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │   Too Many Requests                                              │
    │                                                                  │
    │   We've sent multiple links to your email.                       │
    │   Please check your inbox (and spam folder).                     │
    │                                                                  │
    │   You can request another link in: 5 minutes                     │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘
```

---

## Summary: Emotional Arc Across All Flows

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EMOTIONAL DESIGN PRINCIPLES                              │
└─────────────────────────────────────────────────────────────────────────────┘

    EVERY INTERACTION SHOULD FEEL:

    ┌─────────────────────────────────────────────────────────────────────┐
    │                                                                     │
    │   INVITATIONAL          Not pushy                                   │
    │   "Come as you are"     No guilt, no pressure                       │
    │                                                                     │
    │   PERSONAL              Not generic                                 │
    │   "This is for you"     Soul Audit matching, personalized flow      │
    │                                                                     │
    │   REVERENT              Not casual                                  │
    │   "This matters"        Cinematic design, thoughtful pacing         │
    │                                                                     │
    │   RESTFUL               Not anxious                                 │
    │   "No rush"             Day-gating, Sabbath respect, grace-filled   │
    │                                                                     │
    │   TRUSTWORTHY           Not exploitative                            │
    │   "We care"             No dark patterns, privacy-respecting        │
    │                                                                     │
    └─────────────────────────────────────────────────────────────────────┘

    VISUAL CONSISTENCY:

    • Tehom Black: Authority, depth, the beginning
    • Scroll White: Rest, breath, readable
    • God is Gold: Glory, emphasis, divine moments

    Use gold sparingly. When it appears, it should feel significant.

    ─────────────────────────────────────────────────────────────────────────

    "The scroll reveals layers to those who look deeper."
    — PaRDeS as UX principle
```

---

**End of UX Flow Maps v1.0**

_For technical implementation details, see:_

- `/docs/SPRINT-PLAN.md` - Development roadmap
- `/.claude/skills/euangelion-platform/references/user-flows.md` - Technical flow specs
- `/.claude/skills/wokegod-brand/references/` - Design system details
