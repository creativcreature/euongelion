# Reading Experience Audit — Interactivity, Imagery, Motion & Video

**Date:** 2026-06-07
**Auditor:** Cowork session (no code changed — diagnosis only)
**Canonical surface:** Daily Bread (`DailyBreadView`) — with Wake-Up reader (`DevotionalPageClient`) as secondary
**Founder self-rating:** 4–6 / 10 · **Target:** 10 / 10, awwwards-worthy
**Scope of asks:** contextual imagery/art · in-read interactive activities · cinematic scroll/motion · contextual video

---

## TL;DR

You feel the reading is a 4–6 because **the surface you consider canonical (Daily Bread) is a plain markdown-to-HTML text renderer with no slots for media, interactivity, or motion.** The engaging machinery you remember building — 25 module types, games, a motion toolkit, visual-meditation modules — is real, but it lives in a _different_ reader (Wake-Up) and is _itself_ almost entirely unused even there. Nothing binds imagery, video, or activities to the specific words on the page in either pipeline.

In one line: **the product is documented at 9/10 and shipped at 4/10, and the two readers are two different products.**

The single most important correction to your mental model: **Daily Bread and Wake-Up do NOT share a reading system.** They are two parallel pipelines with different content shapes and different renderers. Anything we add to one does not appear in the other unless we deliberately unify them.

---

## Scorecard (canonical surface = Daily Bread)

| Dimension                      | Score       | Why                                                                                                                                                                                                                           |
| ------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reading typography & craft     | 7 / 10      | Genuine strength — serif voice, chiastic A–B–C–B'–A' structure, Hebrew/Greek word study, endnotes. This is the part that already feels considered.                                                                            |
| Contextual imagery / art       | 1 / 10      | Zero images render in Daily Bread. Across all 547 devotional files only 49 carry any image field, and the "art"/"visual" modules don't even output an `<img>` (see Finding 3).                                                |
| In-read interactive activities | 2 / 10      | Daily Bread's "interactive element" is a single text block with a label. The real activities (Match, Order, Reveal, breath-prayer) are built but used **0–1 times** in content and aren't in the Daily Bread pipeline at all. |
| Cinematic scroll / motion      | 2 / 10      | Daily Bread uses **zero** motion. A full motion toolkit exists (FadeIn, ParallaxLayer, TextReveal, StaggerGrid, DropCap, GoldHighlight, ScrollProgress) — but only the Wake-Up reader imports it.                             |
| Video / motion media           | 0 / 10      | 15 devotionals carry a YouTube `videoId`; **no reader renders it.** Only an admin allowlist screen references video. 100% orphaned data.                                                                                      |
| **Overall reading experience** | **~4 / 10** | Strong words, no world around the words.                                                                                                                                                                                      |

---

## The five findings, with evidence

### Finding 1 — Two readers, two systems (the root cause)

There is no shared reading engine. There are two:

- **Daily Bread (`src/components/daily-bread/DailyBreadView.tsx`, 740 lines)** — the canonical surface. It receives a flat `DayContent` object and renders fixed fields (`hookA`, `textB`, `centerC`, `christConnectionBPrime`, `returnAPrime`, `prayer`, `interactiveElement.content`, `scriptureText`, `hebrewGreekStudy`, `reflectionQuestions`) by running each through `marked.parse()` and injecting the HTML with `dangerouslySetInnerHTML`. It imports **no** module components, **no** motion components, **no** image component.
- **Wake-Up reader (`src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`, 679 lines)** — imports `ModuleRenderer` and _does_ drive the 25-module system, and _does_ use the motion components.

`DayContent` (the Daily Bread content contract, `src/types/soul-audit-plan.ts`) has **no field** for an image, a video, an artwork, or a structured activity. `interactiveElement` is literally `{ type: string; content: string }` — a label and a paragraph. So even with perfect content, Daily Bread has nowhere to _put_ media or an activity. This is a contract problem, not a styling problem.

**Implication:** "make Daily Bread a 10" is partly a _data-model_ task (give `DayContent` real media/activity slots), not only a UI task.

### Finding 2 — The rich module system is built but unused

`ModuleRenderer` supports 25 types. Actual usage across 547 devotional JSON files:

```
teaching 260 · scripture 174 · vocab 150 · prayer 149 · reflection 135
takeaway 131 · story 129 · insight 127 · bridge 124 · comprehension 115
resource 101 · profile 86 · hero-card 56 · inline-image 14 · journey 14
cta 14 · interactive 1 · match 0 · order 0 · reveal 0 · visual 0
voice 0 · art 0 · chronology 0 · geography 0
```

Every module that would make reading feel _active_ — `match`, `order`, `reveal`, `interactive`, `visual`, `voice`, `art`, `chronology`, `geography` — is used **0 or 1 times.** The content pipeline only ever emits ~13 prose modules. The engaging 12 were coded and then never authored into content.

### Finding 3 — Even the "visual" modules aren't visual

This is the quiet killer. When art/visual _was_ intended, the components still don't show an image:

- `ArtModule.tsx` renders the artwork's **title and artist as text** — there is no `<img>` tag in it at all.
- `VisualModule.tsx` only renders an image if `imageUrl` is present, and it almost never is; otherwise it shows a caption and a prose meditation.
- `InlineImageModule` (the one component that does show an image) is used 14 times in 547 files.

So "visual meditation" today is _text about an image that isn't there._ That is a large part of why it doesn't feel awwwards-level — the visual layer is implied, not present.

### Finding 4 — Video is fully orphaned

15 devotionals carry `"videoId": "<youtube id>"`. The only code that references video is the **admin YouTube allowlist** page and the admin shell. No reader — neither Daily Bread nor Wake-Up — embeds or plays anything. The data exists, the governance UI exists, the playback does not.

### Finding 5 — A real motion toolkit exists, mostly on the bench

`src/components/motion/` contains `FadeIn`, `ParallaxLayer`, `TextReveal`, `StaggerGrid`, `DropCap`, `GoldHighlight`, plus `EditorialMotionSystem` and `ScrollProgress`. Your `ANIMATION-PRINCIPLES.md` describes exactly the "enter a quiet room," incense-smoke pacing you're after. But the canonical reader (Daily Bread) imports none of it. The craft is written down and partly built; it just isn't on the page you care about.

---

### Finding 6 — Thousands of generated images exist; ~97% are ignored, and the rest never reach Daily Bread

This is the big one, and it changes the imagery picture. There are **6,755 image files in `public/`** — roughly **5,186** of them in the `generated-2026-05-04*` batches. Almost none are in use.

**Where they went:**

- **Only 134 images were ever promoted** into the live set (`public/images/site/devotional/`). The auto-generated map `src/data/site-devotional-art.ts` (`SITE_DEVOTIONAL_ART`) binds **175 devotional slugs** to those 134 images.
- The other ~5,000 sit unreferenced in dated batch folders, with heavy **redundancy across ~8 GCP/Vertex regions** (`poster-us-east4`, `poster-us-west1`, `poster-us-central1`, `poster-europe-west4`, `poster-asia-southeast1`, …) and tiers (`std`, `ultra`, `imagen3`), plus **614 explicitly quarantined** in `_DISCARD_photographic_too_realistic/`. They were generated, never curated/deduped, never catalogued into the live map. (The image-library catalog/index that would do this only exists inside abandoned `.claude/worktrees/…`, not in the main tree.)

**Why even the promoted 134 don't help the canonical surface:**

1. **Wake-Up _does_ use them.** `DevotionalPageClient` reads `SITE_DEVOTIONAL_ART[slug]`, runs `calculateInsertionPoints()`, and inserts `DevotionalArtwork` (real `next/image`, lazy-loaded, with lightbox + attribution) _between content sections._ So the inline-art system is genuinely built and working — **on Wake-Up only.** (This revises the imagery score upward for Wake-Up specifically; see note below.)
2. **Daily Bread imports none of it** — zero art imports in `DailyBreadView` (confirmed).
3. **Key mismatch makes the map unreachable from Daily Bread.** `SITE_DEVOTIONAL_ART` is keyed by static devotional **slug** (`abiding-in-his-presence-day-1`). Daily Bread content is **AI-generated per plan** by `api/soul-audit/generate-day` into a `DayContent` object that has **no slug binding to the art library, no artwork field, and the generator never assigns an image.** There is literally no key to look an image up by and nowhere to put it.
4. **Coverage gap even on Wake-Up:** 175 slugs are mapped, but there are 547 devotional JSON files — so ~370 devotionals fall back to legacy prints or nothing.

**So "why are thousands of images ignored" has four stacked causes:** a _promotion/curation bottleneck_ (134 of ~5,000 ever selected), a _surface gap_ (promoted art only renders on Wake-Up), a _key/contract mismatch_ (Daily Bread plans can't address the library), and a _coverage gap_ (most devotionals unmapped). The assets are paid for and sitting on disk; the pipeline that connects them to the canonical reader was never built.

> **Score revision:** Contextual imagery is **~6/10 on Wake-Up** (real inline art + lightbox, limited to 134 images / 175 slugs) but stays **1/10 on canonical Daily Bread.** The earlier "Art/Visual modules render no `<img>`" point still holds for the _module_ path, but the primary art path is the `DevotionalArtwork` insertion system, which does render real images — just not where you're looking.

---

## Why it doesn't feel as good as you want — the honest synthesis

You're not imagining the gap, and it isn't a taste problem. Three things compound:

1. **The words have no world around them.** Reading is pure text with category labels in gold. There's no contextual image when a passage names a place, no artwork when it evokes one, no motion to pace a reveal, no moment where you _do_ something. The chiastic structure is good writing but it reads like a beautiful article, not an experience.
2. **Your best components are pointed at the wrong reader.** The modules, motion, and (intended) media were built for Wake-Up; Daily Bread — the surface you'd show someone — can't use any of them.
3. **Contextual binding doesn't exist anywhere.** Even Wake-Up never ties a specific image/video/activity to a specific clause. "Contextual and relevant to the words on the page" is the actual bar, and there is no mechanism for it today. Awwwards-level reading is _authored_, not auto-decorated.

10/10 isn't "add a hero image." It's: media and interaction that are _placed against specific lines_, paced by scroll, and consistent across both readers.

---

## Layout, information architecture & flow critique

You're right that there are poor structural choices. They cluster into three problems: the canonical reader is the _weaker_ layout, the personalized journey dumps users into it, and there are too many parallel reading surfaces.

### A. The canonical reader (Daily Bread) is under-built vs. Wake-Up

Same pattern as imagery/motion — the surface you care about has the thinner layout. Concretely:

| Element                    | Wake-Up reader              | Daily Bread (canonical) |
| -------------------------- | --------------------------- | ----------------------- |
| Container                  | `max-w-6xl` editorial shell | `max-w-2xl`, plain      |
| Breadcrumbs / "where am I" | Yes (`Breadcrumbs`)         | **None**                |
| Scroll progress            | Yes (`ScrollProgress`)      | **None**                |
| Reading-progress timeline  | Yes (`ReaderTimeline`)      | **None**                |
| Prev/next day              | **Real links**              | **Dead text** (see B)   |
| Inline art                 | Yes                         | None                    |
| Motion                     | Yes                         | None                    |

### B. Specific on-page element/link problems in Daily Bread

1. **The prev/next "links" are not links.** At the bottom of every day, `backwardLink`/`forwardLink` render as muted `<p>` text — "Previously: …" / "Coming next: …". They _describe_ navigation but you can't click them. Every day **dead-ends.**
2. **No forward path after completion.** Completing a day shows "Return tomorrow for the next day" — there's no in-session "continue / next day" affordance even when the next day is unlocked.
3. **Mark-complete does a full `window.location.reload()`.** Loses scroll position, kills any motion, and is slow on Workers. Should be a client state update.
4. **Depth toggle is in the wrong place.** The Daily Bread / Go Deeper / Deep Dive (5 / 15 / 45 min) tier selector sits _above the article_, forcing a depth decision before the user has read a word — cognitive load at the worst moment. Switching tiers re-renders the whole article in place with no transition, and the three tiers largely re-present the same material, which can feel repetitive rather than progressive.
5. **Monotone hierarchy / low contrast.** Body copy is `text-secondary` and nearly every section uses the _same_ tiny gold all-caps `text-label` (SCRIPTURE, REFLECT, PRAYER…). There's no typographic differentiation or rhythm between a scripture block, teaching, and a prayer — they all read at one volume. Body text in a secondary color also weakens legibility against your own dark-mode contrast goals.
6. **Raw markdown injection.** Every block is `dangerouslySetInnerHTML` from `marked` output — so none of the design-system refinements (drop caps, pull quotes, scripture styling) defined in your docs are applied here. It's unstyled prose.
7. **Reflection is inert.** The metacognition moment renders as a plain muted `<ul>` — no journaling input, no save, no interaction, despite being where engagement should peak.
8. **Day chips don't scale.** The wrapping number-chip selector is fine for a 7-day plan but becomes an unwieldy grid for long plans (e.g. Bible-365).

### C. Flow logic is inverted, and surfaces are duplicated

- **Inverted journey:** Soul Audit → generated plan → **Daily Bread (the sparse reader).** Browse → Series → **Wake-Up (the rich reader).** So your _personalized centerpiece_ lands users in the weaker experience, while casual browsing gets the better one. That's backwards.
- **Duplicated IA:** there are parallel routes for the same job — `/series/[slug]` **and** `/wake-up/series/[slug]`; `/devotional/[slug]` **and** `/wake-up/devotional/[slug]`; plus `/daily-bread`, `/my-devotional`, and `/soul-audit/plan/[planToken]`. The same content is reachable by ≥3 paths with different layouts and different capabilities. That's confusing to navigate, doubles maintenance, and is why "the reader" feels inconsistent — there isn't one reader.
- **Series page itself is solid** (`SeriesPageClient`): hero grid, "{n}-day journey," day cards with scripture reference + snippet + READ NOW/READ AGAIN/LOCKED status. The problem isn't the series page — it's that it feeds a _different_ reader than the personalized path does.

### Layout/flow scores

| Dimension                              | Score  |
| -------------------------------------- | ------ |
| Daily Bread reader layout & hierarchy  | 3 / 10 |
| Daily Bread in-page navigation / links | 2 / 10 |
| Wake-Up reader layout                  | 7 / 10 |
| Series page layout                     | 7 / 10 |
| Cross-surface IA / flow coherence      | 3 / 10 |

**The throughline:** these aren't ten unrelated bugs — they're one root cause again. You have **two readers**, the personalized flow uses the weaker one, and nothing was unified. Fixing the flow inversion and collapsing the duplicate surfaces is higher leverage than any single layout tweak.

---

## Daily Bread activation, identity, saving, stickies & chat — system deep-dive

You said Daily Bread "seems broken." It is — and tracing it end to end shows the breakage isn't one bug, it's an architecture where activation, identity, and saving don't share a model, and where the _same plan content_ is rendered by three different readers of unequal capability.

### How activation actually works (and where it breaks)

The only path that populates `/daily-bread` is: **Soul Audit → `/api/soul-audit/select` → inserts a row in `devotional_plan_instances` with `status:'active'`, keyed by the `euangelion_audit_session` cookie.** `/daily-bread` then calls `fetchActivePlan(sessionToken)` which queries `status='active'` for that session, `.limit(1).single()`.

Concrete bugs in that chain:

1. **Stale active plans accumulate (corrected from an earlier draft).** `select` never deactivates a prior active plan, so a session can hold several `status='active'` rows over time. `fetchActivePlan` uses `.limit(1).single()` — note `.limit(1)` caps the result _before_ `.single()`, so this does **not** throw on multiple rows; it returns the newest by `created_at`. So this is a **data-hygiene bug, not a hard crash**: stale plans pile up and, in edge cases (clock skew, re-activation ordering), the wrong plan can surface. Fixed in tranche 1 by archiving prior active plans on new activation.
2. **Browsing a series never populates Daily Bread.** "READ NOW" on a series goes to the Wake-Up reader and writes localStorage progress — it does **not** create a `devotional_plan_instance`. So "I activated a devotional, why isn't it in Daily Bread?" is by-design: only the Soul Audit flow creates an active plan. There is no "add this series to Daily Bread" action anywhere.
3. **Identity is cookie-only.** Plans bind to an anonymous session cookie. Clear cookies / switch device / lose the cookie and the active plan is **orphaned** — there's no account binding unless the user separately signs in, and the reading flow never requires it.
4. **The empty state is correct but ambiguous.** `EmptyState` does prompt ("Take the Soul Audit" / "Browse series") — good — but because bug #1 and #3 also dump users here, an empty screen can mean _no plan_, _cookie lost_, or _multiple-active error_. Same dead-end for three very different states.

### The same plan has three readers of unequal power

| Route                          | Component               | Art | Motion    | Stickies | Chat | Timeline/Progress |
| ------------------------------ | ----------------------- | --- | --------- | -------- | ---- | ----------------- |
| `/daily-bread` (canonical)     | `DailyBreadView`        | ❌  | ❌        | ❌       | ❌   | ❌                |
| `/soul-audit/plan/[planToken]` | `soul-audit/DayContent` | ~   | ✅ FadeIn | ✅       | ✅   | ✅                |
| `/wake-up/devotional/[slug]`   | `DevotionalPageClient`  | ✅  | ✅        | ✅       | ✅   | ✅                |

The personalized plan is viewable at **both** `/daily-bread` and `/soul-audit/plan/[planToken]`, and the canonical one (`/daily-bread`) is the **only** one with no stickies, no chat, no motion, no art. So the features you asked about _exist_ — they're just absent from the surface you consider home. This is the duplication problem from the layout critique, now with receipts.

### Sticky notes

`DevotionalStickiesLayer` (drag-positioned notes, persisted via `/api/annotations`) renders **only** in the Wake-Up reader and the soul-audit `DayContent` — **not in `DailyBreadView`.** So on the canonical surface, sticky notes don't exist. Where they do exist, they're a free-floating drag layer (absolute x/y), which on mobile and across reflow is fragile — notes can detach from the text they annotate.

### Chat

`DevotionalChat` (backed by `chatStore`, supports favoriting messages) also renders **only** in Wake-Up + soul-audit `DayContent`, **not** in Daily Bread. So contextual chat is missing from the canonical reader, and where present it's a separate store from annotations and bookmarks — a third, unconnected memory of the user's engagement.

### Saving / managing saved content

This is the most broken of all:

1. **Save requires sign-in; reading doesn't.** `/api/bookmarks` POST calls `getUser()` and returns `401 AUTH_REQUIRED_SAVE_STATE` for anonymous users — but the entire Daily Bread / Soul Audit flow is **anonymous session-cookie based.** So the default user literally **cannot save** without hitting an auth wall the rest of the app never imposed. The storage layer is keyed by `session_token` (anonymous-capable), so the auth gate is an inconsistency, not a storage limit.
2. **No home for saved content.** There is **no `/saved` or `/library` route.** `my-devotional` just redirects to `/daily-bread`. Saved/bookmarked items have nowhere to be browsed or managed.
3. **At least three disconnected "save"-like concepts:** server `bookmarks` (auth-gated, by slug), soul-audit `SavedPaths` (session, `SavedPathsList`), and localStorage `isRead`/started-series progress. Plus `DevotionalLibraryRail` appears defined but unused. There is no single "my content" model, so "managing saved content" has no coherent surface to manage.

### Net diagnosis

Daily Bread isn't one broken feature — it's the seam where four separate systems (plan activation, anonymous-vs-auth identity, three readers, and three save concepts) fail to meet. Patching the `.single()` bug alone would stop the hard crash but leave the experience fragmented. The real fix is to converge on **one reader, one plan/identity model, and one "my content" concept** — then everything else (art, motion, stickies, chat, saving) hangs off that single spine.

---

## Recommendations — ranked, each with an ideal and a budget version

Constraint posture per your instruction: each item shows the awwwards-level **Ideal** and a Cloudflare-free-tier / LCP-safe **Budget** version.

### P0 — Unify the reading contract (unlocks everything else)

The blocker behind all four asks. Until `DayContent` (and the module schema) can carry placed media + activities, no amount of UI work reaches the canonical surface.

- **Ideal:** One shared reading engine. `DayContent` sections become an ordered list of typed blocks (prose, scripture, image, artwork, video, activity, pause) each with an optional `anchor` (the clause/word it attaches to) and `placement` (inline / full-bleed / margin). Daily Bread and Wake-Up both render the same block list.
- **Budget:** Don't rebuild — _extend_. Add optional `media[]` and `activity[]` arrays to `DayContent` keyed to section name (e.g. `centerC`). Daily Bread renders them after the matching section. Same content shape, additive, no migration risk.

### P1 — Contextual imagery/art (you already own the assets — connect them, don't regenerate)

**Reframed after Finding 6: you do not have an image-generation problem, you have an image-_activation_ problem.** ~5,000 generated images exist; 134 are wired into Wake-Up; Daily Bread sees none.

- **Ideal:** Each devotional ships 2–4 images bound to specific lines — full-bleed chiaroscuro hero at the Center (C), an inline object/hands image at the Bridge, a manuscript/word-art card at the Hebrew/Greek study. Art-directed per `IMAGE-STRATEGY.md`. Reach this by (a) **curating the existing batches** into the live library so coverage goes from 175 → all 547 slugs, then (b) porting the `DevotionalArtwork` insertion system onto Daily Bread.
- **Budget — three concrete steps, no new generation:**
  1. **Bridge the contract (depends on P0):** have `generate-day` stamp each `DayContent` with the matching `seriesSlug`/`day` and resolve `SITE_DEVOTIONAL_ART[slug]` server-side, attaching 1–2 `ArtworkEntry` objects to the day. Now Daily Bread _has_ a key and a payload.
  2. **Reuse the renderer:** import `DevotionalArtwork` + `calculateInsertionPoints` into `DailyBreadView` (the exact code Wake-Up already runs) and insert art between sections. This is a port, not a build.
  3. **Curate the backlog:** run a one-time pass to dedupe the regional/tier duplicates, drop `_DISCARD_*`, and extend `site-devotional-art.ts` from 175 → 547 slugs from the assets already on disk. This is the single highest-leverage move — it converts thousands of dormant paid assets into live contextual art across both readers.
  - Net effect: imagery jumps from **1 → ~6 on Daily Bread** with _zero_ generation spend, just curation + a renderer port.

### P2 — Activate in-read interactive activities (already built — just author + wire them)

- **Ideal:** Every day has 1–2 placed activities chosen to fit the content: `Reveal` for PaRDeS layers, `Match` for Hebrew word↔meaning, `Order` for narrative sequence, breath-prayer at the prayer. They sit _inside_ the read at the right beat, not in a separate quiz tab.
- **Budget:** Wire the existing `Match`/`Order`/`Reveal`/`Interactive` components into the Daily Bread pipeline and author the activity payloads for the highest-traffic series first (Genesis/launch set). The components work today; this is content + a render slot, not new engineering.

### P3 — Cinematic scroll/motion on the canonical reader

- **Ideal:** Scroll-driven pacing — `TextReveal` on section entry, `DropCap` + `GoldHighlight` on the opening line, `ParallaxLayer` behind the full-bleed Center image, `ScrollProgress` as a thin gold thread. Tuned to the incense-smoke timings in `ANIMATION-PRINCIPLES.md`, all gated by `prefers-reduced-motion`.
- **Budget:** Import the three you already own — `FadeIn`, `TextReveal`, `ScrollProgress` — into `DailyBreadView` and apply on section reveal only. Pure CSS/IntersectionObserver, ~zero payload cost, reduced-motion respected. Biggest felt-quality gain per hour of work.

### P4 — Contextual video / motion media

- **Ideal:** Short (20–60s) silent, looping motion pieces — a candle guttering, water over stone, ink on vellum — placed at the Center or Bridge, self-hosted as muted autoplay WebM/MP4, captioned. Optional longer teaching video as an opt-in "Go Deeper" expansion so it never blocks LCP.
- **Budget:** Render the orphaned YouTube `videoId`s in a lazy, click-to-load facade (poster image until tapped) in a "Watch" expansion below the read — zero cost to initial load, and it finally surfaces data you already have. Generate 3–5 ambient loops with your AI video tooling for the flagship series only.

---

## Suggested sequencing

1. **P0 contract extension (budget)** — additive `media[]`/`activity[]` on `DayContent` + stamp `seriesSlug`/`day` in `generate-day`. Unblocks everything; gives Daily Bread a key into the art library.
2. **P1 imagery activation (budget)** — port `DevotionalArtwork` + `calculateInsertionPoints` to Daily Bread and resolve the existing `SITE_DEVOTIONAL_ART` map server-side. **Do this early — it lights up assets you've already paid for and is the biggest felt jump per hour.**
3. **P3 motion (budget)** — import the 3 existing motion components into Daily Bread; near-zero payload.
4. **Curation pass** — dedupe regional/tier batches, drop `_DISCARD_*`, extend the art map 175 → 547 slugs from on-disk assets.
5. **P2 activities** — wire and author Reveal/Match for the launch series.
6. **P4 video** — lazy facade for existing YouTube IDs; ambient loops for flagship.

Re-rate after P0–P3 land on the launch series; the realistic jump is 4 → 7–8 on canonical Daily Bread, with 9–10 reachable on the flagship series once imagery + activities are authored against specific lines.

---

## Appendix — files referenced

- `src/components/daily-bread/DailyBreadView.tsx` — canonical reader (markdown→HTML, no media/motion)
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx` — Wake-Up reader (uses ModuleRenderer + motion)
- `src/components/ModuleRenderer.tsx` — 25-type module switch
- `src/components/modules/{Art,Visual,InlineImage,Match,Order,Reveal,Interactive,Voice}Module.tsx`
- `src/components/motion/*` + `EditorialMotionSystem.tsx`, `ScrollProgress.tsx`
- `src/types/soul-audit-plan.ts` — `DayContent` / `InteractiveElement` contracts
- `public/devotionals/*.json` — 547 files; module-usage counts above
- Vision docs: `docs/LEARN-YOUR-WAY-INSIGHTS.md`, `docs/CONTENT-STRUCTURE-OPTIMIZATION.md`, `docs/IMAGE-STRATEGY.md`, `docs/ANIMATION-PRINCIPLES.md`
