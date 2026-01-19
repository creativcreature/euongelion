# User Flows
**Version:** 1.0

---

## FLOW 1: FIRST VISIT (Soul Audit)

### Steps

```
┌─────────────────────────────────────────────────────────┐
│  1. LANDING PAGE                                        │
│     URL: wokegod.world                                  │
│     Check: No session cookie                            │
│     Show: Soul Audit form                               │
└─────────────────────────┬───────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│  2. SOUL AUDIT FORM                                     │
│     Elements:                                           │
│     - Headline: "What's weighing on your heart?"        │
│     - Subtext: "Share honestly. This helps us find..."  │
│     - Textarea (autofocus)                              │
│     - Character hint: "Take your time..."               │
│     - Button: "Continue →"                              │
└─────────────────────────┬───────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│  3. PROCESSING STATE                                    │
│     Show: Loading animation                             │
│     Text: "Listening..." (2-3 seconds)                  │
│     Backend: Claude API matching                        │
└─────────────────────────┬───────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│  4. MATCH PRESENTATION                                  │
│     Elements:                                           │
│     - "Based on what you shared..."                     │
│     - Series title + subtitle                           │
│     - Brief reasoning (2-3 sentences)                   │
│     - Button: "Begin This Journey"                      │
│     - Link: "See other options" (alternatives)          │
└─────────────────────────┬───────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│  5. SABBATH PREFERENCE                                  │
│     Elements:                                           │
│     - "One quick thing..."                              │
│     - "Which day is your Sabbath?"                      │
│     - Toggle: Saturday / Sunday                         │
│     - Explanation: "We'll give you rest that day"       │
│     - Button: "Let's Begin"                             │
└─────────────────────────┬───────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│  6. SESSION CREATED                                     │
│     Backend:                                            │
│     - Create session in Supabase                        │
│     - Set httpOnly cookie                               │
│     - Record Soul Audit                                 │
│     Redirect: /daily-bread                              │
└─────────────────────────────────────────────────────────┘
```

### UI States

**Form Empty:**
```
┌────────────────────────────────────────┐
│  What's weighing on your heart?        │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │  (placeholder: "I've been        │  │
│  │   feeling...")                   │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [ Continue → ] (disabled)             │
└────────────────────────────────────────┘
```

**Form Has Content:**
```
┌────────────────────────────────────────┐
│  What's weighing on your heart?        │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ I've been so busy lately that I  │  │
│  │ don't even have time to pray     │  │
│  │ anymore. I feel like God is      │  │
│  │ distant...                       │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [ Continue → ] (enabled, gold)        │
└────────────────────────────────────────┘
```

---

## FLOW 2: RETURN VISIT (Daily Bread)

### Steps

```
┌─────────────────────────────────────────────────────────┐
│  1. ANY PAGE VISIT                                      │
│     Check: Session cookie exists?                       │
│     If yes: Validate with Supabase                      │
│     If valid: Continue to Daily Bread                   │
│     If invalid: Clear cookie → Soul Audit               │
└─────────────────────────┬───────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│  2. DAILY BREAD PAGE                                    │
│     URL: /daily-bread                                   │
│     Fetch: Current day's content                        │
│     Check: Day-gating (7 AM unlock)                     │
└─────────────────────────┬───────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│  3. CONTENT DISPLAY                                     │
│     Elements:                                           │
│     - Series header (title, day X of Y)                 │
│     - Day selector (past days accessible)               │
│     - Module content (cinematic scroll)                 │
│     - Locked days shown but grayed                      │
└─────────────────────────────────────────────────────────┘
```

### Day-Gating Logic

```typescript
// User starts Monday 7 AM
Day 1: Available Monday 7 AM
Day 2: Available Tuesday 7 AM
Day 3: Available Wednesday 7 AM
Day 4: Available Thursday 7 AM
Day 5: Available Friday 7 AM
Day 6: Sabbath OR Recap (user's choice)
Day 7: Recap OR Sabbath
```

**Locked Day UI:**
```
┌────────────────────────────────────────┐
│  Day 4: [Locked]                       │
│                                        │
│  🔒 Unlocks tomorrow at 7:00 AM        │
│                                        │
│  Come back then for:                   │
│  "Living Out the Rest"                 │
└────────────────────────────────────────┘
```

---

## FLOW 3: SERIES COMPLETION

### Steps

```
┌─────────────────────────────────────────────────────────┐
│  1. USER COMPLETES DAY 5                                │
│     Action: POST /api/progress { day: 5 }               │
│     Response: series_complete: true                     │
└─────────────────────────┬───────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│  2. COMPLETION CELEBRATION                              │
│     Elements:                                           │
│     - "Journey Complete" header                         │
│     - Series summary                                    │
│     - Key takeaways (3-5 points)                        │
│     - Animation/visual celebration                      │
└─────────────────────────┬───────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│  3. RECAP DAY (Day 6 or 7)                              │
│     Depending on Sabbath preference:                    │
│     - Saturday Sabbath → Sunday Recap                   │
│     - Sunday Sabbath → Saturday Recap                   │
│                                                         │
│     Elements:                                           │
│     - Week summary                                      │
│     - Favorite verses (saved)                           │
│     - Reflection prompts                                │
└─────────────────────────┬───────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│  4. NEXT STEPS PROMPT                                   │
│     Elements:                                           │
│     - "What's Next?"                                    │
│                                                         │
│     Options:                                            │
│     [ Take Another Soul Audit ]                         │
│     (if count < 3)                                      │
│                                                         │
│     [ Browse All Series ]                               │
│                                                         │
│     Note: New series starts next Monday                 │
└─────────────────────────────────────────────────────────┘
```

### Soul Audit Limit

```typescript
// Max 3 Soul Audits per user
if (session.soul_audit_count >= 3) {
  // Hide "Take Another Soul Audit" option
  // Show only "Browse All Series"
  // Display: "You've explored deeply! Browse to continue."
}
```

---

## FLOW 4: BROWSE SERIES

### Steps

```
┌─────────────────────────────────────────────────────────┐
│  1. SERIES BROWSE PAGE                                  │
│     URL: /series                                        │
│     Show: All 17 published series                       │
│     Layout: Grid of SeriesCards                         │
└─────────────────────────┬───────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│  2. SERIES CARD                                         │
│     Elements:                                           │
│     - Title                                             │
│     - Subtitle                                          │
│     - Pathway badge (Sleep/Awake/Shepherd)              │
│     - Day count                                         │
│     Click: → Series detail page                         │
└─────────────────────────┬───────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│  3. SERIES DETAIL PAGE                                  │
│     URL: /series/[slug]                                 │
│     Elements:                                           │
│     - Full description                                  │
│     - Day previews (titles only)                        │
│     - Key themes                                        │
│     Button: "Start This Series"                         │
└─────────────────────────┬───────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│  4. START SERIES                                        │
│     Action: POST /api/session/start-series              │
│     - Update active_series_id                           │
│     - Set start_date to today                           │
│     - Reset current_day to 1                            │
│     Redirect: /daily-bread                              │
└─────────────────────────────────────────────────────────┘
```

---

## FLOW 5: SETTINGS & PREFERENCES

### Accessible From Menu

```
┌────────────────────────────────────────┐
│  Settings                              │
│                                        │
│  Theme                                 │
│  ○ Light  ● Dark                       │
│                                        │
│  Sabbath Day                           │
│  ○ Saturday  ● Sunday                  │
│                                        │
│  Text Size                             │
│  [ Normal ] [ Large ]                  │
│                                        │
│  ─────────────────────────             │
│                                        │
│  [ Reset Progress ]                    │
│  (Clears session, starts fresh)        │
└────────────────────────────────────────┘
```

---

## NAVIGATION STRUCTURE

### Header (All Pages)

```
┌────────────────────────────────────────────────────────────┐
│  EUONGELION              ☰ Menu    ◐ Theme                 │
└────────────────────────────────────────────────────────────┘
```

### Menu (Expanded)

```
┌────────────────────────────┐
│  ☰ Menu                    │
│                            │
│  Home                      │
│  Daily Bread               │
│  Browse Series             │
│  Settings                  │
│                            │
│  ─────────────             │
│                            │
│  About wokeGod             │
│                            │
└────────────────────────────┘
```

### Breadcrumbs (Where Applicable)

```
Home > Series > Too Busy for God
Home > Daily Bread > Day 3
```

---

## ERROR STATES

### No Active Series

```
┌────────────────────────────────────────┐
│  No Journey Active                     │
│                                        │
│  You haven't started a series yet.     │
│                                        │
│  [ Take Soul Audit ]                   │
│  [ Browse Series ]                     │
└────────────────────────────────────────┘
```

### Session Expired

```
┌────────────────────────────────────────┐
│  Session Expired                       │
│                                        │
│  Your previous session has ended.      │
│  Let's start fresh.                    │
│                                        │
│  [ Start New Journey ]                 │
└────────────────────────────────────────┘
```

### Network Error

```
┌────────────────────────────────────────┐
│  Connection Lost                       │
│                                        │
│  We couldn't load your content.        │
│  Check your connection and try again.  │
│                                        │
│  [ Retry ]                             │
└────────────────────────────────────────┘
```

---

## MOBILE CONSIDERATIONS

### Bottom Navigation (Mobile)

```
┌────────────────────────────────────────┐
│                                        │
│        (Content Area)                  │
│                                        │
├────────────────────────────────────────┤
│  🏠 Home   📖 Read   📚 Browse   ⚙️    │
└────────────────────────────────────────┘
```

### Swipe Gestures

- Swipe left/right: Navigate between available days
- Swipe up: Continue scrolling content
- Swipe down from top: Refresh

### Touch Targets

- All interactive elements: Minimum 44px × 44px
- Adequate spacing between touch targets
