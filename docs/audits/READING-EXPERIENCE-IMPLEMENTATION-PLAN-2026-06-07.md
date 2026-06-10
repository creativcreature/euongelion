# Reading Experience — Implementation Plan (for approval)

**Date:** 2026-06-07
**Status:** AWAITING FOUNDER APPROVAL — no code changed yet
**Companion to:** `docs/audits/READING-EXPERIENCE-AUDIT-2026-06-07.md`
**Canonical surface:** Daily Bread (`DailyBreadView`); Wake-Up reader benefits where shared.

---

## Guardrails I will follow (from CLAUDE.md)

- No silent fallbacks; a broken feature looks broken, not hidden.
- I will **not** deploy. I implement, run local verification, show you results; you deploy.
- Before creating any new file, script, or generated index, I stop and get your explicit OK (Phase 3 gate).
- I update `CHANGELOG.md` + relevant tracking docs per change.
- Verification means the Workers runtime / actual render, not just a green build.

---

## Key de-risking finding

Activating imagery on Daily Bread does **not** require the P0 `DayContent` contract change. A plan already carries a real `series_slug`, and `DailyBreadView` already receives the plan, so the existing art map can be resolved client-side as `SITE_DEVOTIONAL_ART[\`${series_slug}-day-${dayNumber}\`]`. This means the biggest visible win (turning on the art you already own) is **additive and low-risk**, and is sequenced first.

---

## ⚠️ Revision (2026-06-07): imagery must be EXACT, not heuristic

Founder directive: _"Imagery has to be exact and specific and not just random images."_ Investigation of the existing pipeline confirms the current map fails this bar and must NOT be activated as-is:

- `scripts/build-devotional-art-mapping.mjs` matches purely on **filename-keyword overlap**, then **force-fills every slot via a least-used round-robin even when no keyword matches** — i.e. arbitrary assignment by design.
- All 350 entries in `site-devotional-art.ts` have `relevance: ""` — no stored rationale for any pairing.
- A prior "single-ink only" curation rule **excluded the genuinely specific scene art** (`beatitude-01-poor-in-spirit.png`, `abraham-02-mamre-three-visitors.png`, etc.), leaving only generic symbols in the pool.

Therefore the imagery phases below are restructured: **establish an exact, reviewed mapping FIRST; render it SECOND.** No image goes live without a content rationale and founder sign-off.

---

## ⚠️ Second revision (2026-06-07): scope is now the whole reading system

Subsequent findings (see audit "Daily Bread activation… deep-dive") show the imagery/motion work can't sit on a fractured base. The plan now leads with an **architecture spine**: one reader, one plan/identity model, one "my content" concept. Imagery/motion/activities/stickies/chat/saving all hang off that spine. Phases renumbered accordingly.

---

## Phase 0 — Stop the bleeding + unify the spine (do first)

**0a. Fix the activation crash (small, urgent).**

- In `select`, deactivate any prior `status:'active'` plan for the session before inserting the new one (or make Daily Bread tolerate multiple actives by ordering + `limit(1)` without `.single()`). Removes the "second activation bricks Daily Bread" bug.
- Make `fetchActivePlan` resilient: order by `created_at desc`, take first, never throw on multiple rows.
- Differentiate the three empty reasons (no plan / cookie-lost / error) so the empty screen isn't a catch-all dead-end.
- **Tradeoff/decision:** can a user have **multiple** active plans at once (a "shelf"), or strictly **one active at a time**? This determines whether 0a is "deactivate prior" or "support a list." I need your call.

**0b. Converge on ONE reader.** `/daily-bread`, `/soul-audit/plan/[planToken]`, and `/wake-up/devotional/[slug]` render the same content three ways. Pick the rich reader as the single component and have all routes use it; retire/redirect the duplicates (like `my-devotional` already redirects).

- **Decision:** which becomes canonical — promote the rich `soul-audit/DayContent`/Wake-Up reader and point `/daily-bread` at it (recommended), or rebuild `DailyBreadView` up to parity? Recommend the former (less work, keeps the better UX).

**0c. One identity model.** Decide how a plan binds to a person: keep anonymous-session as primary but **bind to account when signed in** (migrate session→user on auth), so saving/stickies/chat/plans stop living in disconnected silos. Removes the "save requires sign-in but reading doesn't" wall.

- **Decision:** allow anonymous saving (session-keyed, matches storage) vs. require sign-in to save. Recommend anonymous-allowed to match the rest of the flow.

**0d. Fix the flow inversion.** After Soul Audit, route users into the unified rich reader; make "READ NOW" on a series able to **activate it into Daily Bread** (create a plan/active record) so browsing and the personalized path converge.

**Verification:** activate one plan, then a second — confirm no crash and correct surface; sign in mid-session — confirm plan/saves migrate; confirm empty state only when truly empty.

---

## Phase 1 — Build the renderer + an EXACT mapping for one launch series (review-gated)

**Goal:** prove the full loop — exact image, justified, reviewed, rendered — on a single series before any scale-up. No random fallback anywhere.

**1a. Renderer port (mechanism only, no content decisions):**

- `DailyBreadView.tsx` — import `DevotionalArtwork`, `calculateInsertionPoints`, `useLightbox`; refactor the day's fixed sections into an **ordered array** so art can interleave. Render art **only when an exact, approved entry exists** for that day; otherwise render no image (never a filler). This removes the "always fill a slot" behavior entirely.

**1b. Exact mapping method (replaces keyword+random):**

- For one launch series (you pick — e.g. Genesis / the flagship), I produce a **proposed pairing sheet**: for each day/section, the candidate image (thumbnail), the **exact textual anchor** it depicts (the scripture scene, named object, or symbol actually present in that day's words), and a one-line `relevance` rationale.
- Source from the **specific** library art (scene/character/beatitude images), not just decorative symbols — subject to your brand-aesthetic decision below.
- **You review and approve/reject each pairing.** Only approved pairings get written, each with a non-empty `relevance`.

**Decision you owe me before 1b (brand aesthetic vs. literal specificity):**

- (A) keep the single-ink symbol aesthetic, but require an exact symbol↔text correspondence + your approval (more on-brand, less literal);
- (B) use the literal scene/character art that names the exact passage (most specific, departs from the single-ink look);
- (C) hybrid — literal hero at the Center, symbol accents elsewhere.

**Verification:** load the approved series in Daily Bread locally; confirm each image matches its anchor, lazy-loads, theme-switches, opens in lightbox; confirm days without an approved image show none and never a filler. Screenshots for you.

---

## Phase 2 — Cinematic scroll / motion on Daily Bread

**Goal:** the "enter a quiet room" pacing from `ANIMATION-PRINCIPLES.md`, on the canonical reader.

**Changes (additive):**

1. Wrap each rendered section in the existing `FadeIn` / `TextReveal` (scroll-triggered, already built).
2. Add `ScrollProgress` (thin gold thread) to the Daily Bread view.
3. Gate everything on `prefers-reduced-motion` (components already support it; I will verify).

**Tradeoff:** essentially none on payload (CSS/IntersectionObserver). Risk is over-animating; I will keep timings to the doc's ranges and apply on section entry only, not per element.

**Verification:** local scroll-through with motion on and with reduced-motion forced; confirm no layout shift (CLS) and no LCP regression on the hero.

---

## Phase 3 — Scale the EXACT mapping to all series (review-gated, no random fill) ⛔ APPROVAL GATE

**Goal:** every devotional that _should_ have art gets an exact, justified image — and ones without a true match get **none**, never a filler.

**Why a separate gate:** it regenerates the committed `site-devotional-art.ts` and processes thousands of assets — the "new index / generated file" case CLAUDE.md requires me to ask about first.

**Approach (only after Phase 1 proves the method; nothing runs without sign-off):**

1. **Build real image descriptions, not filename tokens.** The current catalog's "keywords" are just split filenames. To match exactly I need true subject metadata per image (what the image actually depicts). Options: use the descriptive scene filenames already present (`beatitude-01-poor-in-spirit`), or caption the candidate set with a vision pass, then store that as searchable metadata.
2. **Exact match + confidence:** pair each devotional's actual textual anchors (named scenes/objects/symbols in that day's content) to a described image. Emit a **confidence score and the rationale**. Below a threshold → **no image**, not a fallback.
3. **Founder review surface:** a proposed-pairings sheet (thumbnail + anchor + rationale + confidence) you approve in batches. Only approved rows are written, each with a populated `relevance`.
4. **Dedupe/quarantine** the ~8 regional + tier duplicate batches and the 614 `_DISCARD_` images as part of the same pass.
5. **Rewrite the generator** so the "always fill a slot" round-robin is removed permanently.

**Tradeoff (your call):** exactness vs. coverage. A strict threshold means some devotionals ship with no art until art is generated/curated for them — which is the correct behavior under "exact, not random," but it means coverage < 100% at first. Confirm you accept partial coverage in exchange for zero arbitrary pairings.

---

## Phase 4 — Stickies, chat & "my content" on the unified reader

Once there's one reader (Phase 0) these become straightforward to bring to the canonical surface:

- **Stickies:** render `DevotionalStickiesLayer` on the unified reader; fix the fragile absolute x/y anchoring so notes attach to a text anchor and survive reflow/mobile (tradeoff: anchored notes need the P5 contract's section ids).
- **Chat:** render `DevotionalChat` on the unified reader; unify its `chatStore` with annotations under the one identity model so engagement isn't three disconnected memories.
- **Saving / my content:** reconcile bookmarks + soul-audit SavedPaths + localStorage into **one "my content" model**; add the missing **`/saved` (library) route** to browse and manage saved devotionals; allow anonymous (session-keyed) saving per 0c. Decide whether `DevotionalLibraryRail` (currently unused) is the basis for this surface.

## Phase 5 — Content contract + activities + video (largest)

- P0 `DayContent` `media[]`/`activity[]` slots with section ids/anchors (also unblocks anchored stickies).
- Activate Reveal/Match/Order activities in the unified reader, authored against content.
- Lazy click-to-load video facade for the 15 orphaned YouTube IDs; ambient loops for flagship.

I'll keep this as the final phase; it depends on the spine and the exact-imagery method being proven first.

---

## Decisions I need before coding

1. **Start point:** approve beginning with **Phase 0a** (the activation crash fix) immediately — it's small, urgent, and low-risk — then Phase 0b–0d?
2. **Multiple active plans:** one-active-at-a-time, or a shelf of several? (drives 0a)
3. **Canonical reader:** promote the rich reader and point `/daily-bread` at it (recommended), or rebuild `DailyBreadView`?
4. **Identity/saving:** allow anonymous (session-keyed) saving (recommended), or require sign-in?
5. **Imagery aesthetic:** (A) on-brand symbols with exact correspondence, (B) literal scene art, or (C) hybrid?
6. **Phase 3 coverage:** accept partial coverage (no image when no exact match) rather than any filler? (recommended yes)
7. Confirm I **stop at local verification, no deploy** (my default).

Suggested order once approved: **0a (crash) → 0b–0d (spine) → 1 (exact imagery, one series) → 2 (motion) → 4 (stickies/chat/saving) → 3 (imagery scale) → 5 (contract/activities/video)**, verifying and updating `CHANGELOG.md` at each step.
