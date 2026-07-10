# Mobbin Polish Audit & Platform-Adaptive Redesign Plan

- **Date:** 2026-07-10
- **Owner:** Product + Design + Engineering
- **Status:** Research complete → execution pending (points to a dedicated build session)
- **Purpose:** A single, self-contained document a future Claude session can be pointed to in order to (a) mirror the best-in-class Soul Audit + onboarding flows, (b) fix what is broken/wrong per feature, and (c) shore the entire site to **Mobbin-gallery grade** — i.e. good enough that Euangelion itself could be curated on Mobbin as inspiration.
- **Method:** Current state mapped from code (every claim carries a `file:line`). Reference state mined from Mobbin (every reference is a live link). Platform-adaptive direction and momentum direction are **founder-locked decisions** (see below).

## Tracking-spine alignment (read the future session in here)

This audit **feeds** but does not yet amend the canonical contracts. The execution session must:

1. Reconcile the platform-adaptive nav mandate (Part 1) with `docs/decisions/APP-VS-WEB-APP.md` and `docs/methodology/M04-NAVIGATION-DESIGN-BEST-PRACTICES.md` + `M00-EUANGELION-UNIFIED-METHODOLOGY.md`.
2. Open new decision IDs in `docs/production-decisions.yaml` + `docs/decisions/MASTER-DECISIONS.md` for: (a) mobile bottom tab bar + platform-split IA, (b) momentum hybrid (completion beat + gentle presence). These are referenced below as **`SA-NEW-1`** and **`SA-NEW-2`** (assign real IDs at execution time).
3. Create/append feature PRDs in `docs/feature-prds/` for each P0/P1 workstream (referenced below as **`F-NEW-a…`**; assign real F-### at execution time) and register them in `FEATURE-PRD-INDEX.md` + `FEATURE-PRD-REGISTRY.yaml`.
4. Update `PRODUCTION-FEATURE-SCORECARD.md` and `PRODUCTION-10-10-PLAN.md` with the scores in Part 6.
5. Log shipped work in `CHANGELOG.md` per the standard commit gate.

Nothing in the canonical spine was edited by this audit (no code changed), to avoid contract drift ahead of founder-assigned IDs.

---

## Founder-locked decisions (from the review session)

- **`SA-NEW-1` — Platform-adaptive, bespoke-per-device design.** Mobile gets a persistent **bottom tab bar**; the mobile **top bar carries different items than the tab bar** (no duplication); desktop and mobile are each **designed uniquely for their platform** — _same content/date, platform-specific presentation._ Not a single responsive layout that stretches — two intentional designs sharing one data layer.
- **`SA-NEW-2` — Momentum: hybrid, guilt-free.** Keep the no-streaks ethos, but add **both** a quiet end-of-session **completion beat** _and_ a **gentle "presence" indicator** (showing-up, no counts, no broken-streak shame). Also finish or delete the orphaned `DevotionalMilestoneReveal` so intent is clean.
- **Deliverable:** this tracked audit doc.

---

## Part 0 — The bar: what Mobbin curators actually reward

A surface gets curated when it shows: **(1) systemic coherence** — one nav model, one type scale, one motion language; **(2) complete state coverage** — empty/loading/error all _designed_, never a raw spinner or default; **(3) native-feeling chrome** — tab bars, bottom sheets, haptics, safe-area respect; **(4) signature moments** — an authored reveal/transition/detail.

Euangelion already owns (4): the Soul-Audit "edition press" animation, the editorial 30-module reader, the riso/halftone art system. What blocks it is (1), (2), and (3). This plan closes those.

---

## Part 1 — PLATFORM-ADAPTIVE IA (the new mandate, `SA-NEW-1`)

### Current state (the problem)

- Global chrome is `EuangelionShellHeader` (`src/components/EuangelionShellHeader.tsx`), a newspaper masthead rendered per-page. Top nav = 5 items: HOME `/`, TODAY `/today`, SOUL AUDIT `/soul-audit`, SERIES `/series`, HOW WE WRITE `/how-we-write` (`:15`).
- **No bottom tab bar anywhere.** Mobile nav is hamburger-only (`:628`), plus a secondary inline mobile row (`:377`).
- The two returning-user surfaces — **Daily Bread** and **Library** — are demoted _out_ of nav into the avatar menu / footer (comment at `:8-14`).
- Net effect: on mobile it reads as a responsive website, not a native app. This is the **single biggest blocker** to Mobbin-worthiness.

### The principle

> One data layer (the same devotional, date, plan, and content), **two bespoke presentations.** Mobile is designed for thumb-reach, one-hand, glanceable. Desktop is designed for the editorial broadsheet. Neither is the other stretched.

### Reference set (open these)

- Bottom tab bars, dark & reverent: [Open — Home](https://mobbin.com/flows/e28936b2-4a7a-4d0f-92e3-50243da9ac78) (cinematic dark, 4-tab), [Calm — Home](https://mobbin.com/flows/ad4abb1e-008d-4e25-924e-0c709e9eda0b) (Home/Sleep/Discover/Profile), [Headspace — Today](https://mobbin.com/flows/0a0b3e16-5b9a-463d-a9bb-101afcde88f4) (Today/Explore/[Name]), [Ten Percent Happier — Home](https://mobbin.com/flows/39222e80-0e05-4775-9d7a-e274707ec2bd) (Home/Courses/Singles/Sleep/Podcasts), [Mindvalley — Today](https://mobbin.com/flows/f777025d-9856-4dae-b7eb-a41015bbf91d) (Today/Programs/AI/Meditations/Community).
- Desktop editorial masthead: keep your current model, refined.

### Proposed IA split (destinations vs utilities)

**Rule that resolves "top bar should be different items":** a **tab bar carries destinations**; a **top bar carries identity + context + utilities.** They never duplicate.

**Mobile — bottom tab bar (destinations, 5 max):**

| Tab        | Route                                  | Notes                                             |
| ---------- | -------------------------------------- | ------------------------------------------------- |
| Today      | `/today` (or new signed-in Today home) | Default landing for returning users               |
| Series     | `/series`                              | The Apple-TV browse                               |
| Soul Audit | `/soul-audit`                          | Flagship personalization — center/emphasized slot |
| Library    | `/library`                             | Consolidated (see Part 4 #12)                     |
| You        | `/settings` (+ profile header)         | Account, momentum, reminders                      |

**Mobile — top bar (NOT the tab items):** wordmark/date identity (left) · Search (new, Part 4 #14) · Active-plan resume glyph (`ActivePlanBadge`) · Theme toggle · account/notifications (right). Context only — no primary destinations.

**Desktop — editorial masthead nav (destinations, horizontal):** HOME · TODAY · SOUL AUDIT · SERIES · DAILY BREAD · LIBRARY · HOW WE WRITE, with utilities (theme, resume badge, account) right-aligned. Daily Bread + Library **return to the primary nav on desktop** where horizontal space allows (undo the demotion).

**Acceptance criteria (`F-NEW-a` — Platform-adaptive IA):**

- [ ] Mobile renders a persistent, safe-area-aware bottom tab bar on all primary app surfaces (hidden inside the immersive reader if desired).
- [ ] Mobile top bar contains zero tab-bar-duplicate destinations.
- [ ] Desktop retains the masthead; Daily Bread + Library are reachable in ≤1 click from the desktop masthead.
- [ ] Both layouts verified at 375 / 390 / 768 / 1280 / 1440, light + dark.
- [ ] Reconciled against `M04` + `APP-VS-WEB-APP.md`; decision logged as `SA-NEW-1`.

---

## Part 2 — SOUL AUDIT: mirror + fixes

### Current state

Single free-text box ("What are you wrestling with today?", `soul-audit/page.tsx:58`) → RAG + LLM composes 3 pathways → results page → "edition press" generation animation → reader. Conceptually stronger than the references (real composition, honest no-fallback, crisis gate). But the _experience_ underdelivers and several pieces are silently broken.

### Primary mirror

**[Calm Sleep — Completing a quiz](https://mobbin.com/flows/6057bb13-1765-48cc-8cfa-09b0ef8e7107)** — your dark, reverent twin: single question per screen, top progress bar w/ count ("6/6"), calm radio rows, then a **designed payoff** (categorized recommendation cards) → "Your plan is ready. Unlock it now." Proves a dark single-question cadence can feel premium and that **the reveal is a room, not a list.**

### Secondary mirrors

- **[Superpower — Taking lifestyle quiz](https://mobbin.com/flows/48c850ab-006f-4536-a9bc-1d4033c46c9c)** — the **warm framing screen before the questions** + section labels. Borrow the emotional on-ramp before the bare textarea.
- **[Yazio — Your results are in](https://mobbin.com/screens/ac726564-f4c4-40fb-9f25-916c59cc2cec)** — hero result + "You might also like" + quiet "Retake." The exact honest hierarchy your results page _claims in code_ but never renders.
- **[Zero — assessment summary](https://mobbin.com/screens/16230d4b-041b-4b5b-b32d-65bb40e09c3d)** — a **"here's what we heard" answer echo with Edit** before building. Makes the AI feel like it listened.
- **[Lifesum — meal-plan test](https://mobbin.com/flows/a6a50688-4d91-4ab0-89ee-177e2e4dda1b)** — plan-detail "HERE'S WHAT YOU GET" contract before commit.
- **[Fabulous](https://mobbin.com/screens/f1988f02-7e1c-46c1-843d-310520173654)** / **[Liven radar archetype](https://mobbin.com/screens/40365966-8d27-4646-b11a-feeea1c408a7)** / **[Dimensional archetype reveal](https://mobbin.com/screens/afda5327-e53e-4934-86e3-3f2d58fcdf27)** — authority framing for the reveal (reverent version: "Based on what you named, here is where Scripture meets you").

### 🔴 Broken (fix first) — with anchors

1. **Guided reveal is dead code.** `revealedCount` inits to `3` (`soul-audit/results/page.tsx:70-73`) → "Explore another direction" progressive reveal never fires; all 3 cards dump at once; the `revealedCount === 1` header + `expandedReasoning` branches are unreachable. **Revive (start at recommended, reveal alternatives on tap — mirror Calm/Yazio) or delete.**
2. **Result cards render bare.** `OptionCard` looks up `getSeriesHero(option.slug)` / `SERIES_DATA[option.slug]` but `option.slug` is a slugified AI title, not a series slug (`OptionCard.tsx:33-38`; slug source `ingredient-selector.ts:774-780`) → hero, keyword chips, and "N DAYS" badge are always empty. **Resolve a real hero from the scripture theme, or design a beautiful text-first card (Yazio).**
3. **`seriesSlug` written to plan is an AI slug** (`select/route.ts:724`) → `/api/soul-audit/current` resolves `SERIES_DATA[series_slug]?.title` = `undefined` (`current/route.ts:98`) → resume badge title silently empty. **Store a resolvable title/theme.**
4. **Loading skeleton mismatch** — `results/loading.tsx` renders a 3-up grid; page renders stacked RECOMMENDED/ALTERNATIVE. **Make skeleton layout-accurate.**
5. **Label / promise drift** — homepage submit `GET MATCHED` (`page.tsx:582`) vs `/soul-audit` `Continue` (`page.tsx:210`); input subcopy claims "match you to three reading paths **from our library**" (`page.tsx:76`) though options are AI-composed. **One verb, one true promise.**
6. **Two readers, one abandoned** — `/soul-audit/plan/[planToken]` fully built but resume routes to `/daily-bread` because the dedicated reader "does not render the onboarding/locked-cycle state" (`current/route.ts:65-73`). **Pick canonical; finish or retire the other.**

### 🟡 Elevation (after fixes)

- Add the **pre-question framing screen** (Superpower).
- Add the **answer-echo beat** (Zero) before "We found something for you."
- Keep the **edition-press animation** (`GenerationProgress.tsx`) — it out-crafts every reference; just ensure the run-up is clean.

**Acceptance criteria (`F-NEW-b` — Soul Audit reveal):** dead reveal resolved; cards visually complete in light+dark; skeleton matches; single verb/promise across both entry points; one canonical plan reader; verified end-to-end in the Workers runtime with a real generation.

---

## Part 3 — ONBOARDING / SIGN-UP: mirror + fixes

### Current state

Anonymous users land on a marketing homepage with **no first-run.** A real 5-step onboarding exists but is double-gated: behind auth **and** first-session (`onboarding/page.tsx:36`, `callback/route.ts:71-80`). Auth is passwordless (magic link + Google), clean but ends at an email bounce.

### Mirrors

- **[Linear Mobile — onboarding](https://mobbin.com/flows/6f22cfdb-1ff0-4b28-9149-375845525dc6)** — **in-app magic _code_ entry** ("Check your email — we've sent a temporary login code"), so the user never leaves the flow. Your sign-in dead-ends at "click the link in your email" (`sign-in/page.tsx:112`). **Add code entry beside the link.**
- **[Wanderlog — questionnaire](https://mobbin.com/flows/43df4d6b-29ef-484e-98bc-2164e5c193b7)** — bookend framing ("Welcome 👋" in, "we'll use your answers to personalize…" out).
- **[Mindvalley — onboarding](https://mobbin.com/flows/d8840e33-eabe-4de6-8c00-e397e6348630)** + **[goal picker](https://mobbin.com/flows/05c98b08-418d-4892-afe4-bdefdafb627e)** — warm named-guide intro; clean "I'm new here / Log In" fork.
- **[Finch — notifications](https://mobbin.com/flows/e42398a2-8533-456c-ae25-eccac28f5de3)** / **[goals](https://mobbin.com/flows/19212698-61fe-43ca-9144-60c9e73bbcd2)** — gentle non-coercive opt-in framing (matches your voice).
- **[Todoist — onboarding](https://mobbin.com/flows/9910ff65-57e3-4946-aad3-d032a01f5d71)** — "Welcome!" checklist with items striking through as done.

### 🔴/🟠 Wrong or missing

1. 🟠 **No first-run for the anonymous majority.** Add an optional, dismissible 3-screen value + 1 personalization tap + gentle account offer.
2. 🔴 **`GuestSignupGate.tsx` fully built, imported nowhere** — a lightweight guest capture (Sabbath/theme/text-size) that is exactly the missing anonymous personalization. Wire or delete.
3. 🟡 **Onboarding is skip-everything** and only fires for first-session authed users. Move reading-comfort + Sabbath into a light anonymous capture.
4. 🟠 **No PWA install prompt** (no `beforeinstallprompt` handler) despite a valid `manifest.json` + `sw.js`. Add a quiet "Add Euangelion to your home screen" after a good session.
5. 🟡 **Two save systems** — `/api/bookmarks` is anonymous-friendly but library "SAVE/START" actions hard-401 only after the tap (`devotionalLibraryStore.ts`). Reconcile, or show the gate before the tap.
6. 🟢 Nit: session cookie misspelled `euongelion_session` (`session.lib:5`).

**Acceptance criteria (`F-NEW-c` — Onboarding):** anonymous first-run present + dismissible; magic-link code entry added; guest personalization wired or removed; install prompt shipped; one coherent save gate.

---

## Part 4 — BEST-IN-CLASS, PER FEATURE (matrix + moves)

| #   | Feature           | Today                                 | Best-in-class ref                                                                                                                                                                                                                                                                                              | Grade | Move                                          |
| --- | ----------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------- |
| 1   | First-run         | none for anon                         | [Wanderlog](https://mobbin.com/flows/43df4d6b-29ef-484e-98bc-2164e5c193b7) · [Mindvalley](https://mobbin.com/flows/05c98b08-418d-4892-afe4-bdefdafb627e) · [Blinkist](https://mobbin.com/flows/a9e95e3d-961b-422b-b217-d3fe6fe34e0f)                                                                           | C     | Optional 3-screen value + 1 tap               |
| 2   | Quiz→reveal       | broken reveal, bare cards             | [Calm Sleep](https://mobbin.com/flows/6057bb13-1765-48cc-8cfa-09b0ef8e7107) · [Yazio](https://mobbin.com/screens/ac726564-f4c4-40fb-9f25-916c59cc2cec) · [Zero](https://mobbin.com/screens/16230d4b-041b-4b5b-b32d-65bb40e09c3d)                                                                               | B−    | Fix + design a real reveal                    |
| 3   | Sign-up/auth      | email bounce                          | [Linear](https://mobbin.com/flows/6f22cfdb-1ff0-4b28-9149-375845525dc6)                                                                                                                                                                                                                                        | B     | In-app code entry                             |
| 4   | Home/Today        | strong but web-shaped                 | [Calm](https://mobbin.com/flows/ad4abb1e-008d-4e25-924e-0c709e9eda0b) · [Headspace](https://mobbin.com/flows/0a0b3e16-5b9a-463d-a9bb-101afcde88f4) · [Mindvalley](https://mobbin.com/flows/f777025d-9856-4dae-b7eb-a41015bbf91d)                                                                               | B     | Signed-in "Today" home ≠ marketing page       |
| 5   | Nav / IA          | hamburger-only, no tab bar            | tab bars in [Calm](https://mobbin.com/flows/ad4abb1e-008d-4e25-924e-0c709e9eda0b)/[Ten Percent](https://mobbin.com/flows/39222e80-0e05-4775-9d7a-e274707ec2bd)/[Open](https://mobbin.com/flows/e28936b2-4a7a-4d0f-92e3-50243da9ac78)                                                                           | C+    | Part 1 platform-adaptive IA                   |
| 6   | Series browse     | strong (9 rails, 5 layouts)           | [Calm](https://mobbin.com/flows/ad4abb1e-008d-4e25-924e-0c709e9eda0b) · [Mindvalley](https://mobbin.com/flows/f777025d-9856-4dae-b7eb-a41015bbf91d)                                                                                                                                                            | A−    | Add "why matched"                             |
| 7   | Series detail     | strong                                | [Waking Up (tabbed)](https://mobbin.com/screens/71c46d25-771d-4184-aa8c-c14c7653e329) · [Open](https://mobbin.com/screens/30b9ad92-c0cb-486f-a441-5b7f9f7fc407) · [Insight Timer](https://mobbin.com/screens/c249ec8a-2eb6-4639-b9f1-5fc147ef8b06)                                                             | B+    | Tabbed detail (Sessions/About/Voices/Artwork) |
| 8   | Reader            | excellent, no in-reader type controls | [Apple Books themes](https://mobbin.com/screens/8b5ec05b-943e-4e1d-83b3-d38376a4cee1) · [Fable](https://mobbin.com/screens/a4cf1517-abf8-4a19-b375-2d4622b1c744) · [The Athletic](https://mobbin.com/screens/1c2cc1da-9ff7-4fe3-9b4d-2eb063457669)                                                             | B+    | In-reader "Aa" sheet, curated named themes    |
| 9   | Daily Bread       | strong (tiers, status vocab)          | [Moonly](https://mobbin.com/flows/6ebb9a2c-4a80-4d42-8665-f3c058172f11) · [Fable](https://mobbin.com/flows/2975f9fa-1de6-40e4-bad3-267dbf72fb2a)                                                                                                                                                               | B+    | Add completion beat (Part 5)                  |
| 10  | Progress/momentum | intentional void; milestone dead code | [Open dotted week](https://mobbin.com/flows/e28936b2-4a7a-4d0f-92e3-50243da9ac78) · [Bears Gratitude](https://mobbin.com/flows/80a1e5d4-4bfe-454b-bfa8-195349cd32ee)                                                                                                                                           | C     | Hybrid (Part 5, `SA-NEW-2`)                   |
| 11  | Reminders         | thin, config-gated, no scheduler      | [Waking Up "Moment"](https://mobbin.com/flows/1a4d2535-c453-4fc2-b630-d23f4e203b71) · [stoic.](https://mobbin.com/flows/948a7285-9f2f-46d1-8d82-32da2d4ce828) · [CapWords](https://mobbin.com/flows/9de5ff09-f827-4c5b-9b22-21a290cef6bf)                                                                      | C−    | Time-window picker in-voice                   |
| 12  | Library/saved     | 3 fragmented surfaces                 | [ElevenReader](https://mobbin.com/screens/b82ee6d1-960d-4a40-b68f-a246a4892fbe) · [Ten Percent Collections](https://mobbin.com/flows/39222e80-0e05-4775-9d7a-e274707ec2bd)                                                                                                                                     | C     | Consolidate `/saved`+`/clippings`+`/library`  |
| 13  | Empty states      | thin/inconsistent                     | [Pinterest](https://mobbin.com/screens/ff7cf79a-ce28-4dd9-bc19-d1278befad72) · [Skyscanner](https://mobbin.com/screens/01d01a3b-bf60-48ae-b21d-0827e37eda6f) · [OpenTable](https://mobbin.com/screens/30875928-c58f-4a84-894c-17ec717f4587)                                                                    | C+    | Illustrated single-CTA empties (use riso art) |
| 14  | Search            | series-only, no global                | (category norm)                                                                                                                                                                                                                                                                                                | C−    | Global search (series + notes + clippings)    |
| 15  | Settings/profile  | 1,790-line scroll, no profile         | [Claude](https://mobbin.com/screens/65fc8cd8-a8e4-47a3-8d7f-9c35f3e0a072) · [Cosmos](https://mobbin.com/screens/d40a9283-9bde-4f0b-93d0-2c01f818b914) · [Fixtured](https://mobbin.com/screens/8bba7ebd-01d9-41b4-b70b-7dbd69a3923b) · [Tiimo](https://mobbin.com/screens/86a6704a-2235-4bb4-b1ac-bbaf383a60dc) | B−    | Grouped cards + light profile header          |
| 16  | Paywall (future)  | built, hidden                         | [Calm Sleep unlock](https://mobbin.com/flows/6057bb13-1765-48cc-8cfa-09b0ef8e7107) · [Blinkist trial timeline](https://mobbin.com/flows/a9e95e3d-961b-422b-b217-d3fe6fe34e0f) · [stoic.](https://mobbin.com/flows/948a7285-9f2f-46d1-8d82-32da2d4ce828)                                                        | N/A   | Trial-timeline pattern when live              |

**Deep-dive notes**

- **#8 In-reader type controls:** all font/size/theme lives in global Settings; no in-reader adjustment. [Apple Books' _named_ presets](https://mobbin.com/screens/82e2f758-a4ad-48de-9240-afea672d073c) (Original/Quiet/Paper/Bold/Calm/Focus) are the on-brand model — curated names, not raw sliders. Ship an "Aa" sheet with 3–4 named themes (e.g. Ink, Parchment, Vellum, Night). Note reader SSR is deliberately disabled (`DevotionalPageClient.tsx:100`, `devotional/[slug]/page.tsx:190`) over a serialization bug on `too-busy-for-god-day-6` — always flashes a client loader; **re-enable SSR** as part of reader polish.
- **#12 Library:** `DevotionalLibraryRail` (7 tabs: today/bookmarks/highlights/notes/chat-history/archive/trash) is **wired and strong** (the "orphaned" memory is stale). Make it the single Library home; fold `/saved` + `/clippings` in as tabs. Fix `/saved` mis-routing to `/wake-up/devotional/*` for Euangelion-silo bookmarks (`SavedList.tsx:153`).

---

## Part 5 — MOMENTUM HYBRID SPEC (`SA-NEW-2`)

Keep "no streak counter… no guilt loop" (`about/page.tsx:40`). Add two guilt-free surfaces:

**A. Completion beat (per day/plan).** A single reverent end-of-session moment — a verse, a breath, "come back tomorrow" — **not** confetti. Spectrum reference: loud [Numo](https://mobbin.com/screens/6bd56122-0f37-4c7c-a21b-9bfb35dd4cca)/[Duolingo](https://mobbin.com/screens/1ba25802-c732-4774-8127-ca7029902f46) at one end vs restrained [Headspace post-session quote](https://mobbin.com/screens/256eda8c-cb68-4751-a846-8b0d91383f0c) at the other — **build the Headspace end.** Revive `DevotionalMilestoneReveal` (currently orphaned dead code) as this surface, or delete it and build fresh.

**B. Gentle presence indicator.** Days you showed up are quietly lit — **no number, no broken-streak shame, no red.** Reference: [Open's dotted S-M-T-W-T-F-S week row](https://mobbin.com/flows/e28936b2-4a7a-4d0f-92e3-50243da9ac78) atop a cinematic dark home; [Bears Gratitude](https://mobbin.com/flows/80a1e5d4-4bfe-454b-bfa8-195349cd32ee) marks presence without counting. Differentiating angle: _"the app that helps you return without punishing you for leaving."_ Surfaces on the signed-in Today home + the "You" tab.

**Acceptance criteria (`F-NEW-d`):** completion beat is calm, reduced-motion-safe, dismissible; presence indicator shows lit/unlit dots with zero counts, no negative framing on gaps; both respect the guilt-free brand line; `SA-NEW-2` logged.

---

## Part 6 — MOBBIN-WORTHINESS SCORECARD

| Surface                   | Grade | Blocker to gallery-grade                                              |
| ------------------------- | ----- | --------------------------------------------------------------------- |
| Reader (`/devotional`)    | A−    | No in-reader type controls; SSR disabled → loader flash               |
| Series browse (`/series`) | A−    | Count copy inconsistent ("32" vs "65"); no "why matched"              |
| Daily Bread               | B+    | No completion beat; onboarding-vs-locked states uneven                |
| Home (`/`)                | B     | Marketing page doing a returning-user's job                           |
| Soul Audit                | B−    | Broken reveal, bare cards, label drift, skeleton mismatch             |
| Settings                  | B−    | 1,790-line single scroll; no profile header; "coming soon" UI exposed |
| Navigation / IA           | C+    | Hamburger-only; core surfaces demoted; no tab bar                     |
| Onboarding                | C     | None for anon; real one double-gated; guest gate dead                 |
| Library / saved           | C     | Three overlapping surfaces; mis-routing bug                           |
| Reminders                 | C−    | No scheduler; config-gated; local-only fake toggle                    |
| Search                    | C−    | Series-only; advertised SearchAction with no UI                       |
| Empty/error/loading       | C+    | Inconsistent; skeleton mismatch; no illustrated empties               |

---

## Part 7 — PUNCH LIST (execution)

### P0 — correctness & dead code (reads as "unfinished" to a curator)

1. Fix/remove Soul-Audit **guided-reveal dead code** — `soul-audit/results/page.tsx:70-73`.
2. Fix Soul-Audit **result cards** (hero/chips/day-count) — `OptionCard.tsx:33-38`.
3. Match `soul-audit/results/loading.tsx` **skeleton** to stacked layout.
4. Wire or delete 0-import orphans: `GuestSignupGate`, `WalkthroughModal`, `SeriesSearchPanel`, `SeriesHero`, `MixedHeadline`, `NetworkStatusBanner`, `DevotionalMilestoneReveal`.
5. Resolve **two-reader** ambiguity (`/soul-audit/plan/[planToken]` vs `/daily-bread`) and **two devotional silos** self-canonical URLs (`devotional/[slug]/page.tsx:56`).
6. Fix `/saved` **mis-routing** to `/wake-up/devotional/*` — `SavedList.tsx:153`.
7. Unify **`GET MATCHED` vs `Continue`** + kill "from our library" false claim; reconcile **"32 plans" vs "65 series"** copy.
8. Re-enable reader **SSR** (fix `too-busy-for-god-day-6` serialization) — `DevotionalPageClient.tsx:100`.
9. Fix session-cookie misspelling `euongelion_session` — `session.lib:5` (low-risk, schedule carefully — it's a live key).

### P1 — systemic coherence (makes it "a designed app")

10. **Platform-adaptive nav** — mobile bottom tab bar + distinct mobile top bar + bespoke desktop masthead (Part 1, `SA-NEW-1`, `F-NEW-a`).
11. **In-reader "Aa" sheet** — curated named themes (Apple Books model).
12. **Consolidate Library** to the 7-tab rail; retire `/saved` + `/clippings` as standalone.
13. **Signed-in "Today" home** distinct from the marketing landing.
14. **Reminder scheduler** — one time-window picker in-voice ("one quiet word each morning", Waking Up "Moment").
15. **Global search** entry (or remove advertised SearchAction).
16. **PWA install prompt** post-session.
17. **Settings** → grouped cards + light profile header; stop exposing "when this ships" UI.

### P2 — state completeness & signature polish (last 10%)

18. **Every empty state** → illustration + one sentence + one CTA (use the riso library).
19. **Completion beat** (Part 5A).
20. **Gentle presence indicator** (Part 5B).
21. **Series/plan detail tabs** (Sessions · About · Voices · Artwork — Waking Up).
22. **"Why this recommendation"** row on matched series (Headspace).
23. **Motion/haptics/safe-area pass** — one easing + duration scale; native sheets; haptics on key actions.
24. **Loading**: replace all mismatched skeletons with layout-accurate ones.

---

## Part 8 — Design principles to adopt (mapped to brand)

1. Front-load the "why," not the "what" (Superpower/Wanderlog/Calm).
2. Make the reveal a room, not a list (Calm/Yazio/Zero) — extend the edition-press reverence backward into results.
3. Keep the destination in the frame (persistent tab bar) — "site" → "app."
4. One-tap comfort where you read (Apple Books) — sacred minimalism = _curated_ controls, not hidden ones.
5. Design the zero state (Pinterest/Skyscanner) — as considered as the full state.
6. Reduce, don't remove, friction (Linear code entry; Finch gentle opt-in).
7. Momentum without guilt (Open-quiet, never Duolingo-loud) — `SA-NEW-2`.

**Cross-cutting:** unify motion (one easing/duration scale); unify icon set + stroke weight; layout-accurate skeletons everywhere; one verb per action + one source-of-truth series count.

---

## Part 9 — Reference index (all Mobbin links, grouped)

**Quiz / Soul Audit:** [Superpower](https://mobbin.com/flows/48c850ab-006f-4536-a9bc-1d4033c46c9c) · [Calm Sleep](https://mobbin.com/flows/6057bb13-1765-48cc-8cfa-09b0ef8e7107) · [Lifesum](https://mobbin.com/flows/a6a50688-4d91-4ab0-89ee-177e2e4dda1b) · [Wanderlog](https://mobbin.com/flows/43df4d6b-29ef-484e-98bc-2164e5c193b7) · [Nibble](https://mobbin.com/flows/2959b3ec-3a19-475e-82b4-47762857b3a4)
**Results reveal:** [Yazio](https://mobbin.com/screens/ac726564-f4c4-40fb-9f25-916c59cc2cec) · [Zero](https://mobbin.com/screens/16230d4b-041b-4b5b-b32d-65bb40e09c3d) · [Speak](https://mobbin.com/screens/3cd41ab3-d05b-405b-b1f3-959f63466380) · [Cal AI](https://mobbin.com/screens/7294b9e4-76ae-4d49-af18-bfb3d8a2566a) · [Fabulous](https://mobbin.com/screens/f1988f02-7e1c-46c1-843d-310520173654) · [Liven](https://mobbin.com/screens/40365966-8d27-4646-b11a-feeea1c408a7) · [Dimensional](https://mobbin.com/screens/afda5327-e53e-4934-86e3-3f2d58fcdf27)
**Sign-up / auth / onboarding:** [Linear](https://mobbin.com/flows/6f22cfdb-1ff0-4b28-9149-375845525dc6) · [Todoist](https://mobbin.com/flows/9910ff65-57e3-4946-aad3-d032a01f5d71) · [Mindvalley acct](https://mobbin.com/flows/d8840e33-eabe-4de6-8c00-e397e6348630) · [Mindvalley goals](https://mobbin.com/flows/05c98b08-418d-4892-afe4-bdefdafb627e) · [Manus](https://mobbin.com/flows/37df2269-39f5-44f6-a607-d8792d72f8ca) · [Trip.com](https://mobbin.com/flows/cbc2d4e8-2cb8-4a31-9b8d-4b8ef5012f0b) · [Blinkist](https://mobbin.com/flows/a9e95e3d-961b-422b-b217-d3fe6fe34e0f) · [Liven](https://mobbin.com/flows/ba9958ef-dd21-4a03-9ba1-2e5a3f5b51e3) · [Finch goals](https://mobbin.com/flows/19212698-61fe-43ca-9144-60c9e73bbcd2) · [stoic.](https://mobbin.com/flows/948a7285-9f2f-46d1-8d82-32da2d4ce828) · [QUITTR](https://mobbin.com/flows/f7e0531f-a3ea-48a2-8977-890d456ca5b2)
**Home / tab bar:** [Calm](https://mobbin.com/flows/ad4abb1e-008d-4e25-924e-0c709e9eda0b) · [Headspace](https://mobbin.com/flows/0a0b3e16-5b9a-463d-a9bb-101afcde88f4) · [Mindvalley](https://mobbin.com/flows/f777025d-9856-4dae-b7eb-a41015bbf91d) · [Ten Percent Happier](https://mobbin.com/flows/39222e80-0e05-4775-9d7a-e274707ec2bd) · [Open](https://mobbin.com/flows/e28936b2-4a7a-4d0f-92e3-50243da9ac78)
**Reminders:** [Waking Up](https://mobbin.com/flows/1a4d2535-c453-4fc2-b630-d23f4e203b71) · [stoic.](https://mobbin.com/flows/948a7285-9f2f-46d1-8d82-32da2d4ce828) · [CapWords](https://mobbin.com/flows/9de5ff09-f827-4c5b-9b22-21a290cef6bf) · [Finimize](https://mobbin.com/flows/d973a051-68bc-4aaf-b079-849c41942c62) · [Finch](https://mobbin.com/flows/e42398a2-8533-456c-ae25-eccac28f5de3) · [Pi](https://mobbin.com/flows/0bad93b4-2f33-4aae-b08f-db0849160fe0)
**Completion / momentum:** [Headspace](https://mobbin.com/screens/256eda8c-cb68-4751-a846-8b0d91383f0c) · [Finch](https://mobbin.com/screens/4bae1a7b-6d74-4a1c-ac18-3503cd56a616) · [Numo](https://mobbin.com/screens/6bd56122-0f37-4c7c-a21b-9bfb35dd4cca) · [Duolingo](https://mobbin.com/screens/1ba25802-c732-4774-8127-ca7029902f46) · [Bears Gratitude](https://mobbin.com/flows/80a1e5d4-4bfe-454b-bfa8-195349cd32ee) · [Moonly](https://mobbin.com/flows/6ebb9a2c-4a80-4d42-8665-f3c058172f11) · [Fable](https://mobbin.com/flows/2975f9fa-1de6-40e4-bad3-267dbf72fb2a)
**Reader typography:** [Apple Books presets](https://mobbin.com/screens/8b5ec05b-943e-4e1d-83b3-d38376a4cee1) · [Apple Books sheet](https://mobbin.com/screens/82e2f758-a4ad-48de-9240-afea672d073c) · [Fable](https://mobbin.com/screens/a4cf1517-abf8-4a19-b375-2d4622b1c744) · [The Athletic](https://mobbin.com/screens/1c2cc1da-9ff7-4fe3-9b4d-2eb063457669) · [Matter](https://mobbin.com/screens/46ae7a5c-be0f-4708-b606-dd8d2031e156) · [Blinkist](https://mobbin.com/screens/7977903e-093b-4265-85ff-4e26d252e55e)
**Series/course detail:** [Waking Up](https://mobbin.com/screens/71c46d25-771d-4184-aa8c-c14c7653e329) · [Open](https://mobbin.com/screens/30b9ad92-c0cb-486f-a441-5b7f9f7fc407) · [Insight Timer](https://mobbin.com/screens/c249ec8a-2eb6-4639-b9f1-5fc147ef8b06) · [Headspace "why recommendation"](https://mobbin.com/screens/4fc8b114-8f88-4eb5-8bf2-dff295abeb66) · [Mindvalley](https://mobbin.com/screens/92f5fc52-cced-4648-9caf-a1bf3226f894)
**Settings/profile:** [Claude](https://mobbin.com/screens/65fc8cd8-a8e4-47a3-8d7f-9c35f3e0a072) · [Cosmos](https://mobbin.com/screens/d40a9283-9bde-4f0b-93d0-2c01f818b914) · [Fixtured](https://mobbin.com/screens/8bba7ebd-01d9-41b4-b70b-7dbd69a3923b) · [Tiimo](https://mobbin.com/screens/86a6704a-2235-4bb4-b1ac-bbaf383a60dc) · [Finimize](https://mobbin.com/screens/60efec7f-30fa-43ab-a3db-26d2cb6a9d9b)
**Empty states:** [Pinterest](https://mobbin.com/screens/ff7cf79a-ce28-4dd9-bc19-d1278befad72) · [Skyscanner](https://mobbin.com/screens/01d01a3b-bf60-48ae-b21d-0827e37eda6f) · [OpenTable](https://mobbin.com/screens/30875928-c58f-4a84-894c-17ec717f4587) · [Lex](https://mobbin.com/screens/15181740-6713-4946-b348-777d27483d2f) · [ElevenReader](https://mobbin.com/screens/b82ee6d1-960d-4a40-b68f-a246a4892fbe)

---

## Part 10 — Suggested execution sequence + spine follow-ups

**Sprint A — correctness:** P0 #1–9 (nothing new ships until dead code/broken reveals are resolved).
**Sprint B — coherence:** platform-adaptive nav (#10), in-reader Aa (#11), Library consolidation (#12), signed-in Today home (#13).
**Sprint C — completeness:** reminders (#14), search (#15), install prompt (#16), Settings restructure (#17).
**Sprint D — signature polish:** empty states (#18), completion beat (#19), presence indicator (#20), detail tabs (#21), "why matched" (#22), motion/haptics (#23), skeletons (#24).

**Spine follow-ups for the execution session:** assign real IDs for `SA-NEW-1` (platform IA), `SA-NEW-2` (momentum hybrid); create `F-NEW-a…d` PRDs (+ any per-P1 workstream) and register them; update `PRODUCTION-FEATURE-SCORECARD.md` / `PRODUCTION-10-10-PLAN.md` from Part 6; reconcile Part 1 with `APP-VS-WEB-APP.md` + `M04`; log in `CHANGELOG.md`. Verify everything in the Workers runtime (`npm run preview` + curl), not build output — per project Dev Rule #9/#10.
