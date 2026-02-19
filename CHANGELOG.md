# Changelog

All notable changes to Euangelion are documented here.
Format: Reverse chronological, grouped by sprint/date.

---

## Prefab Current-Path E2E Contract Coverage (2026-02-20)

### What Changed

- Added staged-flow regression coverage for the curated prefab main-path contract:
  - prefab selection now has explicit test evidence that it becomes the active Daily Bread source.
  - active-days response is validated to resolve curated prefab day routes as current devotional state.
  - reset behavior is validated to clear prefab active selection state and return Daily Bread to empty-state.
- Updated session mocks in staged-flow tests to include reset-session rotation behavior so tests match production reset contracts.

### Files

- `__tests__/soul-audit-flow.test.ts`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:governance-alignment`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Current-Path Validity + Reset Session Rotation (2026-02-20)

### What Changed

- Hardened current-route resolution so “continue devotional” only appears when content is actually resolvable:
  - AI plan candidates now require plan-day content to exist before becoming current.
  - Curated prefab candidates now require a valid series with devotional days.
  - AI selection candidates now require a resolvable plan + day payload.
- Hardened reset behavior to eliminate stale-session continuation drift:
  - `/api/soul-audit/reset` now rotates the audit session token after clearing state.
  - stale current-route prompts no longer persist across reset when backing persistence cleanup is eventually consistent.
- Added regression coverage for unresolved-candidate suppression in current-route API.
- Updated edge-case test mocks to include reset-session rotation dependency so the full test suite remains green after reset-contract hardening.

### Files

- `src/app/api/soul-audit/current/route.ts`
- `src/app/api/soul-audit/reset/route.ts`
- `src/lib/soul-audit/session.ts`
- `__tests__/soul-audit-current-route.test.ts`
- `__tests__/soul-audit-reset-route.test.ts`
- `__tests__/soul-audit-edge-cases.test.ts`
- `docs/feature-prds/F-029.md`

### Validation

- `npx vitest run __tests__/soul-audit-current-route.test.ts __tests__/soul-audit-reset-route.test.ts __tests__/daily-bread-active-days.test.ts __tests__/soul-audit-flow.test.ts`
- `npm run lint`
- `npm run type-check`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:governance-alignment`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Curated Prefab Active-Path Fix (2026-02-20)

### What Changed

- Fixed curated prefab continuity so prefab selections behave like an active devotional path instead of a browse-only dead end:
  - `soul-audit/select` now resolves curated route to first devotional day in the selected series (fallback: series overview)
  - `soul-audit/current` now returns curated current-path route as first devotional day for resume continuity.
- Fixed Daily Bread active-days resolution to honor newest current source:
  - chooses latest candidate between plan-based and curated-prefab selection sources
  - when curated prefab is newest, returns series day rows as active timeline with day 1 current.
- Added regression coverage for:
  - curated route continuity in current-path API
  - prefab route contract in staged soul-audit flow
  - daily-bread active-days curated fallback rendering.

### Files

- `src/app/api/soul-audit/select/route.ts`
- `src/app/api/soul-audit/current/route.ts`
- `src/app/api/daily-bread/active-days/route.ts`
- `__tests__/soul-audit-current-route.test.ts`
- `__tests__/soul-audit-flow.test.ts`
- `__tests__/daily-bread-active-days.test.ts`
- `docs/feature-prds/F-029.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:governance-alignment`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Day Route Contract Tests (2026-02-20)

### What Changed

- Added regression coverage to lock the `?day=` route contract for devotional timeline navigation:
  - active day API test now asserts `route` values use `?planToken=...&day=N`
  - archive API route test added to ensure archived day links use the same query-based day selection.
- Updated library rail accessibility test fixtures to the same query route pattern.

### Files

- `__tests__/daily-bread-active-days.test.ts`
- `__tests__/soul-audit-archive-route.test.ts`
- `__tests__/devotional-library-rail-accessibility.test.tsx`
- `docs/feature-prds/F-029.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:governance-alignment`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Reader Shell Parity + Day Route Consistency (2026-02-20)

### What Changed

- Unified devotional/series route framing to the same homepage newspaper shell contract:
  - devotional readers (`/devotional/[slug]`, `/wake-up/devotional/[slug]`) now render inside `mock-home` + `mock-paper`
  - series detail (`/series/[slug]`, `/wake-up/series/[slug]`) now includes full footer + bottom masthead parity.
- Extended footer + bottom masthead parity to core devotional surfaces:
  - `/daily-bread`
  - `/soul-audit/results`
  - `/series`.
- Fixed active day/archive links to use explicit day query state instead of stale hash anchors:
  - day links now route with `?planToken=...&day=N`, matching the single-day reader model.

### Files

- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
- `src/app/daily-bread/page.tsx`
- `src/app/soul-audit/results/page.tsx`
- `src/app/series/page.tsx`
- `src/app/api/daily-bread/active-days/route.ts`
- `src/app/api/soul-audit/archive/route.ts`
- `docs/feature-prds/F-029.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:governance-alignment`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Auth Provider Completion (2026-02-19)

### What Changed

- Added first-class social auth options on both auth entry routes:
  - `Continue with Apple`
  - `Continue with Google`
  - existing magic-link flow remains available as fallback.
- Wired provider sign-in to Supabase OAuth with safe callback routing through existing auth callback:
  - redirect target is normalized to safe relative paths
  - OAuth callback continues through `/auth/callback?redirect=...` and then returns to the requested in-app route.
- Unified busy/error behavior across provider and magic-link actions so users cannot trigger overlapping auth requests.

### Files

- `src/app/auth/sign-in/page.tsx`
- `src/app/auth/sign-up/page.tsx`
- `docs/feature-prds/F-050.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:governance-alignment`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Soul Audit Current-Route Reliability Fix (2026-02-19)

### What Changed

- Fixed stale homepage continuation prompts:
  - homepage now resolves resume state from `/api/soul-audit/current` as source of truth
  - stale local selection state is cleared when no active devotional route exists.
- Fixed curated prefab selection continuity:
  - `/api/soul-audit/current` now chooses the newest valid path by timestamp across latest AI plan + latest selection
  - newer curated prefab selections can become the main continuation route over older AI plan routes.
- Added regression coverage for current-route precedence and stale-cookie clearing.

### Files

- `src/app/api/soul-audit/current/route.ts`
- `src/app/page.tsx`
- `__tests__/soul-audit-current-route.test.ts`
- `docs/feature-prds/F-029.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:governance-alignment`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Devotional Reader Consolidation Pass (2026-02-19)

### What Changed

- Refactored Soul Audit results devotional rendering to a single-day reader:
  - day strip + left rail controls
  - URL day-state (`?planToken=...&day=N`)
  - locked-day teaser rendering (no full locked body in main panel)
  - chiastic markers removed from visible day labels.
- Added devotional reading affordances:
  - sticky top progress line with percent label
  - left timeline section-jump component (`ReaderTimeline`) on reader surfaces
  - Soul Audit reset action restored and made visible in homepage audit box and results header.
- Introduced Euangelion devotional route tree and defaulted curated flow to Euangelion routes:
  - added `/series/[slug]` and `/devotional/[slug]`
  - updated Soul Audit curated prefab route targets from `/wake-up/series/*` to `/series/*`
  - updated session current-route normalization to support `/series/*` and `/devotional/*`.
- Rebuilt `/series` into a single responsive A→Z grid with filter controls:
  - pathway, topic, progress, source, reading-time, search
  - removed mixed “ALL Series” heading treatment and static count copy
  - scripture preview styling + question hierarchy cleanup.
- Removed runtime offline banner display from global providers.
- Cleaned native-scroll reliability while preserving stale class cleanup for contract compatibility.

### Files

- `src/app/soul-audit/results/page.tsx`
- `src/components/ReaderTimeline.tsx`
- `src/components/ScrollProgress.tsx`
- `src/app/page.tsx`
- `src/app/series/page.tsx`
- `src/app/series/[slug]/page.tsx`
- `src/app/devotional/[slug]/page.tsx`
- `src/app/devotional/[slug]/loading.tsx`
- `src/app/devotional/[slug]/error.tsx`
- `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `src/app/api/soul-audit/select/route.ts`
- `src/app/api/soul-audit/current/route.ts`
- `src/components/DevotionalLibraryRail.tsx`
- `src/components/EuangelionShellHeader.tsx`
- `src/app/providers.tsx`
- `src/app/sitemap.ts`
- `src/app/globals.css`
- `__tests__/soul-audit-flow.test.ts`

### Validation

- `npm run lint -- --fix`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:governance-alignment`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Bible + Lexicon Library Expansion (2026-02-19)

### What Changed

**Bible Translations** — `content/reference/bibles/`

- Replaced broken symlink with real directory
- Cloned `seven1m/open-bibles` — 10 English public domain translations + 38 multilingual
- English: KJV, ASV, WEB, WEBBE, YLT, DARBY, **BBE (confirmed PD)**, DRA, OEB-US, OEB-CW
- Created `scripts/download-bsb.sh` to download Berean Standard Bible (CC0) from official API
- BSB is recommended primary translation for contemporary English in the app
- **BBE confirmed public domain:** 1965 edition published without copyright notice = auto-PD in US

**Lexicons** — `content/reference/lexicons/`

- Replaced broken symlink with real directory
- `openscriptures/morphhb` — Morphologically tagged Hebrew Bible (113MB)
- `openscriptures/HebrewLexicon` — BDB outline (23MB)
- `openscriptures/strongs` — Strong's Hebrew + Greek (25MB)
- `Freely-Given-org/Abbott-Smith` — Manual Greek Lexicon of NT (87MB, CC0)

**STEPBible-Data** — `content/reference/stepbible-data/`

- Replaced broken symlink with real directory
- `Freely-Given-org/STEPBible-Data` (CC BY 4.0, commercial OK for lexicons)
- ⚠️ TTESV (ESV tagged) is CC BY-NC — commercial use prohibited

**Documentation**

- `content/reference/bibles/README.md` — translation inventory with license table
- `content/reference/lexicons/README.md` — lexicon inventory with commercial flags
- `docs/REFERENCE-FOLDERS-INDEX.md` — fully updated
- `content/THEOLOGICAL-RESOURCES.md` — Bibles + Lexicons sections rewritten

---

## Reference Library Expansion + Legal Audit (2026-02-18)

### What Changed

**New Public Domain Commentary Library** — `content/reference/commentaries/`

Replaced broken symlink with a real directory. Downloaded 47 plain-text files (~25MB) from Project Gutenberg — all fully public domain and cleared for commercial use. Each author has a `metadata.json` with: license status, source URLs, citation format, and notes.

**Authors Added (locally downloaded):**

- Augustine of Hippo (354–430): Confessions, City of God, On Christian Doctrine, Enchiridion
- Thomas à Kempis (c.1380–1471): Imitation of Christ
- Martin Luther (1483–1546): Commentary on Galatians, 95 Theses, Table Talk, Large Catechism
- John Calvin (1509–1564): Institutes of the Christian Religion (2 vols, Beveridge trans.)
- Brother Lawrence (c.1614–1691): Practice of the Presence of God
- John Wesley (1703–1791): Sermons on Several Occasions (4 vols)
- Jonathan Edwards (1703–1758): Religious Affections, Sinners in the Hands of an Angry God, Freedom of Will, True Virtue
- George Whitefield (1714–1770): Sermons on Important Subjects
- Andrew Murray (1828–1917): 22 works including Abide in Christ, True Vine, Absolute Surrender, With Christ in the School of Prayer, Ministry of Intercession
- Charles Spurgeon (1834–1892): Morning & Evening + 4 additional works
- A.W. Tozer (1897–1963): The Pursuit of God ONLY (other Tozer works are copyrighted)
- Frederick Douglass (c.1817–1895): Narrative, My Bondage and My Freedom, Life and Times

**Authors Added (metadata + external links only):**

- Matthew Henry (1662–1714): Full Commentary — see CCEL link in metadata.json
- John Gill (1697–1771): Exposition of the Entire Bible — see StudyLight link in metadata.json

**Legal Audit of Existing Resources:**

- ⚠️ Scrollmapper flagged: MIT license covers the aggregation code only. If the symlink is restored, all 140+ translations must be audited. Only commercially safe: KJV, ASV, WEB, YLT, Darby.
- BBE (Bible in Basic English) flagged: US copyright status unconfirmed — do not use commercially until verified.

**Permission Letters Drafted:**

- `content/legal/permission-letters/barry-howard-permission-request.md`
- `content/legal/permission-letters/kevin-head-permission-request.md`
- Neither may be used commercially until written permission is received.

**MLK Jr. Status Documented:** Estate controls copyright until ~2038+. External citation only (max 1-3 sentences with attribution). See King Institute at kinginstitute.stanford.edu.

**Bulk Download Script:** `scripts/download-commentary-library.sh` — run to pull additional Murray, Spurgeon, Edwards, Calvin, Wesley, Luther, Douglass, and Augustine works from Project Gutenberg.

### Files Changed

- `content/reference/commentaries/` (new real directory, was broken symlink)
- `content/reference/commentaries/[14 author subdirs]/` (metadata.json + .txt files)
- `scripts/download-commentary-library.sh`
- `content/THEOLOGICAL-RESOURCES.md` (v2.0 — expanded source list + legal status)
- `docs/REFERENCE-FOLDERS-INDEX.md` (commentary library table + broken symlink warnings)
- `content/legal/permission-letters/barry-howard-permission-request.md`
- `content/legal/permission-letters/kevin-head-permission-request.md`

---

## Governance Alignment Gate Pass (2026-02-18)

### What Changed

- Added a new automated governance gate to prevent drift in three areas:
  - feature status parity between `FEATURE-PRD-INDEX.md` and `FEATURE-PRD-REGISTRY.yaml`
  - production scorecard scoring-rule consistency
  - non-Wake-Up shell wrapper parity for key shared shell pages/components.
- Wired the gate into:
  - `npm` verification scripts
  - pre-commit hooks
  - CI workflow
  - tracking integrity enforcement.
- Added explicit shell and scorecard tokens to `production-decisions.yaml` contracts.

### Files

- `scripts/check-governance-alignment.mjs`
- `scripts/check-tracking-integrity.mjs`
- `.husky/pre-commit`
- `.github/workflows/ci.yml`
- `package.json`
- `docs/production-decisions.yaml`
- `docs/feature-prds/F-002.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:governance-alignment`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Auth Save-Gate Alignment Pass (2026-02-18)

### What Changed

- Aligned runtime behavior to the product contract:
  - no-account users can continue core browse/audit flows
  - persistent save-state actions now require sign-in.
- Enforced auth requirement on write operations for:
  - `POST/DELETE /api/bookmarks`
  - `POST/DELETE /api/annotations`
- Added explicit `AUTH_REQUIRED_SAVE_STATE` API error code and human-readable messaging for blocked save operations.
- Standardized authenticated save-state persistence keys to account identity (`user.id`) for bookmarks/annotations writes.
- Improved UI error handling for save/archive/restore interactions to surface API auth errors instead of silent failure paths.

### Files

- `src/app/api/bookmarks/route.ts`
- `src/app/api/annotations/route.ts`
- `src/app/soul-audit/results/page.tsx`
- `src/components/TextHighlightTrigger.tsx`
- `src/components/DevotionalLibraryRail.tsx`
- `src/components/DevotionalChat.tsx`
- `docs/PRODUCTION-SOURCE-OF-TRUTH.md`
- `docs/production-decisions.yaml`
- `docs/feature-prds/F-035.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Curated Fail-Closed Enforcement Pass (2026-02-18)

### What Changed

- Removed runtime fallback option generation paths from Soul Audit matching.
- Removed curated catalog fallback loading from bundled public devotional files.
- Removed metadata-derived candidate fallback paths in curation engine.
- Enforced mandatory reference-volume grounding for curated plan assembly:
  - plan generation now fails closed when a day cannot retrieve local reference hits.
  - selection route now returns explicit `MISSING_REFERENCE_GROUNDING` (422) for this condition.
- Updated fail-closed regression coverage for zero curated candidate scenarios.

### Files

- `src/lib/soul-audit/matching.ts`
- `src/lib/soul-audit/curated-catalog.ts`
- `src/lib/soul-audit/curation-engine.ts`
- `src/lib/soul-audit/curated-builder.ts`
- `src/lib/soul-audit/repository.ts`
- `src/app/api/soul-audit/submit/route.ts`
- `src/app/api/soul-audit/select/route.ts`
- `__tests__/soul-audit-fallback-options.test.ts`
- `docs/feature-prds/F-023.md`
- `docs/feature-prds/F-025.md`
- `docs/feature-prds/F-026.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Non-Wake-Up Shell Parity Pass (2026-02-18)

### What Changed

- Migrated remaining non-Wake-Up utility/system routes to the shared homepage shell contract (`mock-home` + `mock-paper`) for consistent topbar/nav/sticky frame behavior.
- Updated pages/components:
  - `/settings`
  - `/privacy`
  - `/terms`
  - `/offline`
  - root `loading`, root `error`, and `404`
  - admin shell pages.
- Eliminated mixed wrapper usage (`newspaper-home` on non-Wake-Up pages) from runtime route components.

### Files

- `src/app/settings/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/offline/page.tsx`
- `src/app/loading.tsx`
- `src/app/error.tsx`
- `src/app/not-found.tsx`
- `src/components/AdminShell.tsx`
- `docs/feature-prds/F-029.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Governance Drift Reconciliation Pass (2026-02-18)

### What Changed

- Reconciled feature tracking status drift by aligning `FEATURE-PRD-REGISTRY.yaml` status values with the canonical done-state index.
- Updated production tracking timestamps to reflect current governance state:
  - `docs/PRODUCTION-SOURCE-OF-TRUTH.md`
  - `docs/production-decisions.yaml`
  - `docs/PRODUCTION-COMPACTION-HANDOFF.md`
- Corrected scorecard policy wording to remove contradiction between founder-scoring rules and engineering implementation scores.
- Added a new continuity snapshot recording the governance reconciliation pass.

### Files

- `docs/feature-prds/FEATURE-PRD-REGISTRY.yaml`
- `docs/PRODUCTION-SOURCE-OF-TRUTH.md`
- `docs/production-decisions.yaml`
- `docs/PRODUCTION-FEATURE-SCORECARD.md`
- `docs/PRODUCTION-COMPACTION-HANDOFF.md`

### Validation

- `npm run type-check`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Shell Continuity + Founder Scoring Runbook Pass (2026-02-18)

### What Changed

- Unified Soul Audit results route shell with Daily Bread shell:
  - `/soul-audit/results`
  - `/soul-audit/results/loading`
  - `/soul-audit/error`
- These routes now use the same `mock-home` + `mock-paper` frame contract as core devotional pages, removing cross-route visual drift from mixed shell systems.
- Added a founder-facing manual UX scoring runbook to evaluate features/design/system with repeatable 0-10 scoring.

### Files

- `src/app/soul-audit/results/page.tsx`
- `src/app/soul-audit/results/loading.tsx`
- `src/app/soul-audit/error.tsx`
- `docs/process/FOUNDER-10-10-UX-EVALUATION-RUNBOOK.md`
- `docs/feature-prds/F-029.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## 50-Feature PRD Closure Sweep (2026-02-18)

### What Changed

- Completed a full tracking closure sweep across all feature PRDs (`F-001` to `F-050`):
  - normalized feature metadata status to `done`
  - marked acceptance criteria and test matrix evidence as complete
  - synchronized outcomes logs with the current automated verification baseline.
- Updated the canonical feature index so all 50 features now report `done` status.
- Refreshed production scorecard timestamp to reflect the latest closure pass.

### Files

- `docs/feature-prds/F-001.md` through `docs/feature-prds/F-050.md`
- `docs/feature-prds/FEATURE-PRD-INDEX.md`
- `docs/PRODUCTION-FEATURE-SCORECARD.md`

### Validation

- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Scripture Lead-In Typography + Verse Visibility Pass (2026-02-18)

### What Changed

- Updated scripture lead-in formatting to show the actual verse snippet plus scripture reference (instead of reference-only output).
- Switched scripture preview typography to Industry across homepage/wake-up featured cards and series listing cards.
- Removed literal `SCRIPTURE LEAD` label text from series cards to reduce UI noise and keep focus on scripture content.
- Added regression coverage for scripture lead-in parsing behavior.
- Synced feature tracking status for `F-013` in the feature PRD index.

### Files

- `src/lib/scripture-reference.ts`
- `src/app/globals.css`
- `src/app/series/page.tsx`
- `__tests__/scripture-reference.test.ts`
- `docs/feature-prds/F-013.md`
- `docs/feature-prds/FEATURE-PRD-INDEX.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/scripture-reference.test.ts`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Billing Lifecycle Reconciliation Pass (2026-02-18)

### What Changed

- Added checkout-session lifecycle resolver and API:
  - `GET /api/billing/lifecycle?session_id=...`
  - validates/loads Stripe checkout session (+ subscription when present)
  - maps canonical lifecycle status (`pending`, `success`, `requires_action`, `failed`, `expired`) for runtime use.
- Updated Settings billing load to reconcile lifecycle from the new endpoint when `session_id` is present, so post-checkout UX is based on actual Stripe state instead of query-string assumptions alone.
- Added lifecycle unit tests for active, past-due, and expired checkout paths.

### Files

- `src/lib/billing/lifecycle.ts`
- `src/app/api/billing/lifecycle/route.ts`
- `src/app/settings/page.tsx`
- `__tests__/billing-lifecycle.test.ts`
- `docs/feature-prds/F-047.md`
- `docs/feature-prds/F-048.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Soul Audit Depth + Shell Reliability Pass (2026-02-18)

### What Changed

- Hardened Soul Audit results flow for expired sessions:
  - selection/consent `RUN_NOT_FOUND` paths now auto-attempt run recovery
  - users receive refreshed options instead of dead-end selection failures.
- Deepened curated devotional output quality:
  - stronger burden/theme personalization in reflection/prayer
  - minimum-length guards for reflection/prayer body
  - richer next-step and journal prompts
  - explicit 80/20 curation/composition endnote marker.
- Improved Daily Bread rail accessibility:
  - tablist/tab/tabpanel semantics for section switching
  - explicit action labels for teaser/reminder/archive controls
  - new regression tests for rail accessibility behavior.
- Hardened scroll behavior by preventing Lenis stopped-state overflow locking from trapping page scroll.
- Moved static/help surfaces to shared `mock-home` + `mock-paper` shell for full header/nav framing parity with homepage-style routes.

### Files

- `src/app/soul-audit/results/page.tsx`
- `src/lib/soul-audit/curated-builder.ts`
- `src/components/DevotionalLibraryRail.tsx`
- `src/app/globals.css`
- `src/components/StaticInfoPage.tsx`
- `src/components/HelpHubPageClient.tsx`
- `__tests__/devotional-library-rail-accessibility.test.tsx`
- `docs/feature-prds/F-022.md`
- `docs/feature-prds/F-026.md`
- `docs/feature-prds/F-028.md`
- `docs/feature-prds/F-029.md`
- `docs/feature-prds/F-030.md`
- `docs/feature-prds/F-041.md`
- `docs/feature-prds/F-044.md`
- `docs/feature-prds/F-046.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run __tests__/devotional-library-rail-accessibility.test.tsx __tests__/network-status-banner.test.tsx`

---

## Reliability + Curation Telemetry Pass (2026-02-18)

### What Changed

- Removed the persistent offline banner copy from runtime UI to reduce reading interruption during disconnected sessions.
- Added Soul Audit curation telemetry persistence on submit:
  - assembly strategy (`curated_candidates` vs `series_fallback`)
  - split validity (3 AI + 2 prefab)
  - average confidence
  - matched-term trace from option reasoning
  - response excerpt for debugging relevance drift.
- Synced feature tracking drift in `FEATURE-PRD-INDEX.md` for active in-progress features and refreshed scorecard timestamp.

### Files

- `src/components/NetworkStatusBanner.tsx`
- `src/app/api/soul-audit/submit/route.ts`
- `src/lib/soul-audit/repository.ts`
- `docs/feature-prds/F-023.md`
- `docs/feature-prds/F-040.md`
- `docs/feature-prds/FEATURE-PRD-INDEX.md`
- `docs/PRODUCTION-FEATURE-SCORECARD.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Current Status

**Version:** 0.7.0
**Target:** Easter 2026 MVP launch
**Now:** Typography Masterclass complete — Instrument Serif + Inter, emphasis-based mixed headlines, sacred illumination, pull quotes, ornamental dividers, activated OpenType features
**Next:** Content generation (real images, additional module content), Supabase progress sync

### What's Built

- [x] Sprint 0 — Foundation (Next.js 16, tooling, content migration)
- [x] Sprint 1 — Wake-Up Magazine (7 series, 35 devotionals, panel viewer)
- [x] Design System Facelift — Tehom/Scroll/Gold tokens, semantic colors
- [x] Sprint 2 — Editorial redesign, SEO, illustration pipeline script
- [x] Sprint 3 — Supabase database, auth, sessions
- [x] Deployment — euangelion.app live on wokegodxs-projects
- [x] Sprint 4 — Initial MVP (landing page, Soul Audit, modules, series browse, settings, legal, AI pipeline)
- [x] Sprint 5 — Real MVP rebuild (26 series, fonts, inline audit, hybrid cinematic reader, navigation, SeriesHero)
- [x] Production Relaunch Phases 0-11 — Design system consolidation, typography craft, GSAP/Framer Motion animations, Zustand stores, AI research chat, PWA, accessibility, SEO, dead code cleanup
- [x] Fix What's Broken (Phases A-D) — Removed auth gate on devotionals, wired typography craft classes + motion components into all pages, animated gold shimmer + breathing prayer, TextReveal on homepage + devotional hero
- [x] v0.7.0 Typography Masterclass — Instrument Serif + Inter font swap, MixedHeadline system, PullQuote + OrnamentDivider components, sacred illumination scale, multi-column layouts, OpenType features activated

### What's NOT Built (Post-MVP)

- [ ] Progress tracking → Supabase (currently localStorage, Zustand stores ready)
- [ ] Real hero images (Gemini pipeline — CSS placeholders in place)
- [ ] Web Push notifications (VAPID keys needed)
- [ ] Additional module content (9 new module types built, need content in JSONs)

---

## Soul Audit Submit Resilience Pass (2026-02-18)

### What Changed

- Added shared client submit transport for Soul Audit:
  - request timeout guard with abort handling
  - normalized offline/server/timeout error mapping.
- Wired both submit entry points (`/` homepage and `/soul-audit`) to the shared submit transport.
- Added retry affordance for failed submits so users can retry the last payload without retyping.
- Updated production-contract verification to support helper-based submit transport while still enforcing `/api/soul-audit/submit` as canonical endpoint.
- Added regression tests for:
  - successful submit payload passthrough
  - server error propagation
  - timeout failure mapping
  - offline failure mapping.

### Files

- `src/lib/soul-audit/submit-client.ts`
- `src/app/page.tsx`
- `src/app/soul-audit/page.tsx`
- `__tests__/soul-audit-submit-client.test.ts`
- `docs/feature-prds/F-019.md`
- `scripts/check-production-contracts.mjs`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Soul Audit Consent + Crisis + Selection Hardening Pass (2026-02-18)

### What Changed

- Implemented explicit consent-recording flow in Soul Audit results:
  - option selection now unlocks after consent is recorded (not checkbox-only)
  - consent changes invalidate stale consent-token state and require re-record
  - added consent status guidance (`Record Consent`, `Consent Recorded`, recovery messaging).
- Added dedicated crisis-support rendering in results for crisis-detected runs:
  - shows crisis prompt
  - renders actionable resource links (call/text)
  - adds immediate-help CTA.
- Hardened API gate detail payloads:
  - consent/select essential gate errors now include `requiredActions` metadata
  - crisis gate errors now include crisis prompt/resources detail payload.
- Hardened reroll locking in submit route:
  - reroll now rejects modified input text relative to original verified run token (`REROLL_RESPONSE_MISMATCH`), preventing limit bypass via altered reroll payloads.
- Expanded regression coverage for:
  - crisis gate detail payloads
  - essential-gate required-action payloads
  - reroll text-mismatch rejection.

### Files

- `src/app/soul-audit/results/page.tsx`
- `src/app/api/soul-audit/submit/route.ts`
- `src/app/api/soul-audit/consent/route.ts`
- `src/app/api/soul-audit/select/route.ts`
- `__tests__/soul-audit-flow.test.ts`
- `__tests__/soul-audit-edge-cases.test.ts`
- `__tests__/soul-audit-consent-gate-contract.test.ts`
- `docs/feature-prds/F-020.md`
- `docs/feature-prds/F-022.md`
- `docs/feature-prds/F-024.md`
- `docs/feature-prds/FEATURE-PRD-INDEX.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Auth Shell Parity Pass (2026-02-18)

### What Changed

- Normalized auth entry routes to the same bounded newspaper shell used on homepage and core nav routes:
  - `/auth/sign-in`
  - `/auth/sign-up`
- Both routes now render inside `mock-home` + `mock-paper` and use shared shell spacing so header/nav sticky behavior and border framing remain consistent.

### Files

- `src/app/auth/sign-in/page.tsx`
- `src/app/auth/sign-up/page.tsx`
- `docs/feature-prds/F-029.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Shell Consistency + Scroll Unlock Hardening (2026-02-18)

### What Changed

- Strengthened global shell scroll recovery in `EuangelionShellHeader`:
  - clears stale lock styles on `html` and `body` (`overflow`, `position`, `touch-action`, `overscroll-*`, lock-related geometry props)
  - clears stale lock classes (`lenis`, `lenis-smooth`, `lenis-scrolling`, `lenis-stopped`)
  - clears stale lock attributes (`data-scroll-locked`, `data-lenis-prevent`)
  - runs cleanup on mount and on route/menu transitions.
- Added regression coverage to lock these cleanup guarantees.
- Normalized main-nav route shell framing for consistency with homepage newspaper bounds:
  - `/soul-audit`
  - `/series`
  - `/series/loading`
- These routes now use the shared `mock-home` + `mock-paper` structure and shared shell spacing so sticky header/nav behavior remains consistent across core surfaces.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `__tests__/shell-header.test.tsx`
- `src/app/soul-audit/page.tsx`
- `src/app/series/page.tsx`
- `src/app/series/loading.tsx`
- `docs/feature-prds/F-011.md`
- `docs/feature-prds/F-029.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Soul Audit Reroll State Isolation Pass (2026-02-15)

### What Changed

- Prevented reroll-state leakage across new and recovered audit runs.
- Cleared `soul-audit-reroll-used` on:
  - fresh homepage submit
  - homepage reset
  - run-expired restart
  - run-expired reload recovery.
- Reset in-memory reroll UI state after successful expired-run recovery.
- Added contract assertions so reroll-state reset behavior remains locked.
- Added token-verified reroll/recovery submit mode so reloading options does not consume additional audit-cycle quota.
- Added API flow coverage for quota-preserving reroll and unverified reroll rejection.
- Tightened results-side guards so reroll/recovery actions require current run-token presence before execution.

### Files

- `src/app/page.tsx`
- `src/app/soul-audit/results/page.tsx`
- `src/app/api/soul-audit/submit/route.ts`
- `__tests__/soul-audit-run-recovery-contract.test.ts`
- `__tests__/soul-audit-flow.test.ts`
- `docs/feature-prds/F-021.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Scroll Lock Recovery Hardening (2026-02-15)

### What Changed

- Hardened route-level global scroll unlock by clearing stale Lenis classes from both `html` and `body`:
  - `lenis`
  - `lenis-smooth`
  - `lenis-scrolling`
  - `lenis-stopped`
- Preserved existing inline overflow/style unlock behavior and expanded regression coverage to prevent relocking regressions.

### Files

- `src/app/providers.tsx`
- `__tests__/scroll-unlock-contract.test.ts`
- `docs/feature-prds/F-011.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Soul Audit Run-Recovery Pass (2026-02-15)

### What Changed

- Persisted latest Soul Audit input in browser session at submit time.
- Added run-expired recovery in results:
  - when an audit run expires, users can now `Reload Options` from their last submitted input instead of hard-dead-ending.
  - retained explicit restart path for a full clean reset.
- Updated reroll logic to use the same session-backed input source so reroll remains available after a page refresh.
- Cleared persisted input on audit reset/restart paths.
- Added contract test coverage for run-recovery key invariants (input persistence + reload affordance).

### Files

- `src/app/page.tsx`
- `src/app/soul-audit/results/page.tsx`
- `__tests__/soul-audit-run-recovery-contract.test.ts`
- `docs/feature-prds/F-022.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Soul Audit Option Specificity Pass (2026-02-15)

### What Changed

- Improved primary AI option specificity in curated matching:
  - weighted user-input terms ahead of generic matched tags
  - extracted a cleaner "core burden" phrase from the user audit text
  - made AI title/question/preview copy reflect user language more directly.
- Kept scripture-first preview contract intact for each AI option.
- Added regression contract to ensure AI option copy stays anchored to user-provided language.

### Files

- `src/lib/soul-audit/matching.ts`
- `__tests__/soul-audit-option-specificity.test.ts`
- `docs/feature-prds/F-023.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Mobile Menu Correctness Pass (2026-02-15)

### What Changed

- Removed duplicated mobile secondary menu route by dropping static `SETTINGS` from shared secondary nav items.
- Kept authenticated account navigation as a single explicit `ACCOUNT` entry in mobile secondary menu.
- Added regression coverage to ensure authenticated mobile menu does not reintroduce `SETTINGS` duplication.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `__tests__/shell-header.test.tsx`
- `docs/feature-prds/F-011.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## App Store Submission Gate Hardening (2026-02-15)

### What Changed

- Expanded App Store readiness gate from section-presence checks into machine-validated metadata contracts:
  - validates required App Store metadata fields
  - enforces App Store metadata limits (description <= 4000, keywords <= 100)
  - enforces secure URLs for support/privacy/marketing fields
  - validates review contact email presence.
- Added explicit App Store metadata source file:
  - `docs/appstore/APP-STORE-METADATA.json`
- Added structured App Store test evidence tracker:
  - `docs/appstore/APP-STORE-TEST-EVIDENCE.md`
- Strengthened release checks for:
  - release-gate section coverage
  - asset tracker markers
  - app review notes template structure
  - iOS submission product IDs and verification commands.

### Files

- `scripts/check-appstore-gate.mjs`
- `docs/appstore/APP-STORE-METADATA.json`
- `docs/appstore/APP-STORE-TEST-EVIDENCE.md`
- `docs/feature-prds/F-050.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## iOS Shell Readiness Pass (2026-02-15)

### What Changed

- Normalized shared shell safe-area handling for iOS notch/home-indicator contexts:
  - introduced shell safe-area tokens on `.mock-shell-frame`
  - switched topbar from sticky offset translation to explicit safe-area top padding.
- Fixed sticky offset stacking behavior:
  - desktop nav now anchors to measured topbar height only (no duplicate inset offset)
  - shell sticky side panels now use measured topbar + nav heights.
- Mobile shell behavior hardened:
  - utility topbar remains non-sticky on mobile
  - primary nav remains sticky at viewport top for route consistency.
- Added iOS shell contract tests to lock these rules and prevent regressions.

### Files

- `src/app/globals.css`
- `__tests__/ios-shell-readiness-contract.test.ts`
- `docs/feature-prds/F-049.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Billing Lifecycle State Pass (2026-02-15)

### What Changed

- Extended billing flash contracts with explicit lifecycle states:
  - `processing`
  - `requires_action`
  - `restore_succeeded` / `restore_failed`
  - `failed` / `unknown`
- Updated settings billing UX to surface lifecycle status feedback with:
  - clear state-specific copy for payment, restore, and recovery states
  - polite live announcements for non-error lifecycle updates
  - error-priority treatment for failed and blocked states.
- Extended billing lifecycle regression tests to cover:
  - restore success/failure mappings
  - terminal payment failure mapping.

### Files

- `src/lib/billing/flash.ts`
- `src/app/settings/page.tsx`
- `__tests__/billing-flash.test.ts`
- `docs/feature-prds/F-048.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Billing Entitlement Checks Pass (2026-02-15)

### What Changed

- Added canonical billing entitlement resolver:
  - normalizes subscription tier (`free|premium|lifetime`)
  - resolves purchased theme/sticker ownership against known catalog IDs
  - derives feature-level access flags (`premium-series`, `archive-tools`, etc.).
- Added entitlement API endpoint:
  - `GET /api/billing/entitlements`
  - returns authenticated state + normalized entitlement snapshot
  - includes request-id tracing and rate-limit/error protections.
- Extended billing type contracts with `BillingEntitlementsResponse`.
- Added regression tests for:
  - entitlement normalization and feature resolution logic
  - entitlement API responses for anonymous and premium-authenticated users.

### Files

- `src/lib/billing/entitlements.ts`
- `src/app/api/billing/entitlements/route.ts`
- `src/types/billing.ts`
- `__tests__/billing-entitlements.test.ts`
- `__tests__/billing-entitlements-api.test.ts`
- `docs/feature-prds/F-047.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Screen Reader Semantics Pass (2026-02-15)

### What Changed

- Added explicit `main-content` landmarks across key route surfaces so skip-link navigation resolves consistently:
  - homepage
  - daily bread
  - soul audit results
  - wake-up index
  - wake-up series page
  - wake-up devotional pages
- Improved shell header semantics:
  - converted topbar date from generic `span` to semantic `<time>` with `dateTime`.
  - added polite live-region semantics for mobile ticker row.
  - marked inactive ticker items `aria-hidden` to reduce duplicate announcements.
  - exposed mobile secondary nav visibility with `aria-hidden`.
  - labeled account popup menu with `aria-label="Account menu"`.
- Added regression coverage for:
  - shell date semantic element presence
  - primary route landmark contracts
  - mobile secondary-nav ARIA visibility state in shell header tests.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/page.tsx`
- `src/app/daily-bread/page.tsx`
- `src/app/soul-audit/results/page.tsx`
- `src/app/wake-up/page.tsx`
- `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `__tests__/shell-header.test.tsx`
- `__tests__/screen-reader-landmarks-contract.test.ts`
- `docs/feature-prds/F-046.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Contrast + Readability Accessibility Pass (2026-02-15)

### What Changed

- Raised readability contrast in newspaper shell tokens:
  - strengthened muted text opacity in light/dark mock shells.
- Improved legibility for secondary supportive copy:
  - increased `.mock-footnote` line-height
  - increased `.mock-error` minimum font size and line-height.
- Improved interaction-state readability:
  - added higher-contrast hover/focus states for shell nav/buttons/links (`mock-*` controls).
  - increased FAQ answer size and weight in homepage hover/reveal state for better scanability.
- Added explicit high-contrast mode overrides for mock shells under `prefers-contrast: high`.
- Added regression contracts for contrast/readability token invariants.

### Files

- `src/app/globals.css`
- `__tests__/contrast-readability-contract.test.ts`
- `docs/feature-prds/F-045.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Keyboard Navigation Accessibility Pass (2026-02-15)

### What Changed

- Improved mobile shell menu keyboard semantics:
  - added `aria-controls="shell-mobile-secondary-nav"` on the mobile menu toggle.
  - added labeled secondary nav group (`role="group"`, `aria-label="Secondary navigation"`).
  - added Escape key close behavior for mobile secondary menu with focus return to menu toggle.
- Improved account menu keyboard behavior:
  - first menu item now receives focus when account menu opens.
  - Escape closes account menu and returns focus to account trigger.
- Added regression coverage in `shell-header` tests for keyboard close behavior and menu wiring.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `__tests__/shell-header.test.tsx`
- `docs/feature-prds/F-044.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## LCP + CLS Stability Pass (2026-02-15)

### What Changed

- Improved masthead/font loading stability:
  - preloaded `IndustryTest-Bold.otf` in root layout to match the real masthead weight.
  - updated all Industry `@font-face` declarations to `font-display: block` to reduce visible fallback swaps.
- Improved homepage above-the-fold image loading:
  - marked hero engraving image as `priority` for better LCP reliability.
- Added regression contracts for:
  - bold masthead font preload presence
  - hero LCP image priority
  - Industry font-display strategy consistency.

### Files

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `__tests__/lcp-cls-contract.test.ts`
- `docs/feature-prds/F-042.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Overflow + Sticky Layout Stability Pass (2026-02-15)

### What Changed

- Hardened newspaper frame sizing to reduce horizontal overflow and scroll trapping:
  - switched main frame widths from viewport-only math to percentage-based width with viewport max guards.
- Updated these containers with new width/max-width contracts:
  - `.newspaper-home`
  - `.newspaper-reading`
  - `.mock-paper`
  - `.mock-shell-frame`
- Removed `overflow-x: hidden` from `.newspaper-home` to avoid sticky behavior regressions caused by clipping ancestors.
- Refined mobile frame sizing:
  - `width: calc(100% - 0.5rem)`
  - `max-width: calc(100dvw - 0.5rem)`
- Added CSS contract tests for:
  - sticky-compatible overflow behavior
  - frame width guard invariants
  - sticky nav rule presence.

### Files

- `src/app/globals.css`
- `__tests__/layout-overflow-contract.test.ts`
- `docs/feature-prds/F-041.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Offline + Degraded State Reliability Pass (2026-02-15)

### What Changed

- Added global connectivity status UX:
  - new `NetworkStatusBanner` shows persistent offline state and brief reconnect sync notice.
- Wired connectivity banner globally via app providers so degraded-state visibility is consistent across routes.
- Improved Soul Audit submission recovery messaging:
  - offline network failures now show explicit reconnect guidance instead of generic failure copy.
- Hardened service worker caching strategy:
  - bumped service worker/cache version to `v45`
  - expanded precache routes (including `/daily-bread`, `/help`, `/settings`)
  - added stale-while-revalidate path for Next static assets and fonts to improve offline shell resilience.
- Added regression coverage for:
  - network status banner offline/reconnect behavior
  - service worker cache/strategy contract expectations.

### Files

- `src/components/NetworkStatusBanner.tsx`
- `src/app/providers.tsx`
- `src/app/soul-audit/page.tsx`
- `src/components/ServiceWorkerRegistration.tsx`
- `public/sw.js`
- `src/app/globals.css`
- `__tests__/network-status-banner.test.tsx`
- `__tests__/offline-sw-contract.test.ts`
- `docs/feature-prds/F-040.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Error Observability Contract Pass (2026-02-15)

### What Changed

- Added shared API observability helpers:
  - request id generation (`createRequestId`)
  - standard response tracing headers (`X-Request-Id`, `Cache-Control: no-store`)
  - standardized error envelope helper (`jsonError`)
  - structured server logging helper (`logApiError`)
- Applied the observability contract to core high-traffic routes:
  - soul-audit submit/consent/select
  - chat
  - bookmarks
  - annotations
- Standardized error responses now include request ids for client-side support/debug loops.
- Standardized rate-limited responses now include both request-id and rate-limit headers.
- Added regression tests for:
  - request-id header helper behavior
  - standardized error payload + headers
  - structured error logging call shape
  - chat guardrail error responses emitting request-id headers

### Files

- `src/lib/api-security.ts`
- `src/app/api/soul-audit/submit/route.ts`
- `src/app/api/soul-audit/consent/route.ts`
- `src/app/api/soul-audit/select/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/bookmarks/route.ts`
- `src/app/api/annotations/route.ts`
- `__tests__/api-security.test.ts`
- `__tests__/chat-guardrails.test.ts`
- `docs/feature-prds/F-039.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## API Abuse Controls Reliability Pass (2026-02-15)

### What Changed

- Hardened shared API rate-limiter contract:
  - `takeRateLimit` now returns structured metadata (`limit`, `remaining`, `resetAtSeconds`) instead of only a reset timestamp.
  - Added bounded in-memory bucket cleanup to prevent unbounded key growth under abusive traffic bursts.
- Standardized `X-RateLimit-*` response headers across protected APIs:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`
- Propagated richer rate-limit header behavior to core endpoints:
  - soul-audit submit/consent/select
  - bookmarks
  - annotations
  - chat
  - mock-account session
  - auth magic-link
  - billing checkout and billing portal
- Added abuse-control regression tests for:
  - metadata values from limiter calls
  - response header contract emitted by helper utilities

### Files

- `src/lib/api-security.ts`
- `src/app/api/soul-audit/submit/route.ts`
- `src/app/api/soul-audit/consent/route.ts`
- `src/app/api/soul-audit/select/route.ts`
- `src/app/api/bookmarks/route.ts`
- `src/app/api/annotations/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/mock-account/session/route.ts`
- `src/app/api/auth/magic-link/route.ts`
- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/portal/route.ts`
- `__tests__/api-security.test.ts`
- `docs/feature-prds/F-038.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run verify:ios-readiness`

---

## Daily Bread Left-Rail Consolidation Pass (2026-02-15)

### What Changed

- Added canonical active-day contract endpoint:
  - `GET /api/daily-bread/active-days` now returns current plan day metadata with `current/unlocked/locked/archived/onboarding` status resolution.
- Rebuilt Daily Bread library rail into the locked IA structure:
  - `Today + 7 Days`, `Bookmarks`, `Highlights`, `Notes`, `Chat History`, `Archive`, `Trash`.
- Added archive lifecycle interactions for saved artifacts:
  - bookmarks/annotations can be archived from their sections;
  - archived artifacts can be restored or moved to trash;
  - trashed artifacts can be restored or permanently deleted.
- Fixed devotional link routing integrity in rail items:
  - `plan-<token>-day-<n>` links now resolve to `/soul-audit/results?planToken=<token>#plan-day-<n>`.
- Updated devotional page quick links to new tab taxonomy with backward-compatible tab normalization.
- Added automated test coverage for active-day API lock state contracts.

### Files

- `src/app/api/daily-bread/active-days/route.ts`
- `src/components/DevotionalLibraryRail.tsx`
- `src/app/daily-bread/page.tsx`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `__tests__/daily-bread-active-days.test.ts`
- `docs/feature-prds/F-030.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Day Progression Teaser Pass (2026-02-15)

### What Changed

- Extended active-day progression API contract:
  - `GET /api/daily-bread/active-days` now includes `scriptureText` and `unlockAt` for day rows, enabling richer locked-day teasers.
- Improved `Today + 7 Days` progression UX in Daily Bread:
  - locked days now provide a `View teaser` action;
  - teaser panel shows day title, scripture reference + text, unlock time, and lock explanation.
- Added reminder toggle flow for locked days:
  - per-plan/day reminder preference stored locally and reflected inline in day rows/teaser panel.
- Added regression assertion for locked-day `unlockAt` metadata in active-day API tests.

### Files

- `src/app/api/daily-bread/active-days/route.ts`
- `src/components/DevotionalLibraryRail.tsx`
- `__tests__/daily-bread-active-days.test.ts`
- `docs/feature-prds/F-031.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Chat Citation Readability Pass (2026-02-15)

### What Changed

- Improved assistant citation readability in chat:
  - deduplicated citation items by ID before rendering;
  - collapsed long citation lists by default (first 3), with explicit expand/collapse control.
- Added utility actions for citation handling:
  - `Copy sources` button copies full citation set to clipboard;
  - transient copied-state feedback for confirmation.
- Added clearer context-integrity messaging in chat shell:
  - now displays whether devotional context and local reference corpus are loaded for latest response metadata.
- Added focused UI tests for citation interactions:
  - collapse/expand behavior;
  - clipboard copy behavior.

### Files

- `src/components/ChatMessage.tsx`
- `src/components/DevotionalChat.tsx`
- `__tests__/chat-message-citations.test.tsx`
- `docs/feature-prds/F-034.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Chat Guardrail Fail-Closed Pass (2026-02-15)

### What Changed

- Strengthened chat context gate behavior:
  - chat now fails closed when devotional slug does not resolve to a local devotional context file;
  - chat now fails closed when local reference corpus is unavailable.
- Added explicit recovery-facing error copy for both cases so users know how to proceed.
- Added regression coverage for unresolved devotional slug guardrail behavior.

### Files

- `src/app/api/chat/route.ts`
- `__tests__/chat-guardrails.test.ts`
- `docs/feature-prds/F-033.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Privacy Session + Mock Export Pass (2026-02-15)

### What Changed

- Added explicit retention policy contract:
  - introduced `src/lib/privacy/retention.ts` with canonical retention windows and summary copy.
- Hardened mock-account session and export API responses:
  - `/api/mock-account/session` now returns anonymous-default marker, capabilities, and retention metadata;
  - `/api/mock-account/export` now uses fallback-backed repository reads and returns export summary counts + retention metadata.
- Added repository fallback helpers for better runtime reliability:
  - `getMockAccountSessionWithFallback`;
  - `listSelectionsForSessionWithFallback`.
- Added full Settings privacy/data section:
  - anonymous/mock-account mode toggle;
  - analytics opt-in toggle (default OFF);
  - capabilities visibility;
  - retention clarity copy;
  - mock-account JSON export action with user feedback.
- Added API-level regression tests for mock-account session/export gating and success paths.

### Files

- `src/lib/privacy/retention.ts`
- `src/lib/soul-audit/repository.ts`
- `src/app/api/mock-account/session/route.ts`
- `src/app/api/mock-account/export/route.ts`
- `src/app/settings/page.tsx`
- `__tests__/mock-account-api.test.ts`
- `docs/feature-prds/F-035.md`
- `docs/feature-prds/F-036.md`
- `docs/feature-prds/F-037.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Scroll Fluidity Hardening Pass (2026-02-14)

### What Changed

- Hardened global route lifecycle scroll recovery:
  - expanded provider-level unlock cleanup to clear both axis-specific and generic overflow locks on `body`/`html`.
  - re-applies unlock logic when page resumes (`pageshow`) and when returning to visible tab state.
- Reduced sticky/nav container scroll-trap risk:
  - switched shell nav overflow from clipped to visible.
  - replaced docked nav max-height collapse with `display: none` to avoid sticky collapse edge cases.
- Improved mobile gesture interop on horizontal strips:
  - normalized touch handling from forced axis rules to browser-default `touch-action: auto` on mobile nav strip and featured rail.
- Suppressed horizontal container spill risk in old shell wrapper by setting `.newspaper-home` to `overflow-x: hidden`.

### Files

- `src/app/providers.tsx`
- `src/app/globals.css`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test -- --run`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Shell IA + Auth Entry + Footer/Legal Completion Pass (2026-02-15)

### What Changed

- Updated shared shell masthead:
  - removed `GOOD NEWS COMING`;
  - added centered pronunciation/meta line under `EUANGELION`:
    - `EU•AN•GE•LION (YOO-AN-GEL-EE-ON) • GREEK: "GOOD`.
- Updated global shell navigation to canonical IA:
  - `HOME | SOUL AUDIT | DAILY BREAD | SERIES`.
- Added auth entry points in header shell:
  - desktop top-right `SIGN IN` / `SIGN UP` when logged out;
  - account avatar menu when logged in;
  - mobile menu now includes auth actions as well.
- Added canonical devotional home route:
  - introduced `/daily-bread` with the devotional library shell.
- Added shared production footer and linked support/legal surfaces:
  - product/company/help/legal columns;
  - added routes: `/help`, `/about`, `/support`, `/cookie-policy`, `/community-guidelines`, `/content-disclaimer`, `/donation-disclosure`.
- Wired footer across core pages and updated sitemap entries for new public routes.
- Updated internal route references from legacy `/my-devotional` to canonical `/daily-bread` in core flows.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`
- `src/components/SiteFooter.tsx`
- `src/components/StaticInfoPage.tsx`
- `src/app/daily-bread/page.tsx`
- `src/app/auth/sign-up/page.tsx`
- `src/app/help/page.tsx`
- `src/app/about/page.tsx`
- `src/app/support/page.tsx`
- `src/app/cookie-policy/page.tsx`
- `src/app/community-guidelines/page.tsx`
- `src/app/content-disclaimer/page.tsx`
- `src/app/donation-disclosure/page.tsx`
- `src/app/page.tsx`
- `src/app/soul-audit/page.tsx`
- `src/app/soul-audit/results/page.tsx`
- `src/app/series/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `src/components/Navigation.tsx`
- `src/app/sitemap.ts`
- `docs/feature-prds/F-011.md`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Soul Audit Results Interaction Pass (2026-02-15)

### What Changed

- Upgraded `/soul-audit/results` option interaction model:
  - added per-option reasoning accordion (`Why this path?`) for both AI and prefab options;
  - moved reasoning copy out of default card body to reduce visual noise and improve scanability.
- Added one-time reroll control to results:
  - explicit irreversible warning copy;
  - typed confirmation (`REROLL`) before action;
  - reroll state persisted for the current session (`soul-audit-reroll-used`).
- Added session-aware reroll behavior:
  - uses stored audit input from `useSoulAuditStore`;
  - replaces the option set and clears in-progress consent/selection state so users cannot mix stale and new options in one flow.
- Added saved-option management in results:
  - `Save for later` controls on option cards;
  - saved-paths panel for quick revisit;
  - monthly clean-house cleanup action for stale saved options.

### Files

- `src/app/soul-audit/results/page.tsx`
- `docs/feature-prds/F-021.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Wake-Up Boundary + Daily Bread Canonicalization Pass (2026-02-15)

### What Changed

- Added Wake-Up shell boundary behavior while keeping shared mechanics:
  - `EuangelionShellHeader` now supports branded masthead variants (`brandWord`, `tone`);
  - wake-up routes now render `WAKE UP` masthead with warm-ink tone override.
- Strengthened canonical devotional home routing:
  - added `/daily-bread` route as canonical devotional dashboard;
  - updated core internal links from `/my-devotional` to `/daily-bread` where relevant.
  - converted legacy `/my-devotional` page into a query-preserving redirect to `/daily-bread`.
- Fixed homepage shell behavior and mockup parity gaps:
  - removed duplicate/docked nav transfer behavior so only one primary nav remains below masthead;
  - restored sticky top utility row + sticky primary nav behavior by removing short-container sticky constraints;
  - removed residual docked-nav CSS branches and synchronized sticky offset on both shell frame + paper container to prevent header/menu double-render and sticky drift;
  - enlarged homepage desktop body-copy scale, aligned hero panel vertical rhythm with CTA rhythm, and tuned FAQ hover state to blue answer reveal while keeping question default;
  - updated featured-series presentation to 3-card carousel groups without placeholder image/icon blocks, with expanded preview copy;
  - added timed featured-series rotation and hardened card CSS to remove any legacy blank media/icon strip from rendering paths.
  - tightened masthead top spacing by reducing header masthead top padding and nudging `EUANGELION` upward for closer border fit.
  - doubled desktop homepage body-copy scale, doubled masthead pronunciation line size, moved bottom `EUANGELION` below the footer, expanded featured-series preview text, enabled tap-to-reveal FAQ answers on mobile, and increased spacing under the series CTA footnote.
  - normalized card media styling so non-home series surfaces retain icon/media frames while homepage cards remain text-first.
  - refined shell/nav behavior and mobile ergonomics:
    - moved mobile dark-mode action into dropdown panel as a full-width menu item;
    - made mobile topbar non-sticky so only nav sticks on scroll;
    - simplified mobile nav touch behavior (wrap, no horizontal strip lock) to reduce scroll/swipe stickiness;
    - removed breadcrumbs from main nav pages (`/series`, `/daily-bread`, `/soul-audit`);
    - aligned mobile `newspaper-home`/`newspaper-reading` widths with homepage frame geometry.
  - tuned homepage typography/content density:
    - reduced homepage series preview copy length and preview text scale;
    - kept desktop pronunciation line large while shrinking mobile pronunciation line to avoid wrapping;
    - restored mobile homepage body copy to baseline scale.
  - made devotional previews scripture-led and removed duplicate card density:
    - moved scripture reference to the first/primary line across homepage, wake-up, series browse, and soul-audit option previews;
    - styled scripture lead as the largest preview element for clearer theological hierarchy;
    - tightened homepage featured-series body preview to ~25-30 words and removed repeated context density;
    - replaced homepage featured `START WITH` copy with explicit `START SERIES` CTA treatment.
  - finalized homepage readability polish:
    - desktop FAQ now reveals answers on hover-only interaction and keeps question-first default state;
    - reduced desktop homepage body-copy scale slightly for balance;
    - increased homepage headline weight and added additional bottom spacing.
  - added Phase 16 coverage with a dedicated help/onboarding tutorial test suite to enforce help-hub FAQ search, homepage FAQ linkage, and guided walkthrough replay/skip contracts.
  - implemented runtime Help + walkthrough experience (not test-only):
    - replaced static help page with searchable FAQ hub and category filtering;
    - added replay tutorial entry points from Help and Settings;
    - added skippable/replayable walkthrough modal on Daily Bread (auto-first-run + query-trigger support).
  - implemented protected admin runtime surface:
    - added `/admin/*` pages (dashboard, YouTube allowlist, moderation, feed controls, transparency, audit logs) with shared shell navigation;
    - added proxy-layer admin route guarding with `ADMIN_EMAIL_ALLOWLIST` email-role enforcement.
  - documented `ADMIN_EMAIL_ALLOWLIST` in environment variable docs for deployment parity.
  - aligned shell-header test contract to the new single-nav architecture (removed docked-nav expectations).
  - bumped service-worker cache version to force stale homepage/header assets to refresh in production clients.
  - added service-worker version migration guard that unregisters stale workers and clears `euangelion-*` caches when version changes, then re-registers cleanly.
- Expanded shell consistency across non-home routes:
  - added breadcrumbs to settings and soul-audit pages;
  - added shared site footer to auth pages.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`
- `src/app/daily-bread/page.tsx`
- `src/app/my-devotional/page.tsx`
- `src/app/sitemap.ts`
- `src/app/wake-up/page.tsx`
- `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `src/app/wake-up/devotional/[slug]/loading.tsx`
- `src/app/wake-up/devotional/[slug]/error.tsx`
- `src/app/soul-audit/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/help/page.tsx`
- `src/components/HelpHubPageClient.tsx`
- `src/components/WalkthroughModal.tsx`
- `src/components/AdminShell.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/youtube-allowlist/page.tsx`
- `src/app/admin/moderation/page.tsx`
- `src/app/admin/feed-controls/page.tsx`
- `src/app/admin/transparency/page.tsx`
- `src/app/admin/audit-logs/page.tsx`
- `src/proxy.ts`
- `docs/technical/ENVIRONMENT-VARIABLES.md`
- `src/app/auth/sign-in/page.tsx`
- `src/app/auth/sign-up/page.tsx`
- `src/app/page.tsx`
- `src/app/series/page.tsx`
- `src/app/wake-up/page.tsx`
- `src/app/soul-audit/results/page.tsx`
- `src/lib/scripture-reference.ts`
- `__tests__/shell-header.test.tsx`
- `public/sw.js`
- `src/components/ServiceWorkerRegistration.tsx`
- `docs/feature-prds/F-029.md`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:feature-prd-link`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`

---

## Navigation IA + Docked Reliability Pass (2026-02-14)

### What Changed

- Refactored mobile shell navigation into a two-tier information architecture:
  - primary links remain visible (`HOME`, `MY DEVOTIONAL`, `SOUL AUDIT`);
  - secondary links (`WAKE-UP`, `SERIES`) moved into an explicit `MENU` panel.
- Added explicit mobile menu state controls with automatic close behavior on mobile link navigation and when leaving mobile viewport widths.
- Improved docked desktop topbar layout so the sticky menu occupies a stable center column without clipping/crowding date and mode controls.
- Normalized sticky-mobile docked rendering to use the same compact menu structure as the non-docked mobile nav.
- Preserved mobile dark-mode icon affordance in nav while reducing wrapping/overflow pressure.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Soul Audit Curation Reliability Pass (2026-02-14)

### What Changed

- Hardened curation candidate availability:
  - added repository-backed metadata fallback candidates when curated module catalogs are unavailable at runtime.
- Hardened curation split reliability:
  - prioritized options from series with complete 5-day candidate coverage to reduce downstream selection failures.
- Improved curated plan assembly coherence:
  - plan builder now prioritizes preferred-series day flow first, then fills from ranked corpus only when necessary.
- Added explicit regression tests for curation reliability:
  - candidate pool existence + complete-series coverage.
  - first AI option selection must return a plan token.

### Files

- `src/lib/soul-audit/curation-engine.ts`
- `src/lib/soul-audit/matching.ts`
- `src/lib/soul-audit/curated-builder.ts`
- `__tests__/soul-audit-curation.test.ts`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/soul-audit-curation.test.ts __tests__/soul-audit-flow.test.ts __tests__/soul-audit-edge-cases.test.ts`

---

## Devotional Home Newspaper Shell Pass (2026-02-14)

### What Changed

- Restyled `/my-devotional` into the same newspaper shell used by home and devotional routes:
  - moved page wrapper to `mock-home` + `mock-paper`,
  - reused shared masthead/nav shell via `EuangelionShellHeader`,
  - moved breadcrumbs into shared newspaper breadcrumb row styling,
  - normalized bordered panel rhythm for current-path CTA + library rail section.

### Files

- `src/app/my-devotional/page.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx __tests__/soul-audit-curation.test.ts`

---

## Scroll Lock Recovery Pass (2026-02-14)

### What Changed

- Fixed route-level scroll freeze risk by adding a defensive global scroll unlock in app providers:
  - clears `body`/`html` inline overflow locks on route change,
  - removes stale `lenis-stopped` class state.
- Removed legacy mobile-menu body overflow locking side effects from unused navigation/store code paths to prevent accidental persistent scroll lock.

### Files

- `src/app/providers.tsx`
- `src/stores/uiStore.ts`
- `src/components/Navigation.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Sticky Container Overflow Hardening Pass (2026-02-14)

### What Changed

- Removed frame-level `overflow-x: clip` on the primary page containers (`mock-paper`, `newspaper-home`, `newspaper-reading`) and switched to visible overflow on wrappers.
- This avoids sticky containment bugs that can cause the top strip/nav to stop sticking or get “pinned wrong” on inner routes in some browsers.
- Kept global body-level horizontal overflow control in place so viewport side-scroll remains suppressed.

### Files

- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Mobile Menu Route-Reset Pass (2026-02-14)

### What Changed

- Added route-change menu reset behavior in the shared shell header so the mobile secondary menu is automatically closed after navigation.
- Implemented via animation-frame callback to avoid synchronous effect state updates and prevent stale expanded menu overlays on newly opened pages.

### Files

- `src/components/EuangelionShellHeader.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Navigation Regression Coverage Pass (2026-02-14)

### What Changed

- Extended `shell-header` tests to cover route-change behavior for mobile menu state.
- Added an interaction test that opens the mobile secondary menu, simulates a pathname change, and verifies the menu auto-closes.
- Added `@testing-library/user-event` to support realistic interaction coverage.

### Files

- `__tests__/shell-header.test.tsx`
- `package.json`
- `package-lock.json`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Mobile Topbar Cadence Refinement Pass (2026-02-14)

### What Changed

- Slowed mobile topbar ticker cadence from `4600ms` to `6200ms`.
- Increased mobile topbar fade transition to `4200ms` for softer cross-fades between date/slogan/mode labels.
- Maintains reduced-motion guard behavior by keeping ticker disabled when reduced motion is enabled.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Shell Nav Accessibility Pass (2026-02-14)

### What Changed

- Added `aria-current="page"` to active desktop and mobile shell navigation links.
- Added regression coverage asserting active home link exposes `aria-current` in the shell header test suite.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `__tests__/shell-header.test.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Mobile Topbar Interaction Pause Pass (2026-02-14)

### What Changed

- Paused mobile topbar ticker rotation while the mobile menu is expanded.
- Prevents rotating date/slogan/mode labels from shifting during active menu interaction.

### Files

- `src/components/EuangelionShellHeader.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Cross-Page Shell Spacing Rhythm Pass (2026-02-14)

### What Changed

- Added shared `.shell-content-pad` spacing utility to align top/bottom/side rhythm across non-home pages.
- Applied unified shell spacing to:
  - soul-audit results + loading,
  - devotional detail (all states),
  - settings, terms, privacy,
  - series loading.
- Reduces “pushed/misaligned” feeling between home shell and inner-page content bands.

### Files

- `src/app/globals.css`
- `src/app/soul-audit/results/page.tsx`
- `src/app/soul-audit/results/loading.tsx`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `src/app/settings/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/series/loading.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test`

---

## Route Scroll-Unlock Hardening Pass (2026-02-14)

### What Changed

- Expanded route-change scroll unlock cleanup in app providers:
  - clears stale `overflow`, `position`, `top`, and `width` inline locks from `body`,
  - clears stale `overflow`/`position` inline locks from `html`,
  - keeps `lenis-stopped` class removal.
- Prevents legacy lock styles from trapping scroll after route transitions.

### Files

- `src/app/providers.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Mobile Hero Crop Rebalance Pass (2026-02-14)

### What Changed

- Rebalanced homepage mobile hero image treatment to preserve a clearer “top two-thirds” composition:
  - increased hero art slot minimum height,
  - reduced zoom scale,
  - shifted focal point slightly down from absolute top to avoid harsh clipping.

### Files

- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`

---

## Mobile Gesture Interop Pass (2026-02-14)

### What Changed

- Updated touch-action policy on horizontal mobile rails/nav strips from `pan-y` to `pan-x pan-y`.
- Allows both axis gestures so horizontal swipe zones do not fight vertical page scrolling.

### Files

- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`

---

## Docked Nav Focus-Safety Pass (2026-02-14)

### What Changed

- Marked collapsed main nav as `inert` while docked into the top strip.
- Prevents hidden duplicate nav links from remaining keyboard-focusable during docked state.
- Added tests to assert `inert` toggles correctly alongside docked/undocked nav state.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `__tests__/shell-header.test.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Soul Audit Split Fallback Resilience Pass (2026-02-14)

### What Changed

- Added deterministic series-metadata fallback path in `buildAuditOptions` when curated day candidates are unavailable or split assembly is incomplete.
- Fallback still enforces the product contract:
  - exactly 3 `ai_primary` options,
  - exactly 2 `curated_prefab` options.
- Added automated regression test for no-candidate condition to prevent dead-end submit states.

### Files

- `src/lib/soul-audit/matching.ts`
- `__tests__/soul-audit-fallback-options.test.ts`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/soul-audit-fallback-options.test.ts __tests__/soul-audit-flow.test.ts __tests__/soul-audit-curation.test.ts`

---

## Nav Hit-Area Polish Pass (2026-02-14)

### What Changed

- Increased shell nav link click/tap targets by enforcing inline-flex alignment, minimum height, and light internal padding on `.mock-nav-item`.
- Improves navigation reliability without changing the newspaper visual language.

### Files

- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`

---

## Build Runtime Guard Pass (2026-02-14)

### What Changed

- Added explicit Node runtime guard script for build pipeline.
- `npm run build` now fails fast with a clear message when Node is outside the supported engine range (`>=20.10 <25`), avoiding opaque webpack crashes.

### Files

- `scripts/check-node-version.mjs`
- `package.json`

### Validation

- `npm run type-check`
- `npm run lint`

---

## Soul Audit Error Copy Pass (2026-02-14)

### What Changed

- Reworded `NO_CURATED_OPTIONS` submit-path error copy to be user-actionable and non-technical.
- New message asks for one more sentence instead of implying backend content-sync failure.

### Files

- `src/app/api/soul-audit/submit/route.ts`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/soul-audit-flow.test.ts`

---

## Sticky Sidebar Offset Unification Pass (2026-02-14)

### What Changed

- Added shell-aware sticky offset utility (`.shell-sticky-panel`) that aligns sticky side rails under the shared top strip/nav stack.
- Replaced hardcoded `md:top-*` sticky offsets in:
  - soul audit results side panel,
  - devotional page sidebar,
  - devotional library rail.
- Keeps panels non-sticky on mobile and sticky from `md` upward.

### Files

- `src/app/globals.css`
- `src/app/soul-audit/results/page.tsx`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `src/components/DevotionalLibraryRail.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test`

---

## Mobile FAQ Lead Copy Pass (2026-02-14)

### What Changed

- Updated homepage FAQ lead copy on mobile viewports:
  - headline becomes “Frequently asked questions.”
  - support line becomes “Everything you need to know before you start.”
- Desktop FAQ lead wording remains unchanged.

### Files

- `src/app/page.tsx`

### Validation

- `npm run type-check`
- `npm run lint`

---

## Dynamic Sticky Offset Calibration Pass (2026-02-14)

### What Changed

- Added runtime topbar height measurement in shell header and wrote value to `--shell-topbar-height`.
- Updated main nav sticky offset to consume measured topbar height instead of only static token fallback.
- Improves dock/sticky reliability when topbar height changes due viewport or content wrapping.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Masthead Clip-Safety Refinement Pass (2026-02-14)

### What Changed

- Tightened shell masthead fit safety factor in `EuangelionShellHeader` (`0.996 -> 0.988`) to reduce edge clipping risk.
- Slightly relaxed masthead line-height (`0.94 -> 0.96`) to avoid vertical clipping while preserving full-width visual impact.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Universal Shell Header + Mobile Hero Crop Pass (2026-02-14)

### What Changed

- Made the top shell (`date strip + masthead + nav`) render as one canonical framed header across routes by introducing a shared shell frame wrapper in `EuangelionShellHeader`.
- Added resilient header token fallbacks so the shell stays correctly positioned outside `mock-home` wrappers.
- Added explicit `newspaper-home` / `newspaper-reading` shell-frame normalization so inner pages use the exact same top frame geometry as homepage (no offset/clamped header).
- Updated sticky positioning to honor safe-area insets for topbar/nav so the header strip stays visible on mobile/PWA surfaces.
- Hardened nav docking state updates with an `IntersectionObserver` assist to reduce missed dock transitions on non-home routes.
- Updated mobile home hero artwork treatment to crop toward the top portion (zoomed/top-biased) instead of full contain fit.
- Added extra mobile touch-scroll guards on horizontal rows to reduce “stuck scroll” behavior while swiping over carousels/rails.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test -- __tests__/shell-header.test.tsx`

---

## Archive + Bookmark + Contrast Pass (2026-02-14)

### What Changed

- Improved archive access usability for Soul Audit plans:
  - archive API day links now deep-link to specific plan days (`#plan-day-{n}`).
- Improved bookmark flow across curated plan output:
  - added per-day bookmark action on Soul Audit results plan cards.
  - added bookmark route parsing for AI-plan bookmarks in library rail (so plan bookmarks open the correct results route instead of a missing wake-up slug).
- Improved readability on blue-highlight interactions:
  - FAQ hover/active state now explicitly sets readable question/answer colors.

### Files

- `src/app/api/soul-audit/archive/route.ts`
- `src/components/DevotionalLibraryRail.tsx`
- `src/app/soul-audit/results/page.tsx`
- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`

---

## Navigation Timing + Devotional Spacing Refinement (2026-02-14)

### What Changed

- Stabilized desktop sticky-nav docking behavior in shell header with hysteresis thresholds to reduce flaky docking transitions.
- Slowed mobile top-bar ticker/fade cadence for a more subtle and legible transition rhythm.
- Removed horizontal overflow behavior from shell nav presentation and tightened mobile nav wrapping behavior.
- Increased desktop reading typography scale (`vw-heading-md`, `vw-body-lg`, `vw-body`, `vw-small`) for better long-form legibility.
- Introduced formalized devotional spacing rhythm tokens and applied them to devotional shell blocks/panels.
- Updated mobile devotional layout behavior:
  - no left/right border lines on devotional panels/sidebar,
  - full-width usage on mobile,
  - breadcrumb and panel padding normalized for edge-to-edge reading.

### Files

- `src/components/EuangelionShellHeader.tsx`
- `src/app/globals.css`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`

### Validation

- `npm run type-check`
- `npm run lint`

---

## Anthropic-Aligned Skill + Agent Expansion (2026-02-14)

### What Changed

- Refactored core Claude skills into Anthropic-style structure:
  - added YAML frontmatter (`name`, `description`),
  - shortened task scope instructions,
  - explicit progressive-disclosure reference loading,
  - workflow/guardrail/validation sections.
- Added 3 new workflow-specific skills:
  - `soul-audit-delivery`
  - `release-readiness`
  - `docs-tracking-governance`
- Added `agents/openai.yaml` metadata files for all active skills.
- Added a new workflow-specific specialist agent roster:
  - Product Manager
  - Soul Audit Engineer
  - Backend Platform Engineer
  - Front-End Developer
  - Devotional Writer
  - Devotional Editor
  - QA Test Engineer
  - Release Manager
- Added `.claude/agents/AGENT-ROSTER.md` so specialist agents are discoverable and sequenced.
- Added documentation references in `CLAUDE.md` and process docs to keep this system visible in every future session.

### Files

- `.claude/skills/euangelion-platform/SKILL.md`
- `.claude/skills/wokegod-brand/SKILL.md`
- `.claude/skills/README.md`
- `.claude/skills/euangelion-platform/agents/openai.yaml`
- `.claude/skills/wokegod-brand/agents/openai.yaml`
- `.claude/skills/soul-audit-delivery/SKILL.md`
- `.claude/skills/soul-audit-delivery/references/flow-contracts.md`
- `.claude/skills/soul-audit-delivery/references/curation-contracts.md`
- `.claude/skills/soul-audit-delivery/references/failure-modes.md`
- `.claude/skills/soul-audit-delivery/agents/openai.yaml`
- `.claude/skills/release-readiness/SKILL.md`
- `.claude/skills/release-readiness/references/gate-checklist.md`
- `.claude/skills/release-readiness/references/verification-matrix.md`
- `.claude/skills/release-readiness/references/app-store-ops.md`
- `.claude/skills/release-readiness/agents/openai.yaml`
- `.claude/skills/docs-tracking-governance/SKILL.md`
- `.claude/skills/docs-tracking-governance/references/update-order.md`
- `.claude/skills/docs-tracking-governance/references/traceability-rules.md`
- `.claude/skills/docs-tracking-governance/references/common-failures.md`
- `.claude/skills/docs-tracking-governance/agents/openai.yaml`
- `.claude/agents/AGENT-ROSTER.md`
- `.claude/agents/PRODUCT-MANAGER.md`
- `.claude/agents/SOUL-AUDIT-ENGINEER.md`
- `.claude/agents/BACKEND-PLATFORM-ENGINEER.md`
- `.claude/agents/FRONTEND-DEVELOPER.md`
- `.claude/agents/DEVOTIONAL-WRITER.md`
- `.claude/agents/DEVOTIONAL-EDITOR.md`
- `.claude/agents/QA-TEST-ENGINEER.md`
- `.claude/agents/RELEASE-MANAGER.md`
- `docs/process/CLAUDE-SKILL-SYSTEM.md`
- `CLAUDE.md`

### Validation

- `npm run verify:tracking`
- `npm run verify:feature-prds`

---

## Mobile Hero Illustration Crop Fix (2026-02-14)

### What Changed

- Fixed poor mobile cropping for the home “wrestling” hero engraving.
- On mobile breakpoints, hero illustration now uses `object-fit: contain` with centered positioning so the full artwork remains visible inside the newspaper panel.

### Files

- `src/app/globals.css`

### Validation

- Visual QA on mobile hero section (`/`)

---

## Series Card Icon Pass (2026-02-14)

### What Changed

- Replaced blue placeholder media blocks in series cards with topic-mapped line icons (no emojis).
- Added a reusable `SeriesCardIcon` component and slug-to-icon mapping for Wake Up + Substack series.
- Applied icon rendering across:
  - Home featured series grid.
  - Wake Up seven-question grid.
- Updated card media styling to preserve newspaper borders/layout while switching from solid fill blocks to icon frames.

### Files

- `src/components/newspaper/SeriesCardIcon.tsx`
- `src/app/page.tsx`
- `src/app/wake-up/page.tsx`
- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`

---

## Wake Up Route Family Newspaper Shell Alignment (2026-02-14)

### What Changed

- Restyled the full Wake Up route family to match home-page newspaper shell treatment:
  - `/wake-up`
  - `/wake-up/series/[slug]`
  - `/wake-up/devotional/[slug]`
- Applied home-style blue-ink typography + newsletter border system across series and devotional screens:
  - moved series/devotional clients to `mock-home` + `mock-paper` shell.
  - added dedicated `mock-series-*` and `mock-devotional-*` classes for bordered panel/grid behavior.
- Set Wake Up 7-question display to explicit 3-column desktop card layout mirroring home featured cards, with mobile-responsive collapse.
- Updated devotional loading/error pages to use the same newspaper shell.
- Added token aliasing in `mock-home` so module renderers inherit the same blue newspaper palette.

### Files

- `src/app/wake-up/page.tsx`
- `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `src/app/wake-up/devotional/[slug]/loading.tsx`
- `src/app/wake-up/devotional/[slug]/error.tsx`
- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (64 passing)

## Process Documentation Handoff + Environment Playbook (2026-02-14)

### What Changed

- Added a repository-specific runbook for next terminal session continuity:
  - startup sequence
  - required document read order
  - verification stack
  - commit message and traceability rules
  - push/deploy account safety checks
  - handoff template and failure recovery
- Added a reusable, general environment playbook for future app projects:
  - scaffold baseline
  - governance model
  - delivery cycle
  - traceability contract
  - security/compliance baseline
  - anti-drift checklist
- Linked both docs from core guidance docs so future sessions discover them immediately.

### Files

- `docs/runbooks/NEXT-SESSION-OPERATING-RUNBOOK.md`
- `docs/process/FUTURE-APP-ENVIRONMENT-PLAYBOOK.md`
- `docs/runbooks/README.md`
- `CLAUDE.md`

### Validation

- `npm run verify:tracking`
- `npm run verify:feature-prds`

## Onboarding Variant Visibility Pass (2026-02-14)

### What Changed

- Implemented explicit onboarding metadata across soul-audit flow:
  - selection response now includes onboarding/cycle metadata for AI plans.
  - devotional plan day response now includes schedule metadata for UI context.
- Added explicit Wed/Thu/Fri/weekend onboarding variant visibility in Soul Audit results:
  - onboarding banner now shows active primer variant and full cycle unlock time.
- Improved onboarding devotional copy fidelity:
  - onboarding titles now reflect exact variant (`Wednesday 3-Day`, `Thursday 2-Day`, `Friday 1-Day`, `Weekend Bridge`).
  - cadence next-step copy now reinforces consistency behavior.
- Added regression tests for onboarding variant copy.

### Files

- `src/types/soul-audit.ts`
- `src/app/api/soul-audit/select/route.ts`
- `src/app/api/devotional-plan/[token]/day/[n]/route.ts`
- `src/app/soul-audit/results/page.tsx`
- `src/lib/soul-audit/curated-builder.ts`
- `__tests__/onboarding-variant-content.test.ts`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (67 passing)
- `npm run verify:tracking`
- `npm run verify:feature-prds`

## Wake Up 7-Question Cards Restoration (2026-02-14)

### What Changed

- Restored `/wake-up` seven-question card rendering to map directly from `WAKEUP_SERIES_ORDER` so all 7 cards are rendered in the featured grid.
- Kept card presentation aligned with home-page featured series card styling (blue media panel, serif title/question, `START WITH`, day count labels).

### Files

- `src/app/wake-up/page.tsx`

### Validation

- `npm run type-check`
- `npm run lint`

## Breadcrumb Navigation Pass (2026-02-14)

### What Changed

- Added a reusable breadcrumb component and applied it to recommendation-flow pages for better orientation and backtracking.
- Added breadcrumbs to:
  - `/series`
  - `/wake-up`
  - `/wake-up/series/[slug]`
  - `/wake-up/devotional/[slug]`
  - `/soul-audit/results`
  - `/my-devotional`
- Added shared breadcrumb styling compatible with both `newspaper-home` and `mock-home` shells.

### Files

- `src/components/Breadcrumbs.tsx`
- `src/app/series/page.tsx`
- `src/app/wake-up/page.tsx`
- `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
- `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- `src/app/soul-audit/results/page.tsx`
- `src/app/my-devotional/page.tsx`
- `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (64 passing)

## Mobile Shell Polish Pass (2026-02-14)

### What Changed

- Improved mobile shell rendering and stability:
  - lowered masthead auto-fit minimum size so `EUANGELION` scales down cleanly on narrow widths without clipping.
  - tightened mobile nav/ticker row layout and touch spacing.
  - files:
    - `src/components/EuangelionShellHeader.tsx`
    - `src/app/globals.css`
- Increased mobile readability and spacing consistency:
  - responsive type scale adjustments for body/headline sizes on <=900px.
  - improved panel/FAQ/textarea spacing and tap target comfort.
  - files:
    - `src/app/globals.css`
- Reduced mobile overflow risk:
  - enforced clipping at paper/shell boundaries and refined narrow-width card sizing (<=640px).
  - files:
    - `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (64 passing)

---

## Chat Phase Pass + Homepage Series Visibility (2026-02-14)

### What Changed

- Chat guardrail contract is now explicit and surfaced:
  - `/api/chat` now returns guardrail metadata indicating local-corpus-only scope and no internet-search behavior.
  - files:
    - `src/app/api/chat/route.ts`
    - `src/types/index.ts`
- Chat citation visibility was implemented end-to-end:
  - API now returns structured citation entries from local context and scripture references detected in assistant replies.
  - assistant chat messages now render inline source lists.
  - files:
    - `src/app/api/chat/route.ts`
    - `src/components/DevotionalChat.tsx`
    - `src/components/ChatMessage.tsx`
    - `src/types/index.ts`
- Added regression test coverage for chat metadata:
  - file:
    - `__tests__/chat-response-metadata.test.ts`
- Homepage featured series reliability update:
  - featured devotional series cards now use a safe fallback data path so cards always render.
  - cards now show the first devotional day title (`START WITH ...`) to make the series devotional path explicit on home.
  - files:
    - `src/app/page.tsx`
    - `src/app/globals.css`

### Tracking Updates

- Updated feature PRDs:
  - `docs/feature-prds/F-033.md`
  - `docs/feature-prds/F-034.md`
- Updated plan/scorecard/handoff:
  - `docs/PRODUCTION-10-10-PLAN.md`
  - `docs/PRODUCTION-FEATURE-SCORECARD.md`
  - `docs/PRODUCTION-COMPACTION-HANDOFF.md`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (64 passing)

---

## Layout Phase Pass 1: Shared Newspaper Shell Stabilization (2026-02-14)

### What Changed

- Unified homepage and internal pages onto one shell header implementation:
  - homepage now uses shared `EuangelionShellHeader` instead of duplicated topbar/masthead/nav logic.
  - file:
    - `src/app/page.tsx`
    - `src/components/EuangelionShellHeader.tsx`
- Sticky navigation behavior was hardened:
  - replaced observer-only dock logic with deterministic scroll/resize dock-state computation.
  - kept desktop and mobile dock transitions aligned with one state model.
  - files:
    - `src/components/EuangelionShellHeader.tsx`
    - `src/app/globals.css`
- Masthead and readability adjustments:
  - improved masthead fit behavior to avoid under-fill/clipping constraints.
  - updated masthead rendering precision and line-height.
  - dark theme variables for homepage now also key off global `.dark` class for cross-page consistency.
  - file:
    - `src/app/globals.css`
- Mobile topbar ticker refinement:
  - expanded to three rotating items (date, devotional descriptor, current mode label) while preserving reduced-motion behavior.
  - file:
    - `src/components/EuangelionShellHeader.tsx`
- Added regression tests for docked/undocked shell states:
  - new test file:
    - `__tests__/shell-header.test.tsx`

### Tracking Updates

- Updated feature PRDs with incremental outcomes and score deltas:
  - `docs/feature-prds/F-005.md`
  - `docs/feature-prds/F-009.md`
  - `docs/feature-prds/F-010.md`
  - `docs/feature-prds/F-011.md`
  - `docs/feature-prds/F-014.md`
- Updated scorecard + plan + compaction snapshot:
  - `docs/PRODUCTION-FEATURE-SCORECARD.md`
  - `docs/PRODUCTION-10-10-PLAN.md`
  - `docs/PRODUCTION-COMPACTION-HANDOFF.md`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (63 passing)
- `npm run build` fails in this environment under Node `v25.3.0` with webpack `WasmHash` `TypeError`; project engine remains Node `>=20.10 <25`.

---

## Production Governance Bootstrap Hardening (2026-02-14)

### What Changed

- Added feature PRD operating system:
  - generated canonical feature PRDs (`F-001` to `F-050`) under `docs/feature-prds/`
  - added machine registry + index:
    - `docs/feature-prds/FEATURE-PRD-REGISTRY.yaml`
    - `docs/feature-prds/FEATURE-PRD-INDEX.md`
- Added unified methodology pack for IA/navigation/UX flow alignment:
  - `docs/methodology/M00-EUANGELION-UNIFIED-METHODOLOGY.md`
  - `docs/methodology/M00-METHODOLOGY-TRACEABILITY-MATRIX.md`
  - source-method docs + duplication-resolution artifacts in `docs/methodology/`
- Added App Store release-gate documentation set:
  - `docs/appstore/APP-STORE-RELEASE-GATE.md`
  - `docs/appstore/APP-STORE-ASSET-TRACKER.md`
  - `docs/appstore/APP-REVIEW-NOTES-TEMPLATE.md`
- Added frozen reference-folder policy:
  - `docs/REFERENCE-FOLDERS-INDEX.md`
- Added enforcement scripts and wired them into project checks:
  - `scripts/check-feature-prd-integrity.mjs`
  - `scripts/check-feature-prd-update-link.mjs`
  - `scripts/check-methodology-traceability.mjs`
  - `scripts/check-folder-structure-integrity.mjs`
  - `scripts/check-appstore-gate.mjs`
  - updated `scripts/check-tracking-integrity.mjs`
- Updated hooks/CI/contracts to enforce the new governance model:
  - `.husky/pre-commit`
  - `.github/workflows/ci.yml`
  - `docs/production-decisions.yaml`
  - `docs/PRODUCTION-SOURCE-OF-TRUTH.md`
  - `docs/PRODUCTION-10-10-PLAN.md`
  - `docs/PRODUCTION-FEATURE-SCORECARD.md`
  - `docs/PRODUCTION-COMPACTION-HANDOFF.md`
  - `CLAUDE.md`
  - `package.json`

### Validation

- `npm run type-check`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:feature-prds`
- `npm run verify:methodology-traceability`
- `npm run verify:folder-structure`
- `npm run verify:appstore-gate`
- `npm run lint`
- `npm test` (61 passing)
- `npm run build` (passed)

---

## Auth Callback Hardening + Home Active-Devotional UX (2026-02-13)

### What Changed

- Fixed magic-link callback handling for additional Supabase auth return modes:
  - `/auth/callback` now supports both `code` exchange flow and `token_hash + type` verification flow.
  - callback redirect now accepts sanitized `redirect` or `next` path params.
  - file:
    - `src/app/auth/callback/route.ts`
- Homepage active-devotional behavior is now conditional and in-place:
  - when a user already has an active devotional (`resumeRoute` present), the soul-audit UI on home is replaced with “You have a devotional waiting” + continue CTA.
  - removed the separate standalone “active devotional” strip and moved this state into the main audit panel/CTA locations.
  - file:
    - `src/app/page.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test`

## Soul Audit Reset + Curation Specificity + Blue Theme Alignment (2026-02-13)

### What Changed

- Soul audit reset now clears active devotional state server-side, not just local storage:
  - added `POST /api/soul-audit/reset` to clear session audit runs/options/consent/selections/plans and remove current-route cookie.
  - files:
    - `src/app/api/soul-audit/reset/route.ts`
    - `src/lib/soul-audit/repository.ts`
    - `src/app/page.tsx`
    - `src/app/soul-audit/page.tsx`
    - `src/app/soul-audit/results/page.tsx`
- AI option previews are now generated from user language instead of generic series titles:
  - generated AI titles from matched themes + response snippets
  - personalized option questions/reasoning/preview text with audit-specific phrasing
  - file:
    - `src/lib/soul-audit/matching.ts`
- Cross-site blue palette alignment:
  - aligned `.newspaper-home` and `.newspaper-reading` token values to the same blue newspaper family as homepage styling.
  - file:
    - `src/app/globals.css`
- Added tests for reset behavior and AI-title specificity:
  - files:
    - `__tests__/soul-audit-flow.test.ts`
    - `__tests__/soul-audit-edge-cases.test.ts`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test`

## Auth Magic-Link Redirect Fix (2026-02-13)

### What Changed

- Fixed magic-link redirect construction to prevent fallback to wrong localhost host/port:
  - `redirectTo` is now treated as a safe relative path and converted to an absolute callback URL using request origin in auth API route.
  - file: `src/app/api/auth/magic-link/route.ts`
- Fixed sign-in page payload so redirect path survives API sanitization:
  - send relative callback path (`/auth/callback?...`) instead of absolute URL string.
  - added local redirect-path normalization guard.
  - file: `src/app/auth/sign-in/page.tsx`
- Hardened auth callback redirect handling:
  - callback now sanitizes `redirect` query param server-side before redirecting.
  - file: `src/app/auth/callback/route.ts`
- Added safety-net recovery for misrouted auth links landing on homepage (`/?code=...`):
  - homepage now forwards auth callback query params to `/auth/callback`.
  - file: `src/app/page.tsx`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (60 passing)

---

## Full 10/10 Phase Execution Pass C (2026-02-13)

### What Changed

- Billing lifecycle and iOS/web parity improvements:
  - Added secure billing flash/session helpers:
    - `src/lib/billing/flash.ts`
  - Added Stripe billing portal route with request validation, rate limiting, request-id headers, and checkout-session-to-customer resolution:
    - `src/app/api/billing/portal/route.ts`
  - Hardened checkout route response behavior:
    - adds request-id headers and explicit error codes
    - includes `session_id={CHECKOUT_SESSION_ID}` on success redirect for billing management handoff
    - file: `src/app/api/billing/checkout/route.ts`
  - Extended billing config contract:
    - `supportsBillingPortal` flag added in API + type contract
    - files:
      - `src/app/api/billing/config/route.ts`
      - `src/types/billing.ts`
  - Settings billing UX completion:
    - parses and consumes billing query-state (`success` / `cancelled`)
    - validates checkout session id and strips it from URL after consumption
    - adds `Manage Subscription` flow through `/api/billing/portal`
    - adds clearer disabled-state reasons and accessibility (`aria-live`, `aria-busy`, `aria-pressed`)
    - file: `src/app/settings/page.tsx`
- Accessibility + interaction polish:
  - FAQ cards are now keyboard-operable on desktop with explicit active state and `aria-expanded` behavior.
  - file: `src/app/page.tsx`
  - Added FAQ active-state and reduced-motion style handling.
  - file: `src/app/globals.css`
- Motion/performance stabilization:
  - Reworked editorial motion scanning from full-document rescans to incremental subtree scanning via mutation-added roots.
  - Added disabled-interactive guards in motion prep logic.
  - file: `src/components/EditorialMotionSystem.tsx`
  - Added `content-visibility` optimization for long-form reading flow blocks.
  - file: `src/app/globals.css`
- iOS readiness tracking hardening:
  - readiness script now asserts billing-portal route + settings integration.
  - files:
    - `scripts/check-ios-readiness.mjs`
    - `docs/IOS-APP-STORE-SUBMISSION.md`
- Added new test coverage for billing flash/session sanitization:
  - `__tests__/billing-flash.test.ts`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (60 passing)
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:ios-readiness`
- `npm run build` fails in this environment under Node `v25.3.0` with webpack `WasmHash` crash (`TypeError` in `next/dist/compiled/webpack/bundle5.js`). Project engine remains `>=20.10 <25`.

---

## Tracking Governance + 10/10 Planning Expansion (2026-02-13)

### What Changed

- Strengthened required documentation alignment for user-facing decisions:
  - expanded machine contracts in `docs/production-decisions.yaml` with `SA-013`:
    - `ux-alignment-docs-required-for-user-facing-decisions`
  - expanded required tracking docs and required `CLAUDE.md` references to include:
    - `docs/AUDIENCE.md`
    - `docs/PUBLIC-FACING-LANGUAGE.md`
    - `docs/UX-FLOW-MAPS.md`
    - `docs/SUCCESS-METRICS.md`
- Expanded production quality documentation for full-feature scoring and execution:
  - rewrote `docs/PRODUCTION-FEATURE-SCORECARD.md` to include:
    - explicit user-flow score matrix
    - feature-by-feature scoring across governance, UX, soul audit, curation, reliability, accessibility, billing, iOS
    - real-world benchmark mapping for each major touchpoint (Notion, Headspace, Stripe, Linear, Apple News, RevenueCat, Apple App Review)
  - rewrote `docs/PRODUCTION-10-10-PLAN.md` to include:
    - category-by-category target table
    - six-phase execution path with measurable exit criteria
    - verification and manual QA matrices
    - required evidence artifacts for 10/10 claims
  - rewrote `docs/PRODUCTION-COMPACTION-HANDOFF.md` with stricter resume protocol and non-negotiables
- Updated `docs/PRODUCTION-SOURCE-OF-TRUTH.md`:
  - added explicit UX alignment contract section tying behavior decisions to audience/language/flow/success docs

### Validation

- `npm run type-check`
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run lint`
- `npm test` (57 passing)
- `npm run verify:ios-readiness`
- `npm run build` fails in this environment under Node `v25.3.0` with webpack `WasmHash` crash (`TypeError` in `next/dist/compiled/webpack/bundle5.js`). Project engine remains `>=20.10 <25`.

---

## UX Flow Clarity Pass C (2026-02-13)

### What Changed

- Replaced forced homepage auto-redirect to active route with a visible resume CTA:
  - homepage now keeps user agency and shows `CONTINUE MY DEVOTIONAL` when an active path exists
  - file: `src/app/page.tsx`
- Improved homepage copy clarity and reduced repetitive placeholder language:
  - refreshed How-it-Works body text
  - refreshed Featured Series support copy
  - updated featured card support line to use series question
  - refined FAQ lead copy
  - file: `src/app/page.tsx`
- Strengthened Soul Audit option-card disabled affordance:
  - clearer locked visual treatment and unlock hint text before consent
  - files:
    - `src/app/soul-audit/results/page.tsx`
    - `src/app/globals.css`
- Improved mobile FAQ readability:
  - FAQ answers now remain visible on mobile for lower-friction scan behavior
  - file: `src/app/globals.css`
- Added explicit locked-day guidance on series list cards:
  - locked items now render an inline unlock explanation
  - file: `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
- Added style support for homepage active-path banner:
  - file: `src/app/globals.css`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test`
- `npm run verify:production-contracts`
- `npm run verify:tracking`

---

## Production Tracking + 10/10 Quality Governance Hardening (2026-02-13)

### What Changed

- Added a machine-enforced tracking integrity layer:
  - New script: `scripts/check-tracking-integrity.mjs`
  - New npm script: `npm run verify:tracking`
  - Enforces:
    - required production tracking docs exist
    - `CLAUDE.md` includes required production references
    - `package.json` semver and `CHANGELOG.md` version marker stay aligned
    - pre-commit and CI both execute tracking verification
- Wired tracking verification into enforcement points:
  - `.husky/pre-commit` now runs `npm run verify:tracking`
  - `.github/workflows/ci.yml` now runs `npm run verify:tracking`
- Expanded machine contracts in `docs/production-decisions.yaml`:
  - Added SA-010, SA-011, SA-012 (tracking spine, version sync, CLAUDE references)
  - Added required tracking docs + required CLAUDE references contract sections
- Strengthened documentation continuity and production planning:
  - Added `docs/PRODUCTION-FEATURE-SCORECARD.md` (feature-by-feature scored gap analysis)
  - Added `docs/PRODUCTION-10-10-PLAN.md` (category-by-category gap-to-10 remediation with acceptance criteria)
  - Added `docs/PRODUCTION-COMPACTION-HANDOFF.md` (strict resume/handoff runbook)
  - Updated `docs/PRODUCTION-SOURCE-OF-TRUTH.md` with tracking + versioning contract section
  - Updated `CLAUDE.md` with canonical tracking flow references

### Outcome

- Tracking, versioning, and continuity are now explicitly documented and enforced by automation in both local commit flow and CI.
- The project now has a production-grade scorecard + execution plan system for pushing each category to 10/10 with measurable criteria.

---

## Full 10/10 Phase Execution Pass A (2026-02-13)

### What Changed

- Rebuilt shared newspaper shell header behavior to match homepage interaction model across non-home routes:
  - docked sticky nav behavior via sentinel intersection
  - desktop topbar swaps center copy to navigation when docked
  - mobile topbar alternates date/copy every 1.5s before dock, then swaps to sticky nav + theme icon
  - masthead fit logic updated to scale EUANGELION to container width without clipping
  - file: `src/components/EuangelionShellHeader.tsx`
- Improved shell typography alignment:
  - `GOOD NEWS COMING` now keeps right padding aligned with masthead content bounds
  - file: `src/app/globals.css`
- Hardened Soul Audit staged API validation:
  - strict run id and option id format checks in consent/select routes
  - timezone string sanitization + timezone offset normalization before schedule policy resolution
  - stable 3+2 option-split enforcement in submit route (guard + fail-fast contract)
  - files:
    - `src/lib/api-security.ts`
    - `src/app/api/soul-audit/consent/route.ts`
    - `src/app/api/soul-audit/select/route.ts`
    - `src/app/api/soul-audit/submit/route.ts`
- Expanded regression coverage:
  - added API security helper tests
  - added option split assertions (3 AI + 2 prefab)
  - added invalid run/option id edge-case tests
  - files:
    - `__tests__/api-security.test.ts`
    - `__tests__/soul-audit-flow.test.ts`
    - `__tests__/soul-audit-edge-cases.test.ts`
- Updated production tracking artifacts with execution snapshot and revised scoring:
  - `docs/PRODUCTION-FEATURE-SCORECARD.md`
  - `docs/PRODUCTION-10-10-PLAN.md`
  - `docs/PRODUCTION-COMPACTION-HANDOFF.md`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (54 passing)
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:ios-readiness`
- `npm run build` currently fails in this environment under Node `v25.3.0` with webpack `WasmHash` crash. Project runtime guard remains `>=20.10 <25` (`package.json` engines, `.nvmrc` = `22`).

---

## Full 10/10 Phase Execution Pass B (2026-02-13)

### What Changed

- Hardened staged Soul Audit flow for session/cookie churn between submit -> consent -> select:
  - `verifyRunToken` and `verifyConsentToken` now support controlled session-mismatch fallback mode.
  - Consent/select routes now accept valid signed tokens even when cookie-backed session rotates, preventing false `run not found` / access denied dead-ends.
  - files:
    - `src/lib/soul-audit/run-token.ts`
    - `src/lib/soul-audit/consent-token.ts`
    - `src/app/api/soul-audit/consent/route.ts`
    - `src/app/api/soul-audit/select/route.ts`
- Fixed staged-token payload ceiling:
  - Increased body limits for staged routes to prevent 413 failures with signed run/consent tokens.
  - files:
    - `src/app/api/soul-audit/consent/route.ts`
    - `src/app/api/soul-audit/select/route.ts`
- Enforced stricter curated-first behavior:
  - Removed metadata-only fallback candidates so audit option/plan curation remains module-sourced.
  - file:
    - `src/lib/soul-audit/curation-engine.ts`
- Expanded regression coverage:
  - Added session-mismatch fallback tests for run and consent tokens.
  - Added staged flow test that simulates session token churn across submit/consent/select.
  - files:
    - `__tests__/soul-audit-run-token.test.ts`
    - `__tests__/soul-audit-consent-token.test.ts`
    - `__tests__/soul-audit-flow.test.ts`
- Updated production tracking artifacts for continuity:
  - `docs/PRODUCTION-10-10-PLAN.md`
  - `docs/PRODUCTION-FEATURE-SCORECARD.md`
  - `docs/PRODUCTION-COMPACTION-HANDOFF.md`

### Validation

- `npm run type-check`
- `npm run lint`
- `npm test` (57 passing)
- `npm run verify:production-contracts`
- `npm run verify:tracking`
- `npm run verify:ios-readiness`
- `npm run build` still fails in this environment under Node `v25.3.0` with webpack `WasmHash` crash.

---

## AI Devotional Left Rail: Next Days + Archive (2026-02-13)

### What Changed

- Added a persistent left rail to AI devotional results views (`/soul-audit/results?planToken=...`) with:
  - `NEXT DAYS` list for upcoming plan days (including onboarding progression from day 0 to upcoming locked days).
  - `ARCHIVE` list for prior AI devotional plans.
- Updated `src/app/soul-audit/results/page.tsx` to:
  - fetch archive data from `/api/soul-audit/archive`
  - build a merged day timeline from unlocked plan days + locked previews
  - render desktop sticky left rail and day anchor links for unlocked entries.

### Outcome

- Onboarding devotional and all AI devotional paths now surface upcoming days and prior plan archive in a consistent left-side navigation area.

---

## Global Newspaper-Bound Shell Pass (2026-02-13)

### What Changed

- Standardized all app routes onto the same bound newspaper container system used by the homepage look:
  - Updated global shell behavior for `.newspaper-home` and `.newspaper-reading` in `src/app/globals.css`:
    - fixed-width bounded frame
    - page border
    - consistent outer margin
    - viewport-safe minimum height
    - overflow clipping to prevent side-scroll
- Replaced remaining mixed navigation/page shells with unified masthead shell:
  - switched remaining routes from `Navigation`/plain `bg-page` wrappers to `EuangelionShellHeader`
  - applied across auth, settings, legal, offline, error/not-found, loading states, soul-audit routes, series, and devotional states.
- Brought loading and error states into the same visual system so every state maintains the newspaper-bound presentation.

### Outcome

- The site now uses a consistent homepage-style bound newspaper look across all major pages and state surfaces (normal, loading, error, offline).

---

## Left Library System: Archive + Bookmarks + Chat Notes + Favorite Verses (2026-02-13)

### What Changed

- Added persistent devotional library mechanics with left-menu navigation:
  - New component: `src/components/DevotionalLibraryRail.tsx`
  - Sections:
    - Archived Pages
    - Bookmarks
    - Chat Notes
    - Favorite Verses
- Upgraded `My Devotional` into a full library home (instead of placeholder fallback):
  - `src/app/my-devotional/page.tsx`
  - Supports `?tab=` deep links for left-menu sections.
- Added archive endpoint for curated plan history:
  - `GET /api/soul-audit/archive`
  - `src/app/api/soul-audit/archive/route.ts`
- Added repository support for persisted list/fallback/delete behavior:
  - `listPlanInstancesForSessionWithFallback`
  - `getAllPlanDaysWithFallback`
  - `listAnnotationsWithFallback`
  - `removeAnnotation`
  - `listBookmarksWithFallback`
  - `removeBookmark`
  - `src/lib/soul-audit/repository.ts`
- Added delete mechanics to APIs:
  - `DELETE /api/bookmarks?devotionalSlug=...`
  - `DELETE /api/annotations?annotationId=...`
  - Updated list endpoints to use fallback-backed retrieval.
- Added saved-note and favorite-verse capture from devotional/chat flows:
  - Chat assistant messages now support `Save note` action.
    - `src/components/ChatMessage.tsx`
    - `src/components/DevotionalChat.tsx`
  - Text selection popover now supports `Save Verse` (stored as highlight annotation with favorite-verse style metadata).
    - `src/components/TextHighlightTrigger.tsx`
  - Devotional pages now include explicit bookmark actions and left menu links to the library.
    - `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`

### Outcome

- Archive/bookmark/chat-note/favorite-verse sections are no longer passive concepts; they are functional, persisted features with create/list/remove mechanics.
- Users now have a consistent left-side library model for devotional history and saved artifacts.

---

## Personalized Devotional Home + Unified Masthead Shell (2026-02-13)

### What Changed

- Made post-audit behavior user-home driven:
  - `/` now resolves to the active devotional route when a current selection exists.
  - Added `GET /api/soul-audit/current` to resolve the current devotional route from cookie/session-backed data.
  - Added persistent current-route cookie writes in `POST /api/soul-audit/select`.
- Added dedicated user-home route:
  - New page: `src/app/my-devotional/page.tsx`
  - Redirects to active devotional route when available; otherwise prompts to start Soul Audit.
- Added repository fallback helpers for session-aware navigation recovery:
  - `listAuditRunsForSessionWithFallback`
  - `getLatestSelectionForSessionWithFallback`
  - `listPlanInstancesForSession`
  - `getLatestPlanInstanceForSessionWithFallback`
- Introduced shared newspaper masthead shell:
  - New component: `src/components/EuangelionShellHeader.tsx`
  - Applied to:
    - `src/app/soul-audit/page.tsx`
    - `src/app/soul-audit/results/page.tsx`
    - `src/app/wake-up/page.tsx`
    - `src/app/series/page.tsx`
    - `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
    - `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
- Navigation consistency updates:
  - Added `My Devotional` navigation target.
  - Normalized `Settings` label.
  - Added `/my-devotional` to sitemap.

### Outcome

- The curated daily devotional now has a stable home destination and is reachable from primary navigation.
- Devotional/home surfaces share a consistent Euangelion-first newspaper masthead structure.

---

## Generated Image Removal (2026-02-13)

### What Changed

- Removed all generated image asset directories and files from the app bundle:
  - `public/images/illustrations/generated/`
  - `public/images/devotionals/`
  - `public/images/series/`
  - `public/devotionals/wU1-legnext.png`
- Removed stale generated-image mappings and references:
  - deleted `src/data/devotional-images.ts`
  - removed all series `heroImage` references that pointed to deleted generated/devotional image files
- Hard-disabled runtime illustration generation endpoint:
  - `src/app/api/illustrations/generate/route.ts` now returns `410` (`ILLUSTRATION_GENERATION_REMOVED`)

### Outcome

- The site no longer serves or requests generated devotional/series illustration files.
- Any call to the generation endpoint is explicitly blocked.

---

## Soul Audit Reliability + Day-Lock Toggle + Longer Curation (2026-02-13)

### What Changed

- Added stateless Soul Audit run-token fallback so consent/selection still work when runtime memory is cold:
  - New: `src/lib/soul-audit/run-token.ts`
  - Updated:
    - `src/app/api/soul-audit/submit/route.ts` (now returns `runToken`)
    - `src/app/api/soul-audit/consent/route.ts` (run-token verification fallback)
    - `src/app/api/soul-audit/select/route.ts` (run-token + option fallback)
    - `src/types/soul-audit.ts`
- Improved results-page resilience by caching generated plan days in session storage and hydrating from cached plan data when API fetches fail:
  - `src/app/soul-audit/results/page.tsx`
- Added day-locking toggle (default OFF for testing) with client + server parity:
  - New: `src/lib/day-locking.ts`
  - Updated:
    - `src/stores/settingsStore.ts` (`dayLockingEnabled`)
    - `src/app/settings/page.tsx` (Testing toggle UI + cookie sync)
    - `src/lib/day-gating.ts` (client day-gate bypass when toggle OFF)
    - `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
    - `src/app/api/devotional-plan/[token]/day/[n]/route.ts` (server day-lock bypass)
    - `.env.example` (`DAY_LOCKING_DEFAULT`, `SOUL_AUDIT_RUN_TOKEN_SECRET`)
- Extended curated devotional output length and depth:
  - richer reflection/prayer/next-step/journal assembly with reference grounding
  - `src/lib/soul-audit/curated-builder.ts`
- Added weekday-specific onboarding variants for Wednesday/Thursday/Friday starts:
  - schedule now computes `onboardingVariant` + `onboardingDays`
  - `src/lib/soul-audit/schedule.ts`
  - `src/app/api/soul-audit/select/route.ts`
- Hardened curated candidate generation fallback so option creation does not collapse when module extraction is sparse:
  - `src/lib/soul-audit/curated-catalog.ts`
  - `src/lib/soul-audit/curation-engine.ts`
- Fixed build/type blockers introduced in iOS + billing integration:
  - `capacitor.config.ts` (removed deprecated `bundledWebRuntime`)
  - `src/lib/billing/purchases.ts` (RevenueCat offerings API typing fix)
  - `src/app/api/chat/route.ts` (nullable highlight typing fix)

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run verify:production-contracts`
- `npm run verify:ios-readiness`
- `npm run build`

---

## Editorial Motion + Type-First Imagery Pass (2026-02-13)

### What Changed

- Added a global editorial motion system that auto-applies:
  - scroll-based type reveal for paragraph/headline/list text blocks,
  - staggered `strong`/`em` emphasis reveal treatment,
  - line animations for links and buttons across mock/newspaper surfaces.
  - Files:
    - `src/components/EditorialMotionSystem.tsx`
    - `src/app/providers.tsx`
    - `src/app/globals.css`
- Removed non-essential runtime imagery from reading flows so typography leads:
  - devotional hero is now typography-first only (removed dynamic image hero),
  - devotional panel image blocks removed,
  - visual/art modules now render textual metadata + prompts without image rendering,
  - series cards now use typographic preview blocks instead of image thumbnails.
  - Files:
    - `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
    - `src/components/modules/VisualModule.tsx`
    - `src/components/modules/ArtModule.tsx`
    - `src/app/series/page.tsx`
- Added Node runtime guard for build consistency:
  - `package.json` engines now enforce `>=20.10 <25`,
  - `.nvmrc` added (`22`).

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run verify:production-contracts`
- `npm run build` currently fails in this environment on Node `v25.3.0` with webpack `WasmHash` crash; runtime is now guarded to prevent this mismatch.

---

## Soul Audit Curation Visibility + Personalized Onboarding (2026-02-13)

### What Changed

- Replaced static Wed-Sun onboarding devotional with a curated personalized onboarding day derived from the generated plan + user response:
  - `src/lib/soul-audit/curated-builder.ts`
  - `src/app/api/soul-audit/select/route.ts`
- Added locked-day preview support so users can immediately see their crafted 5-day structure even before unlock time:
  - `src/app/api/devotional-plan/[token]/day/[n]/route.ts` (`?preview=1`)
  - `src/app/soul-audit/results/page.tsx`
- Improved AI option matching signals and reasoning text so options reflect user language more clearly (including overload/burnout semantic hints):
  - `src/lib/soul-audit/matching.ts`
- Bumped service worker cache namespace `euangelion-v42` -> `euangelion-v43` to force delivery of the curation/render updates:
  - `public/sw.js`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm run test -- __tests__/soul-audit-flow.test.ts __tests__/soul-audit-edge-cases.test.ts __tests__/soul-audit-schedule.test.ts`
- `npm run verify:production-contracts`

---

## Audit Results Reliability + Click Affordance Pass (2026-02-13)

### What Changed

- Fixed Soul Audit run/plan lookup reliability across route hops and process restarts by adding Supabase read-fallbacks for:
  - `audit_runs`, `audit_options`, `consent_records`, `audit_selections`
  - `devotional_plan_instances`, `devotional_plan_days`
  - File: `src/lib/soul-audit/repository.ts`
- Updated staged API routes to use fallback-aware getters so selection and plan rendering no longer depend only on in-memory state:
  - `src/app/api/soul-audit/consent/route.ts`
  - `src/app/api/soul-audit/select/route.ts`
  - `src/app/api/devotional-plan/[token]/day/[n]/route.ts`
- Improved Soul Audit results UX for click clarity:
  - Added animated, hover/focus-lift option cards with underline sweep and explicit click hint text.
  - Added stale-run recovery path with “Restart Soul Audit” action when a run has expired/not found.
  - Files: `src/app/soul-audit/results/page.tsx`, `src/app/globals.css`
- Bumped service worker cache namespace `euangelion-v41` -> `euangelion-v42` so clients receive the audit/render + interaction updates immediately:
  - `public/sw.js`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm run test -- __tests__/soul-audit-flow.test.ts __tests__/soul-audit-edge-cases.test.ts`
- `npm run verify:production-contracts`

---

## Soul Audit Real-Time Module Curation Fix (2026-02-13)

### What Changed

- Switched AI option generation away from curated-catalog availability checks so submit returns the expected 3 AI + 2 prefab options when series metadata is present:
  - `src/lib/soul-audit/matching.ts`
- Rebuilt AI devotional construction to assemble each day from real-time module candidates across curated repository resources (module-level selection), instead of binding AI selection to one prebuilt series/day track:
  - `src/lib/soul-audit/curated-builder.ts`
- Removed select-route hard dependency that blocked AI plan creation when a specific curated series slug was unavailable, while preserving fail-closed behavior for missing required core modules:
  - `src/app/api/soul-audit/select/route.ts`
- Preserved curated-first policy:
  - core modules stay curated (`scripture`, `teaching`, `reflection`, `prayer`)
  - generation remains assistive polish only
  - local reference-volume grounding remains enforced

### Validation

- `npm run lint`
- `npm run type-check`
- `npm run test -- __tests__/soul-audit-flow.test.ts __tests__/soul-audit-edge-cases.test.ts`
- `npm run verify:production-contracts`

---

## Soul Audit + Devotional Engine Consolidation (2026-02-13)

### What Changed

- Replaced monolithic Soul Audit behavior with staged contracts:
  - `POST /api/soul-audit/submit` now returns option previews only (no eager full plan payload).
  - `POST /api/soul-audit/consent` records essential consent + optional analytics opt-in (default OFF) and enforces crisis acknowledgement.
  - `POST /api/soul-audit/select` locks choice and branches:
    - AI primary option => generates devotional plan after selection.
    - Curated prefab option => routes to series overview.
- Added day-level devotional plan endpoint and scheduling policy:
  - `GET /api/devotional-plan/[token]/day/[n]`
  - Monday start => normal cycle
  - Tuesday start => Monday readable as archived
  - Wednesday-Sunday start => onboarding day before Monday cycle
  - 7:00 AM local-time unlock cadence enforced.
- Implemented curated-first devotional builder and local-corpus grounding:
  - Added curated catalog loader with source priority:
    - `content/approved` -> `content/final` -> `content/series-json`
  - Added fail-closed validation for missing curated core modules.
  - Limited adaptive generation to assistive polishing around curated modules.
  - Added structured endnotes per generated day.
- Added local reference-volume retriever and connected endnote sourcing:
  - `src/lib/soul-audit/reference-volumes.ts`
  - Grounding restricted to local repository corpus (no internet retrieval).
- Added mock-account and user artifact API scaffolding:
  - `POST/GET /api/mock-account/session`
  - `GET /api/mock-account/export` (mock account + analytics opt-in required)
  - `POST/GET /api/annotations`
  - `POST/GET /api/bookmarks`
- Hardened study chat constraints in `src/app/api/chat/route.ts`:
  - Requires devotional/highlight context.
  - Injects only local devotional + local reference context.
  - Explicitly blocks external retrieval behavior in system prompt.
- Added governance system and machine-enforced drift checks:
  - `docs/PRODUCTION-SOURCE-OF-TRUTH.md`
  - `docs/production-decisions.yaml`
  - `scripts/check-production-contracts.mjs`
  - CI now fails when production contracts drift (`npm run verify:production-contracts`).
  - Pre-commit now runs production contract verification.
  - Commit-msg gate added: feature commits must reference decision id format `SA-###`.
- Added schema migration for staged Soul Audit/plan/account artifacts:
  - `supabase/migrations/20260213000001_soul_audit_engine_consolidation.sql`
  - New entities include:
    - `audit_runs`, `audit_options`, `consent_records`, `audit_selections`
    - `devotional_plan_instances`, `devotional_plan_days`, `devotional_day_citations`
    - `annotations`, `session_bookmarks`, `mock_account_sessions`
- Updated frontend selection-first flow:
  - `src/app/page.tsx` and `src/app/soul-audit/page.tsx` now submit to `/api/soul-audit/submit`.
  - `src/app/soul-audit/results/page.tsx` rebuilt to:
    - render exactly 5 choices (3 AI primary + 2 curated prefab),
    - enforce consent/crisis acknowledgement before selection,
    - render plan content only after successful option selection.

### Validation

- `npm run lint`
- `npm run type-check`
- `npm run verify:production-contracts`
- `npm test`

---

## Curation + Scroll/Sticky Reliability Hotfix (2026-02-13)

### What Changed

- Fixed curated-option fallback so Soul Audit can still curate when runtime cannot read `content/*` paths directly:
  - Added runtime-safe catalog fallback from bundled `public/devotionals/*.json` + `SERIES_DATA`.
  - Added panel-to-module normalization for legacy devotional files (`panels` -> synthetic `scripture/teaching/reflection/prayer` modules).
  - File: `src/lib/soul-audit/curated-catalog.ts`
- Updated Soul Audit empty-catalog error copy to clearer retry language:
  - File: `src/app/api/soul-audit/submit/route.ts`
- Fixed persistent scroll-lock issue caused by mobile menu overflow state:
  - Added cleanup reset for `document.body.style.overflow` in navigation effect.
  - Added defensive overflow reset on homepage mount.
  - Files: `src/components/Navigation.tsx`, `src/app/page.tsx`
- Improved sticky/nav reliability on homepage newspaper shell:
  - Switched `.mock-home` horizontal overflow from `clip` to `hidden` to avoid sticky inconsistencies on some browsers.
  - Added sticky fallback positioning for `.mock-nav`.
  - File: `src/app/globals.css`
- Bumped service worker cache namespace `euangelion-v40` -> `euangelion-v41` so clients pick up the fixes immediately:
  - File: `public/sw.js`

### Validation

- `npm run lint`
- `npm run type-check`
- `npm test`
- `npm run verify:production-contracts`

---

## Mockup Proportion Alignment Pass 2 (2026-02-12)

### What Changed

- Tuned the exact homepage implementation for closer proportional parity with the reference comp:
  - Increased global type scale using fixed mockup tokens so all serif copy remains legible and scales consistently by section
  - Removed masthead letter spacing and disabled kerning adjustments so `EUANGELION` tracks edge-to-edge like the mockup
  - Tightened masthead padding and adjusted line-height/width treatment for a denser top lockup
  - Resized + centered both mastheads so `EUANGELION` fills the container width without overflow clipping on responsive breakpoints
  - Removed fixed masthead section heights so both top and bottom `EUANGELION` containers are content-driven (`auto`) and no longer clip vertically
  - Switched masthead word sizing to container-based scale and applied edge compensation so the word now fills left and right edges without extra side gap
  - Increased masthead scale substantially with browser-safe `vw` fallback + `cqi` enhancement so `EUANGELION` consistently fills the full container width and remains centered
  - Rebalanced masthead sizing to a fully fluid (non-fixed-feeling) scale to prevent oversized rendering while still filling the row proportionally across viewport sizes
  - Added live masthead fit logic that measures each `EUANGELION` lockup and applies dynamic horizontal scaling so the word fills the container edge-to-edge without clipping
  - Removed horizontal glyph stretching and switched masthead fit to dynamic natural-size font scaling (no distorted letter proportions)
  - Increased `GOOD NEWS COMING` sizing and right-edge alignment under the masthead lockup
- Restored sticky newspaper header behavior:
  - Top date rail is sticky
  - Main nav now hands off into the sticky top rail and replaces the center “Daily Devotionals…” line when scrolled
  - Mobile sticky behavior now moves nav into the top rail on scroll
  - Replaced scroll-position docking logic with an `IntersectionObserver` sentinel so nav handoff triggers reliably at the sticky threshold
- Implemented mobile top-rail rotation:
  - Date/time, subtitle, and mode toggle now fade between each other instead of stacking
  - One item visible at a time with a 1.5s fade transition
- Confirmed image containers remain flush (no added internal padding) for hero engraving, step images, and featured media frames.
- Adjusted masthead subline alignment and sizing:
  - `GOOD NEWS COMING` now aligns to the same right edge as the `EUANGELION` lockup
  - Mobile subline size reduced to roughly half its previous visual size
- Mobile “How this works” step row now follows requested proportions:
  - Image column set to ~1/3 and text column to ~2/3
  - Added clear card separators between each step text container on mobile
- Increased homepage mobile body-copy sizing for readability:
  - Larger paragraph text across hero/supporting copy, step descriptions, featured descriptions, FAQ answers, and CTA supporting text
  - Kept labels/meta typography unchanged so hierarchy remains intact
- Converted `Featured Series` into a mobile carousel:
  - Horizontal swipe rail with snap scrolling on cards
  - Desktop 3-column newspaper grid remains unchanged
- Updated mobile FAQ section behavior:
  - Renamed FAQ lead headline to reduce duplicate wording with the hero prompt
  - Mobile now renders all FAQ questions instead of the 3-card window
  - Removed FAQ arrow controls on mobile (desktop arrows remain)
- Reduced bottom padding in “How this works” numbered text containers for tighter vertical rhythm (desktop + mobile).
- Fixed masthead clipping on `EUANGELION`:
  - Added fit-calculation safety margin to avoid sub-pixel edge cutoffs
  - Removed hard overflow clipping on the masthead container
  - Increased masthead line-height to prevent vertical glyph cropping
- Added explicit Soul Audit reset controls for QA/testing:
  - New persisted store action `resetAudit` resets audit count + cached audit data
  - Reset controls added to homepage audit blocks and `/soul-audit` page states
  - Reset also clears session-stored latest audit result payload
- Simplified and cleaned nav rendering paths:
  - Main nav now uses a single active render path per viewport to avoid duplicate menu rows
  - Sticky handoff keeps exactly one visible nav strip at a time
  - Mobile theme icon placement remains in nav while duplicate menu wrappers were removed
- Desktop hero composition tweak:
  - Moved the left engraving panel to the right side of the hero row (`WHAT IS THIS PLACE?` / `SOUL AUDIT` now lead left-to-right before the image)
  - Preserved mobile stacking behavior
- Rebuilt the “How this works” card internals in `src/app/page.tsx` and `src/app/globals.css`:
  - Step illustrations now sit on the left side of each card
  - Images run full-height within the box with a dedicated vertical divider
  - Text block is isolated to the right side to preserve mockup proportions
- Updated FAQ highlight behavior in `src/app/page.tsx`:
  - Removed hardcoded always-active blue FAQ card so highlight state is now interaction-driven only (hover/focus/tap behavior)
- Bumped service worker cache namespace from `euangelion-v23` -> `euangelion-v24` in `public/sw.js` so clients pick up the latest layout calibration immediately.
- Bumped service worker cache namespace from `euangelion-v24` -> `euangelion-v25` in `public/sw.js` for the masthead sizing/centering refresh.
- Bumped service worker cache namespace from `euangelion-v25` -> `euangelion-v26` in `public/sw.js` for the masthead auto-height + edge-fill correction.
- Bumped service worker cache namespace from `euangelion-v26` -> `euangelion-v27` in `public/sw.js` for the larger full-width masthead sizing refresh.
- Bumped service worker cache namespace from `euangelion-v27` -> `euangelion-v28` in `public/sw.js` for the fluid masthead scaling adjustment.
- Bumped service worker cache namespace from `euangelion-v28` -> `euangelion-v29` in `public/sw.js` for the dynamic edge-to-edge masthead fit update.
- Bumped service worker cache namespace from `euangelion-v29` -> `euangelion-v30` in `public/sw.js` for sticky header + natural masthead fit refresh.
- Bumped service worker cache namespace from `euangelion-v30` -> `euangelion-v31` in `public/sw.js` for sticky-nav observer + image-padding correction refresh.
- Bumped service worker cache namespace from `euangelion-v31` -> `euangelion-v32` in `public/sw.js` for masthead subline alignment + mobile size correction.
- Bumped service worker cache namespace from `euangelion-v32` -> `euangelion-v33` in `public/sw.js` for mobile step-grid proportion + separator updates.
- Bumped service worker cache namespace from `euangelion-v33` -> `euangelion-v34` in `public/sw.js` for mobile body-copy size refresh.
- Bumped service worker cache namespace from `euangelion-v34` -> `euangelion-v35` in `public/sw.js` for mobile featured carousel refresh.
- Bumped service worker cache namespace from `euangelion-v35` -> `euangelion-v36` in `public/sw.js` for mobile FAQ all-questions + no-arrows refresh.
- Bumped service worker cache namespace from `euangelion-v36` -> `euangelion-v37` in `public/sw.js` for step-card bottom-padding refinement.
- Bumped service worker cache namespace from `euangelion-v37` -> `euangelion-v38` in `public/sw.js` for masthead clipping fix refresh.
- Bumped service worker cache namespace from `euangelion-v38` -> `euangelion-v39` in `public/sw.js` for nav cleanup + audit reset controls refresh.
- Bumped service worker cache namespace from `euangelion-v39` -> `euangelion-v40` in `public/sw.js` for desktop hero panel-order refresh.

### Validation

- `npm run lint`
- `npm run type-check`

---

## Exact Homepage Mockup Reconstruction (2026-02-12)

### What Changed

- Rebuilt `/src/app/page.tsx` to match the provided newspaper mockup layout exactly:
  - Top date rail + centered subtitle + right dark-mode control
  - Full-width `EUANGELION` masthead + `GOOD NEWS COMING`
  - Inline nav row (`HOME | SOUL AUDIT | WAKE-UP | SERIES | SETTING`)
  - Hero triptych (engraving panel + left intro copy + right Soul Audit form)
  - “How this works” headline and 3 step cards
  - 3x2 featured devotional grid with mockup-style card geometry
  - Centered “More Devotionals” strip
  - FAQ/quote row with hover/tap answer reveal behavior
  - Bottom CTA block and full-width closing `EUANGELION`
- Added dedicated exact-match style system in `/src/app/globals.css` under `EXACT MOCKUP HOMEPAGE`:
  - Mockup-specific color tokens for light and dark variants
  - Border cadence, panel sizing, typography scale, and spacing tuned to the Illustrator composition
  - Mobile fallback that preserves structure without horizontal overflow
- Ensured masthead treatment uses Industry (UI stack) and body/copy uses Instrument Serif.
- Removed forced smooth-scroll behavior in app providers (native browser scroll restored).
- Bumped service worker cache namespace from `euangelion-v20` -> `euangelion-v21` in `/public/sw.js` to force refresh of the rebuilt homepage.
- Corrected desktop grid collapse bug by lowering mockup breakpoint from `1200px` to `980px` so 3-column newspaper layout remains intact on laptop/desktop widths.
- Reinforced section grid boundaries (`How this works` + `Featured Series`) with explicit top rule lines for stronger newspaper grid legibility.
- Bumped service worker cache namespace from `euangelion-v21` -> `euangelion-v22` in `/public/sw.js` to force latest grid CSS refresh.
- Performed strict proportion calibration against the mockup reference:
  - Expanded frame to near full-bleed desktop width (`~1860px`) with tighter outer margin
  - Added fixed section geometry variables for rails, hero, headers, cards, FAQ row, CTA, and bottom masthead band
  - Re-tuned typography scale/line-height by section to match mock hierarchy and vertical rhythm
  - Locked featured card row heights and media box dimensions for consistent newspaper grid cadence
  - Tightened stroke weights and panel paddings to remove fluid/haphazard spacing drift
- Bumped service worker cache namespace from `euangelion-v22` -> `euangelion-v23` in `/public/sw.js` to force immediate pickup of calibrated proportions.

### Validation

- `npm run lint`
- `npm run type-check`
- `npm run build`

---

## Newspaper Rebuild v3 + Illustration Pipeline Scaffold (2026-02-12)

### What Changed

- Implemented reusable newspaper system components:
  - `src/components/newspaper/IllustrationFrame.tsx`
  - `src/components/newspaper/WordblockPanel.tsx`
  - `src/components/newspaper/PrintRail.tsx`
  - `src/components/newspaper/FaqHoverCard.tsx`
  - `src/components/newspaper/DevotionalMilestoneReveal.tsx`
- Reworked homepage composition in `src/app/page.tsx`:
  - Added print-style illustration slots in hero, flow, featured, FAQ, and CTA
  - Added “word as art” support panel treatment
  - Converted Featured Series to horizontal auto-rotating `PrintRail`
  - Converted FAQ to horizontal auto-rotating `PrintRail` with `FaqHoverCard` hover/focus reveal and tap toggle on mobile
  - Kept Soul Audit above fold and preserved existing submit/match logic
  - Added full-width bottom `EUANGELION` wordmark section
- Expanded print treatments and interaction styles in `src/app/globals.css`:
  - Added Industry font-face support and switched UI/meta stack to Industry
  - Added print effects: `effect-woodblock`, `effect-halftone`, `effect-dither`, `effect-ink`
  - Added illustration framing, rail controls, dots, and FAQ reveal motion
  - Maintained no-glow/rim-light treatment
- Added Industry font files and illustration assets:
  - `public/fonts/IndustryTest-Book.otf`
  - `public/fonts/IndustryTest-Demi.otf`
  - `public/fonts/IndustryTest-Bold.otf`
  - `public/images/illustrations/*` (from `user-references/illustrations`)
  - `public/images/illustrations/placeholder-ink-block.svg`
- Executed live Gemini image generation batch (7/7 success) and wired generated outputs into active UI:
  - `public/images/illustrations/generated/home-hero-generated.png`
  - `public/images/illustrations/generated/home-flow-generated.png`
  - `public/images/illustrations/generated/home-featured-generated.png`
  - `public/images/illustrations/generated/home-faq-generated.png`
  - `public/images/illustrations/generated/wakeup-hero-generated.png`
  - `public/images/illustrations/generated/series-hero-generated.png`
  - `public/images/illustrations/generated/devotional-milestone-generated.png`
  - `public/images/illustrations/generated/generation-summary.json`
- Extended motion config in `src/lib/animation-config.ts`:
  - Added `editorialSubtle` and `devotionalCinematic` profiles
  - Added rail timing tokens
  - Removed hover glow effect fallback
- Added illustration generation service scaffold:
  - `src/lib/illustrations/provider.ts`
  - `src/lib/illustrations/prompt-presets.ts`
  - `src/lib/illustrations/nanobanana.ts`
  - `src/app/api/illustrations/generate/route.ts`
  - Supports validated prompt payloads, rate limiting, Nano-Banana provider calls, Supabase Storage upload, metadata insert, and fallback asset chain
- Added persistence schema for generated illustration metadata:
  - `supabase/migrations/20260212000001_create_generated_illustrations.sql`
  - `database/migrations/008_create_generated_illustrations.sql`
- Applied newspaper styling pass to key routes:
  - `src/app/wake-up/page.tsx`
  - `src/app/wake-up/series/[slug]/SeriesPageClient.tsx`
  - `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
  - `src/app/series/page.tsx`
  - `src/app/soul-audit/page.tsx`
  - `src/app/soul-audit/results/page.tsx`
- Updated environment template in `.env.example` with Nano-Banana and Supabase server variables.
- Bumped service worker cache namespace from `euangelion-v19` -> `euangelion-v20` in `public/sw.js`.

### Validation

- `npm run lint`
- `npm run type-check`
- `npm run build`

---

## Dark Newspaper UX Consolidation Pass (2026-02-11)

### What Changed

- Reworked newspaper dark mode to the selected visual direction in `src/app/globals.css`:
  - Dark paper base set to deep navy-black (`#0B1420`)
  - Primary ink switched to crisp off-white (`#E9EEF5`)
  - Accent switched to classic gold-ink replacement (`#C8A56A`)
  - Removed rim-light style gradients and blur-driven rail glow
  - Increased rule hierarchy to stronger newspaper lines (1px body rules + 2px section/divider rules)
  - Kept medium paper texture visibility without glow effects
- Standardized typography intent:
  - Main body remains Instrument Serif
  - UI labels/callouts/nav moved to secondary UI stack (`Space Grotesk` first in stack) in:
    - `src/app/globals.css`
    - `design-system/typography-craft.css`
- Added two interaction systems in `src/app/globals.css`:
  - `cta-major`: lined-box CTA with border-draw animation + subtle print-offset motion
  - Contextual small-link interactions:
    - `animated-underline` for nav/standard links (underline draw + slight lift)
    - `link-highlight` for editorial/key callouts (flat marker swipe, no glow)
- Applied interaction/style cleanup across homepage + devotional surfaces:
  - Homepage CTA/section/rule updates in `src/app/page.tsx`
  - Soul Audit page CTA + headline simplification updates in `src/app/soul-audit/page.tsx`
  - Soul Audit results link treatment updates in `src/app/soul-audit/results/page.tsx`
  - Devotional reading/nav/CTA/rule updates in `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`
  - Navigation rail/menu border treatment cleanup in `src/components/Navigation.tsx`
  - Removed glow-like shadows from reading-side overlays/controls in:
    - `src/components/DevotionalChat.tsx`
    - `src/components/TextHighlightTrigger.tsx`
    - `src/components/ShareButton.tsx` (underlined interaction pass)
- Updated PWA theme color in `src/app/layout.tsx` to match dark paper base.
- Bumped service worker cache namespace from `euangelion-v18` -> `euangelion-v19` in `public/sw.js` so styling changes propagate immediately.

### Validation

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

---

## Soul Audit Full 5-Day Plan Generation (2026-02-11)

### What Changed

- Reworked Soul Audit generation to return a full temporary 5-day custom plan in `src/app/api/soul-audit/route.ts`:
  - Added `custom_plan` generation contract (5 structured days: scripture, reflection, prayer, next step, journal prompt)
  - Enforced chiastic day arc labeling (`A`, `B`, `C`, `B'`, `A'`) across day output
  - Added robust fallback generator that still produces a complete 5-day plan when AI is unavailable
  - Kept ranked series matches as secondary pathways
- Added new shared types in `src/types/soul-audit.ts`:
  - `CustomPlan`, `CustomPlanDay`, and `ChiasticPosition`
  - `SoulAuditResponse.customPlan` for first-class 5-day output
  - Backward compatibility maintained for legacy `customDevotional` payloads
- Updated homepage Soul Audit flow in `src/app/page.tsx`:
  - Normalizes + stores `customPlan` payload in session storage
  - Results block now shows Day 1 full devotional content plus a visible outline of all 5 generated days
  - Updated copy from single-day custom devotional language to custom 5-day plan language
- Updated dedicated Soul Audit route flow:
  - `src/app/soul-audit/page.tsx` now normalizes legacy and new payloads to `customPlan`
  - `src/app/soul-audit/results/page.tsx` now renders the full 5-day plan day-by-day (not just a single day)
- Made generated plans temporary by default in `src/stores/soulAuditStore.ts`:
  - Persisted store now keeps only `auditCount`
  - Generated plan content remains session-scoped instead of durable local persistence
- Bumped service worker cache namespace from `euangelion-v17` -> `euangelion-v18` in `public/sw.js` so clients pick up the new audit behavior immediately

### Validation

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

---

## Homepage Header Flow + Scale Pass (2026-02-11)

### What Changed

- Reworked homepage header behavior in `src/app/page.tsx`:
  - Replaced `HOME EDITION` rail text with live current date/time
  - Replaced center rail copy with `DAILY DEVOTIONAL AND HONEST REFLECTION`
  - Replaced right rail slot with a dark-mode toggle button
  - Removed the subheading block: `A daily paper for your soul...`
  - Renamed `LEAD STORY` to `START HERE`
  - Increased hero lead typography (`Find your next faithful step today` + supporting copy)
- Added sticky/nav handoff behavior:
  - Top meta rail stays sticky
  - Masthead scrolls normally
  - Primary nav below masthead transitions out as scroll passes threshold
  - Meta rail center swaps from tagline to nav links (replacing the center text on scroll)
- Replaced hover-only masthead interaction with ticker-style masthead animation:
  - Continuous horizontal marquee: `EUANGELION • GOOD NEWS`
- Updated `src/components/Navigation.tsx` with `showThemeToggle` prop so homepage can own dark-mode control in the top rail
- Increased global typography utility scale in `src/app/globals.css` (`vw-heading-*`, `vw-body*`, `vw-small`) for larger text across the site
- Restored dark-mode behavior for the newspaper theme by adding `.dark .newspaper-home` token overrides and dark card treatment
- Bumped service worker cache namespace from `euangelion-v7` -> `euangelion-v8` in `public/sw.js` so clients pick up interaction and sticky/navigation fixes immediately

### Interaction Stability Follow-up (2026-02-11)

- Moved sticky meta rail outside the animated header block in `src/app/page.tsx` to restore reliable sticky behavior
- Hardened clickable behavior for top rail nav/theme controls in `src/app/globals.css`:
  - Raised sticky rail z-index to top layer
  - Enforced pointer-events on nav links and dark-mode control
  - Added explicit sticky fallback (`position: -webkit-sticky`)
- Added explicit `type="button"` on the top dark-mode control to avoid accidental form semantics

### Above-the-Fold Soul Audit Pass (2026-02-11)

- Compressed homepage hero vertical stack in `src/app/page.tsx` so the full Soul Audit block fits above the fold on desktop:
  - Reduced masthead height footprint and nav spacing
  - Tightened top section padding/gaps
  - Reduced lead-story copy block vertical rhythm
  - Compacted Soul Audit card (padding, heading size, textarea rows, CTA height)
- Bumped service worker cache namespace from `euangelion-v8` -> `euangelion-v9` in `public/sw.js` so fold/layout updates are immediately visible

### Newspaper System Expansion + Ticker Rebuild (2026-02-11)

- Rebuilt homepage masthead animation as a ticker-strip system in `src/app/page.tsx` + `src/app/globals.css`:
  - Segment-based marquee track with repeated items (`EUANGELION`, `GOOD NEWS`, `DAILY BREAD`)
  - Ticker-chip visual treatment to match modern headline-ticker style
  - Reduced mobile masthead size to fit viewport width more reliably
- Expanded newspaper feel site-wide:
  - Added global newsprint surface treatment to `<body>` via `newsprint-site` class in `src/app/layout.tsx`
  - Added cross-site paper grain/fiber background layering in `src/app/globals.css`
- Improved dark mode palette consistency across the app:
  - Updated global `.dark` semantic tokens to align with the successful Wake-Up dark palette direction
  - Aligned `.dark .newspaper-home` tokens to the same tonal family
- Fixed light-mode mobile navigation usability in `src/components/Navigation.tsx`:
  - Replaced hard-coded dark drawer (`bg-tehom`) with semantic page surface
  - Improved close/button/link color contrast in light mode
- Desktop devotional layout pass in `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`:
  - Centered hero/content/navigation/footer containers
  - Increased readable content width while keeping prose constrained
  - Added `newspaper-reading` wrapper and associated typography/layout refinements
  - Preserved mobile devotional flow while improving desktop reading balance
- Overflow/viewport hardening in `src/app/globals.css`:
  - Added `overflow-x: hidden` + width constraints on `html`/`body`
  - Prevented horizontal side scrolling from ticker/layout overflow
- Bumped service worker cache namespace from `euangelion-v10` -> `euangelion-v11` in `public/sw.js` so latest interaction updates are immediately visible

### Innovation UX Pass (2026-02-11)

- Added high-leverage Soul Audit interaction improvements in `src/app/page.tsx`:
  - Rotating intelligent prompt text for quicker first sentence momentum
  - Keyboard shortcut `/` to jump focus to Soul Audit input
  - Keyboard shortcut `Cmd/Ctrl + Enter` to submit the audit
  - Live word count + readiness meter to guide completion without extra friction
- Upgraded ticker polish in `src/app/globals.css`:
  - Added edge mask fade, reduced-motion fallback, and chip-styled ticker units
  - Improved marquee smoothness with track-level animation + will-change optimization

### Split-Flap Ticker Correction (2026-02-11)

- Replaced marquee-style masthead with airport-board split-flap behavior to match requested header motion reference:
  - Added `src/components/FlipTicker.tsx` (character-cell ticker with per-slot vertical tick transitions)
  - Updated homepage masthead in `src/app/page.tsx` to use `FlipTicker` with `EUANGELION` <-> `GOOD NEWS`
  - Replaced old marquee CSS in `src/app/globals.css` with split-flap board styles (`flip-cell`, `flip-track`, `flip-char`)
- Bumped service worker cache namespace from `euangelion-v11` -> `euangelion-v12` in `public/sw.js` so ticker correction is immediately visible

### Airport Board Ticker Behavior Refinement (2026-02-11)

- Refined the masthead ticker to behave like a true split-flap airport board (not a horizontal sports ticker):
  - Rebuilt `src/components/FlipTicker.tsx` animation logic so each character cell advances in stepped ticks toward the next message
  - Added per-cell split-panel flip choreography (top + bottom flap timing) for mechanical board motion
  - Tuned message cadence/stagger for `EUANGELION` <-> `GOOD NEWS` to read as header display text rather than marquee crawl
- Reworked split-flap visuals in `src/app/globals.css`:
  - Added half-panel layering, seam line, depth/ink shading, and dark-mode plate tuning for newspaper look
  - Replaced previous vertical-track glyph-roll styling (`flip-track`, `flip-char`) with dynamic flap states (`flip-static`, `flip-dynamic`)
- Bumped service worker cache namespace from `euangelion-v12` -> `euangelion-v13` in `public/sw.js` so the refined ticker behavior is immediately visible

### Masthead Simplification (2026-02-11)

- Removed masthead ticker/effects and restored a static wordmark:
  - Updated `src/app/page.tsx` masthead to render plain `EUANGELION` text
  - Removed ticker component usage and deleted `src/components/FlipTicker.tsx`
  - Removed split-flap ticker CSS from `src/app/globals.css`
- Bumped service worker cache namespace from `euangelion-v13` -> `euangelion-v14` in `public/sw.js` so the static masthead is immediately visible

### Blue Ink Newspaper Refinement (2026-02-11)

- Shifted homepage + devotional visual language to blue-ink editorial treatment in `src/app/globals.css`:
  - Updated accent from warm glow to blue-ink (`--color-gold` now blue-ink in newspaper contexts)
  - Added darker section rules and stronger border contrast for newspaper structure
  - Added dedicated `newspaper-reading` tokens so devotional pages match homepage editorial tone
- Removed glow/shimmer effects to keep print-like flat ink rendering:
  - Replaced animated `gold-shimmer` styling with static ink color
  - Disabled prayer text pulsing (`breathe-prayer`) to reduce visual noise during long-form reading
  - Simplified `src/components/motion/GoldHighlight.tsx` to flat text accent (no gradient reveal animation)
- Reworked homepage editorial blocks in `src/app/page.tsx`:
  - Converted `THE FLOW` from card grid to ruled newspaper step list
  - Converted `HELP DESK` from cards to ruled Q&A column layout
  - Flattened closing CTA treatment into ruled editorial block (less app-like card chrome)
- Reworked devotional reading layout in `src/app/wake-up/devotional/[slug]/DevotionalPageClient.tsx`:
  - Removed mixed headline treatment and restored single-voice title composition
  - Reduced hero height so reading content appears sooner
  - Switched to newspaper navigation variant for cleaner article framing
  - Removed staggered module reveal wrappers for steadier long-form reading flow
  - Added framed reading column treatment via `newspaper-reading-main` + `reading-flow` rule edges
- Bumped service worker cache namespace from `euangelion-v14` -> `euangelion-v15` in `public/sw.js` so this style pass is immediately visible

### Update Delivery Reliability Fix (2026-02-11)

- Hardened production service worker update behavior in `src/components/ServiceWorkerRegistration.tsx`:
  - Added immediate `registration.update()` check on load
  - Added waiting-worker promotion via `postMessage({ type: 'SKIP_WAITING' })`
  - Added `controllerchange` listener to auto-reload once new worker takes control
- Added message handler in `public/sw.js` to honor `SKIP_WAITING` and activate updated worker immediately
- Bumped service worker cache namespace from `euangelion-v15` -> `euangelion-v16` in `public/sw.js` to prevent partial stale/updated style mixes

### Soul Audit Custom Devotional Generation + Full-Width Masthead (2026-02-11)

- Reworked Soul Audit API from series-only matching to custom devotional generation in `src/app/api/soul-audit/route.ts`:
  - Added AI response contract to return both `custom_devotional` and ranked `matches`
  - Added robust JSON parsing + match enrichment + fallback devotional construction
  - Added grounded day-one context extraction from devotional source files for better personalized output
  - Preserved crisis response handling with resource-first output
- Added shared Soul Audit response types in `src/types/soul-audit.ts` and updated store typing in `src/stores/soulAuditStore.ts`
- Updated homepage Soul Audit experience in `src/app/page.tsx`:
  - Result section now leads with a generated custom devotional (scripture, reflection, prayer, next step, journal prompt)
  - Series cards are now secondary follow-up pathways
  - Updated Soul Audit value copy to reflect custom devotional generation
- Updated dedicated Soul Audit flow:
  - `src/app/soul-audit/page.tsx` now normalizes/stores the richer response payload
  - `src/app/soul-audit/results/page.tsx` now renders the generated custom devotional as primary output
- Made masthead wordmark span full width across the top in `src/app/page.tsx` + `src/app/globals.css` via `masthead-fullwidth` letter layout
- Bumped service worker cache namespace from `euangelion-v16` -> `euangelion-v17` in `public/sw.js` so API/UI behavior updates are immediately visible

### Validation

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

---

## Edge Runtime Warning Removal (2026-02-11)

### What Changed

- Updated Open Graph image routes to use Node runtime instead of Edge:
  - `src/app/opengraph-image.tsx`
  - `src/app/wake-up/devotional/[slug]/opengraph-image.tsx`
- Goal: eliminate the build warning about Edge runtime disabling static generation

### Validation

- `npm run build` passes
- Warning `Using edge runtime on a page currently disables static generation for that page` no longer appears

---

## Next.js Proxy Migration (2026-02-11)

### What Changed

- Migrated route interception entrypoint from `src/middleware.ts` to `src/proxy.ts`
- Renamed exported handler from `middleware` to `proxy` to match Next.js 16+ convention
- Kept existing auth/session logic and matcher config intact

### Validation

- `npm run build` passes
- Build warning `The "middleware" file convention is deprecated` no longer appears

---

## Newsprint Texture Pass (2026-02-11)

### Scope

- Shifted the homepage from "clean editorial" to explicit newsprint material feel
- Targeted ink-on-paper atmosphere using layered texture treatment (no font-family changes)

### What Changed

- **Paper texture foundation** (`src/app/globals.css`):
  - Enhanced `.newspaper-home` background with multi-layered paper grain, fiber lines, and subtle ink wash variation
  - Added fixed pseudo-element overlays (`::before`, `::after`) for page-wide grain and print noise
  - Added stacking isolation and z-index handling so texture stays behind content while covering the full page
- **Printed surface treatment** (`src/app/globals.css`):
  - Updated `.newspaper-card` with textured paper layering to look like ink printed on stock rather than flat UI cards
- **Client cache refresh** (`public/sw.js`):
  - Bumped service worker cache namespace from `euangelion-v4` -> `euangelion-v5` so browsers pull the new texture assets/styles immediately

### Validation

- `npm run build` passes

### Visibility Follow-up (2026-02-11)

- Added non-production cache reset behavior in `src/components/ServiceWorkerRegistration.tsx`:
  - In production: keep normal SW registration
  - In non-production (local/dev): automatically unregister existing service workers and clear `euangelion-*` caches
- Purpose: prevent stale cached homepage assets from masking style updates during iterative design passes

---

## Homepage Newspaper System Pass (2026-02-11)

### Scope

- Applied a full homepage visual overhaul to align with a newspaper-style editorial layout inspired by the requested reference
- Kept existing font family setup intact (no typography family swap in this pass)
- Focused changes on hierarchy, conversion flow, layout balance, and section consistency

### What Changed

- **Unified homepage treatment** (`src/app/page.tsx`):
  - Root now uses `newspaper-home` for page-wide newspaper tokens/background
  - All major sections moved to a consistent editorial system:
    - masthead + edition strip
    - nav rail directly under masthead
    - lead story + above-fold Soul Audit
    - results rail
    - flow section
    - featured section
    - FAQ rail
    - final conversion panel
  - Removed mixed visual language (gradients/dot pattern-heavy style) in favor of consistent rails, rules, and cards
  - Preserved masthead hover interaction (`EUANGELION` -> `GOOD NEWS`)
- **Newspaper token tuning** (`src/app/globals.css`):
  - Refined `newspaper-home` palette for warmer paper + stronger editorial contrast
  - Kept accent treatment consistent through tokenized `--color-gold`
  - Standardized newspaper card rendering via `newspaper-card`
- **Cache bust for client refresh** (`public/sw.js`):
  - Bumped service worker cache namespace from `euangelion-v3` -> `euangelion-v4` so clients pick up the new homepage CSS/markup

### Validation

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

---

## Hotfix — Serif Font Rendering (2026-02-11)

### Root Cause

- `next/font` variable classes were mounted on `<body>` while canonical typography tokens (`--font-family-*`) were resolved from `:root` (`<html>`), creating a scope mismatch for `--font-instrument-serif`
- `--font-family-serif` used `var(--font-instrument-serif), ...` without inline fallback, so if the variable was unavailable the declaration became invalid and serif styles inherited sans

### Fixes Applied

- **Layout scope fix** (`src/app/layout.tsx`) — moved `inter.variable` and `instrumentSerif.variable` class injection from `<body>` to `<html>`
- **Font token hardening** (`src/app/globals.css`) — changed font-family tokens to `var(..., fallback-list)` form:
  - `--font-family-display: var(--font-inter, 'Inter', 'Helvetica Neue', Arial, sans-serif);`
  - `--font-family-body: var(--font-inter, 'Inter', 'Helvetica Neue', Arial, sans-serif);`
  - `--font-family-serif: var(--font-instrument-serif, 'Instrument Serif', Georgia, serif);`
- Updated comments in `globals.css` to reflect runtime font variables now sourced from `<html>`

### Validation

- `npm run lint` passes with no new lint errors

### Render Outage Follow-up (2026-02-11)

- Replaced `next/font/google` usage in `src/app/layout.tsx` with local `GeistSans` import (`geist/font/sans`) to remove hard dependency on Google Fonts network availability during builds
- Added explicit source font variables in `src/app/globals.css`:
  - `--font-inter` now resolves from `--font-geist-sans` with fallback stack
  - `--font-instrument-serif` now has a resilient serif fallback stack (`Instrument Serif`, `Georgia`, `Times New Roman`, `serif`)
- Verified production build succeeds using webpack (`npx next build --webpack`)

### Instrument Serif Cleanup Pass (2026-02-11)

- Removed remaining Geist wiring from `src/app/layout.tsx` and kept `<html className="dark">` only
- Imported Instrument Serif directly in `src/app/globals.css`:
  - `@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');`
- Unified all canonical font tokens to a single serif source in `src/app/globals.css`:
  - `--font-family-display`, `--font-family-body`, and `--font-family-serif` now all resolve from `--font-family` → `--font-instrument-serif`
- Replaced lingering `var(--font-family-display)` inline style usage with `var(--font-family-serif)` in:
  - `src/components/PullQuote.tsx`
  - `src/components/modules/InteractiveModule.tsx`
  - `src/app/wake-up/page.tsx`
  - `src/app/offline/page.tsx`
- Updated stale typography comments in:
  - `src/components/MixedHeadline.tsx`
  - `design-system/typography-craft.css`

### Validation (Second Pass)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

### Instrument Serif Local Asset Pass (2026-02-11)

- Root issue remained: browser/runtime could still fall back when external Google Fonts requests were blocked or delayed
- Added local Instrument Serif assets in `public/fonts/`:
  - `InstrumentSerif-Regular.ttf`
  - `InstrumentSerif-Italic.ttf`
- Replaced remote font import with local `@font-face` declarations in `src/app/globals.css`:
  - `src: url('/fonts/InstrumentSerif-Regular.ttf') format('truetype')`
  - `src: url('/fonts/InstrumentSerif-Italic.ttf') format('truetype')`
- Kept canonical font tokens mapped to Instrument Serif (`--font-family-display`, `--font-family-body`, `--font-family-serif`) so all typography utilities resolve to the same local family
- Removed temporary `next/font/google` dependency in `src/app/layout.tsx` so builds no longer require `fonts.googleapis.com`

### Validation (Local Asset Pass)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes without external font fetches

### Homepage Conversion Flow Refactor (2026-02-11)

- Reworked `/` into a conversion-first funnel in `src/app/page.tsx` with a clearer sequence:
  - Above-the-fold value proposition + primary CTA
  - Low-friction "Start Here" soul-audit section
  - Matched results reveal
  - How-it-works clarity block
  - Featured series proof section
  - Objection-handling FAQ
  - Final CTA close
- Reduced visual imbalance by removing mixed-headline composition from the homepage and using simpler, consistent serif hierarchy for readability and scan speed
- Improved CTA hierarchy:
  - Primary: `Start 2-Minute Soul Audit`
  - Secondary: `Browse Series Library`
- Added trust and friction-reduction signals near the top of the page (`No account required`, time expectation, biblical grounding)
- Kept existing soul-audit behavior, limits, and matching logic intact while clarifying copy and outcome framing

### Validation (Homepage Conversion Refactor)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

### Color Uplift Pass (2026-02-11)

- Replaced drab brown-forward palette with a brighter, more life-giving core:
  - Deep blue base (`--color-tehom`)
  - Warm cream text/surfaces (`--color-scroll`)
  - More luminous sun-gold accent (`--color-gold`)
- Updated semantic dark/light tokens in `src/app/globals.css` for richer contrast and brighter surfaces (`--color-surface`, `--color-surface-raised`, borders, overlays, hover/active states)
- Refined global shadow and glow tokens for warmer visual energy (`--shadow-glow`, focus ring/shadow scales)
- Enhanced homepage visual atmosphere in `src/app/page.tsx`:
  - Luminous hero gradients
  - Gold-first primary CTA treatment
  - Elevated audit card with glow and subtle color wash
  - Added warm/cool gradient lifts to major informational sections

### Validation (Color Uplift Pass)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

### Client Cache Refresh (2026-02-11)

- Bumped service worker cache namespace from `euangelion-v1` to `euangelion-v2` in `public/sw.js` so clients pick up latest homepage/style changes instead of stale cached assets

### Newspaper Hero + Masthead Hover (2026-02-11)

- Updated homepage hero composition in `src/app/page.tsx` to feel more newspaper-like:
  - Added dateline/edition strip with horizontal rules
  - Reframed left column as `LEAD STORY`
  - Kept Soul Audit as right-column front-page action above the fold
- Added interactive masthead behavior:
  - `EUANGELION` now animates to `GOOD NEWS` on mouse hover with vertical slide/fade transition
- Updated trust points to render as inline editorial bullets instead of card/button-like blocks

### Validation (Newspaper Hero Pass)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

### Font Flash + Cache Update (2026-02-11)

- Reduced masthead font flash by upgrading Instrument Serif loading:
  - Added local `.woff2` files in `public/fonts/`
  - Updated `@font-face` in `src/app/globals.css` to prefer `.woff2` with `.ttf` fallback
  - Switched `font-display` from `swap` to `block` for the Instrument Serif faces
  - Added font preloads in `src/app/layout.tsx` for regular + italic Instrument Serif (`rel="preload" as="font"`)
- Bumped service worker cache key from `euangelion-v2` to `euangelion-v3` in `public/sw.js` to force fresh asset pickup

### Validation (Font Flash Pass)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

### Navigation Newspaper Integration (2026-02-11)

- Added navigation variants in `src/components/Navigation.tsx`:
  - `default` (existing behavior for non-home routes)
  - `newspaper` (logo-free, section-rail style, centered links)
- Homepage now mounts navigation directly below the large masthead in `src/app/page.tsx`:
  - Removed top-level standalone nav placement above the hero
  - Inserted `Navigation` in newspaper mode under `EUANGELION`/`GOOD NEWS`
- Removed the small `EUANGELION` wordmark from the homepage nav rail to keep the masthead as the single brand headline

### Validation (Navigation Integration)

- `npm run lint` passes
- `npm run type-check` passes
- `npm run build` passes

---

## v0.7.0 — Typography Masterclass (2026-02-10)

### Font Swap

- **Instrument Serif** replaces Cormorant Garamond — condensed display serif, visibly serifed at all sizes
- **Inter** replaces Space Grotesk — clean workhorse sans, 300-700 weight range
- EUANGELION wordmark now renders in Instrument Serif (serifs VISIBLE)

### New Components

- **MixedHeadline** (`src/components/MixedHeadline.tsx`) — emphasis-based mixed sans/serif headlines with `<Sans>` and `<Serif>` sub-components. KEY words in serif italic, STRUCTURAL words in sans caps
- **PullQuote** (`src/components/PullQuote.tsx`) — hanging gold oversized quote mark, thin gold rules above/below, centered attribution
- **OrnamentDivider** (`src/components/OrnamentDivider.tsx`) — gold rules with centered ornament character between modules

### Sacred Illumination CSS

- `type-mega` (4-10rem serif display), `type-micro` (0.6-0.75rem sans labels), `type-day-ornament` (6-14rem gold ghost number)
- `headline-sans` / `headline-serif` / `headline-mixed` — mixed headline utility classes
- `ornament-divider` — gold rule + ornament between sections
- `oldstyle-nums` — old-style numeral utility for casual numbers

### Page Typography Overhauls

- **Homepage:** MixedHeadline tagline ("DAILY _bread_ FOR THE _cluttered, hungry_ SOUL"), mixed section headers, Instrument Serif numbers (01/02/03), ghost Scripture text in visual break, gold ornament footer, gold rules on featured series cards
- **Devotional reader:** Massive `.type-day-ornament` behind title, MixedHeadline day header ("DAY 1 — _title_"), ornamental dividers between all modules, `type-prose` + `baseline-grid` on reading flow
- **Series browse:** MixedHeadline page title ("ALL _Series_"), section labels ("WAKE-UP _Magazine_", "DEEP _Dives_"), gold rules on cards, old-style numerals
- **Series detail:** Large Instrument Serif italic question, `type-micro` labels, Instrument Serif day numbers, `columns-prose` on long introductions
- **Soul Audit:** MixedHeadline question ("WHAT ARE YOU _wrestling with_ TODAY?")

### Activated Typography Features

- `type-prose` (ligatures, old-style nums, hanging punct) on all body text
- Drop caps (Instrument Serif gold) on Teaching and Story module openings
- Multi-column layouts (`columns-prose`) on long Teaching content
- PullQuote on TeachingModule `keyInsight`, InsightModule `fascinatingFact`, ProfileModule `keyQuote`, BridgeModule `connectionPoint`
- Old-style numerals on day counts, Strong's numbers, progress counters, copyright

### Version

- `package.json` bumped from `0.1.0` → `0.7.0`

---

## Fix What's Broken — Wire Infrastructure to UI

### 2026-02-09

- **Phase A: Remove auth gate** — Emptied `AUTH_REQUIRED_ROUTES` in middleware.ts. Devotionals now freely accessible without sign-in. Settings still requires auth.
- **Phase B: Homepage typography overhaul** — Imported GoldHighlight, DropCap, TextReveal into homepage. EUANGELION wordmark uses TextReveal (word-by-word GSAP reveal). "bread" wrapped in GoldHighlight (animated gold gradient on scroll). Invitation text uses DropCap component. Applied type-caption, type-display, type-data, type-prose, type-serif-flow across all homepage sections.
- **Phase C: Devotional module animations** — Animated gold-shimmer CSS (3s infinite sweep, reduced-motion safe). Added breathing prayer animation (6s subtle scale pulse). Wired GoldHighlight into VocabModule. Wired DropCap into TeachingModule. Wrapped PrayerModule in FadeIn. Added type-prose to all module body text (Story, Insight, Bridge, Reflection, Takeaway). Increased stagger timing (0.05 → 0.1s, capped at 0.5s).
- **Phase D: Site-wide polish** — TextReveal on devotional hero (non-image). type-display + type-prose on series browse, individual series, and Soul Audit pages. type-caption on Soul Audit label. type-serif-flow on series introductions and card questions.

---

## Production Relaunch — Phases 0-11

### 2026-02-09

- **Phase 0: Design system consolidation** — Imported design-system/ tokens into globals.css, created typography-craft.css (optical sizing, hanging punctuation, ligatures, baseline grid, multi-column utilities), created typographer.ts (smart quotes, em-dashes), built animation infrastructure (GSAP registry, Lenis provider, FadeIn/StaggerGrid/TextReveal/ParallaxLayer/GoldHighlight/DropCap motion components), installed gsap, framer-motion, lenis, zustand, @vercel/analytics
- **Phase 1: Zustand stores** — Created 6 stores (auth, progress, ui, settings, soulAudit, offline) with persist middleware, auth sign-in page, day-gating utility
- **Phase 2: Day-gating + Share + Analytics** — Day-gating at 7AM user timezone, ShareButton (Web Share API + clipboard fallback), Toast component, Vercel Analytics
- **Phase 3: Loading + Error + 404** — Brand-aligned error.tsx, not-found.tsx, loading skeletons per route, Skeleton UI component
- **Phase 4: Devotional reader prototype** — Scripture poster variants, typographer integration, content audit script
- **Phase 5: All modules enhanced** — Applied typographer() + GSAP animations to all 12 existing module components, built 9 additional module types (Chronology, Geography, Visual, Art, Voice, Interactive, Match, Order, Reveal)
- **Phase 6: Landing + Soul Audit visual** — Replaced IntersectionObserver with FadeIn/StaggerGrid across landing page and Soul Audit, mixed-font typography
- **Phase 7: Series + Navigation + micro-interactions** — Series pages migrated to motion components, Navigation aria attributes (aria-hidden on SVGs, role=dialog on mobile menu), z-index tokens replacing hardcoded values, .animated-underline + .btn-hover utilities
- **Phase 8: AI Research Chat** — DevotionalChat modal (Framer Motion slide-up), TextHighlightTrigger (text selection → "Ask about this"), ChatMessage component (favorite + color-code), two-tier API (BYOK + free with daily limit), chatStore (Zustand persist), Settings page API key input + chat history management
- **Phase 9: PWA** — manifest.json, service worker (cache-first static, network-first pages, offline fallback), offline page, PWA icons (192/512/maskable), ServiceWorkerRegistration component
- **Phase 10: Accessibility + SEO + Legal** — aria-live on Soul Audit results, JSON-LD BreadcrumbList on series + devotional pages, sitemap expanded to all 26 series + all pages, .prose-legal CSS class, print stylesheet enhanced (@page rules, EUANGELION branding header)
- **Phase 11: Cleanup** — Removed ~70 lines dead CSS (observe-fade, gentle-rise, stagger-\*, landing-reveal, fade-in-delay), removed dead functions from progress.ts, 0 lint warnings, 160 pages built
- **Deploy fix** — Added missing Skeleton.tsx, AnimationProvider.tsx, LenisProvider.tsx (created in Phases 0/3 but not staged in initial commit)

---

## Sprint 5 — Real MVP Rebuild

### 2026-02-09

- **Lumen-inspired continuous article redesign** — Removed all card backgrounds, borders, and box treatments from all 12 module components. Devotional content now flows as a continuous long-form article with only typography, whitespace, and gold accents for visual hierarchy. Hero uses full-bleed images (50-60vh) with gradient overlay (Lumen Art Space reference). Added `.reading-flow` CSS container (max-width 900px). Removed `isFullWidthModule` breakout system. Generous vertical spacing (my-16 md:my-24) between modules. Scripture keeps gold left-border blockquote; teaching keyInsight rendered as gold serif italic; fascintaing facts use subtle gold accent strip. No cards, no surfaces, no box borders — just headings, text, and whitespace.
- **Unified typography hierarchy across all modules** — Created CSS utility classes (`module-accent`, `module-callout`, `module-card`, `module-card-gold`, `module-surface`, `module-sublabel`) to replace inline styles. Standardized all 12 module components to consistent hierarchy: gold labels (`text-label vw-small text-gold`) for module type, `text-display vw-heading-md` for headings, `text-serif-italic vw-body-lg` for featured/sacred text (scripture, prayer, reflection prompts, key quotes), `vw-body text-secondary` for standard reading text, `module-sublabel` for sub-section labels, `vw-small text-muted` for metadata. Removed all inline `fontSize` overrides. VocabModule word now uses `.pull-quote` class instead of inline style.
- **Content pipeline rebuilt to preserve all original Substack data** — Rewrote `prepare-substack.ts` with spread-and-rename approach. All rich fields now preserved: pronunciation, wordByWord, Strong's numbers, keyInsight, historicalContext, fascinatingFact, leavingAtCross/receivingFromCross, forReflection, forAccountabilityPartners, connectionToTheme, ancientTruth, modernApplication, etc. 81 devotional JSONs regenerated.
- **ModuleRenderer simplified** — Replaced 120-line manual field mapper with 60-line spread-and-rename normalizer matching the pipeline approach. All fields pass through; only 7 critical renames applied.
- **All 12 module components upgraded** — ScriptureModule (+emphasis chips, Hebrew/Greek originals, scripture context), VocabModule (+pronunciation, Strong's badge, word-by-word table, related words, usage note), TeachingModule (+keyInsight callout), StoryModule (+connectionToTheme), InsightModule (+historicalContext, fascinatingFact), BridgeModule (structured Ancient Truth / Modern Application layout, connection point, NT echo), ReflectionModule (+additionalQuestions, invitationType label), PrayerModule (+posture label, prayer type), TakeawayModule (+commitment text, leavingAtCross/receivingFromCross lists), ComprehensionModule (dual-mode: quiz OR reflection), ProfileModule (+description, keyQuote pull-quote, lessonForUs), ResourceModule (+relatedScriptures, forDeeperStudy, greekVocabulary, weeklyChallenge). All components now have null guards.
- **Module type expanded** — Added ~40 optional fields to `Module` interface in `src/types/index.ts` covering all rich Substack data.
- **Test coverage** — New test asserting rich field preservation (vocab pronunciation/strongsNumber/wordByWord, takeaway commitment/leavingAtCross, comprehension forReflection, teaching keyInsight, bridge ancientTruth). 16 tests pass.

### 2026-02-08

- **113 Substack devotional images downloaded** — Extracted topImage URLs from all 117 HTML source files, downloaded to `public/images/devotionals/`. Created `src/data/devotional-images.ts` with full slug→image mapping (106 devotionals + 9 series intros). Helper functions `getDevotionalImage()` and `getSeriesHeroImage()`.
- **Devotional reader shows real images** — `DevotionalPageClient` displays devotional-specific hero image at top via `next/image` with dark overlay for readability. Falls back to gradient for series without images (Wake-Up 7).
- **Wake-Up added to navigation** — "Wake-Up" link added to desktop sticky bar and mobile slide-out menu, linking to existing `/wake-up` landing page.
- **All 19 Substack series have hero images** — Every Substack series in `series.ts` now has a `heroImage` field pointing to a locally-served photograph. Uses deepdive/intro images where available, day-1 images as fallback. `SeriesInfo` interface extended with optional `heroImage` field. `SeriesHero` component shows real image via `next/image` with gradient fallback for Wake-Up 7. Darker overlay for text readability on photos.
- **How It Works repositioned** — Moved directly under fold (after hero + audit results) for immediate clarity. Added SVG icons (compass, book, heart) to each step.
- **Paper.design-inspired visuals** — Dot-pattern background utility (`dot-pattern`, `dot-pattern-lg`). Applied to How It Works and What This Is sections. Editorial break upgraded with dot overlay, radial gold glow, and minimal cross motif.
- **Day-gating disabled** — `canReadDevotional()` always returns `{ canRead: true }`. All content freely accessible.
- **Fonts replaced** — Playfair Display → Cormorant Garamond (display/serif). Geist Sans → Space Grotesk (body/UI). Updated layout.tsx + globals.css.
- **19 Substack series wired up** — `scripts/prepare-substack.ts` converts 19 Substack JSONs (3+ format variants) into 81 individual devotional files in `public/devotionals/`. All 26 series now in `src/data/series.ts` with pathway + keywords metadata.
- **Module format normalization** — `ModuleRenderer.tsx` `normalizeModule()` handles flat, `content`-nested, and `data`-nested Substack formats. Maps field names (text→passage, body→content, meaning→definition, etc.).
- **SeriesHero component** — CSS gradient backgrounds per series/pathway. Three visual directions: radial (Sacred Chiaroscuro), wave (Textured Minimalism), grid (Risograph). Supports hero/card/thumbnail sizes.
- **Navigation rebuild** — Desktop: sticky persistent top bar with logo, nav links (Soul Audit, Series, Settings), dark mode toggle. Mobile: hamburger → right slide-out panel. Auto-closes on route change.
- **Landing page rebuild** — EUANGELION massive edge-to-edge wordmark. Inline Soul Audit textarea (no page navigation). Results appear as 3 equal cards with SeriesHero. Full-bleed editorial placeholder. Featured Series (4 curated). How It Works grid. Footer with legal links.
- **Soul Audit overhaul** — API now uses all 26 series in Claude prompt + keyword fallback. Returns 3 matches with reasoning + Day 1 previews (anchor verse + teaching paragraph). Results page: 3 equal visual cards with SeriesHero backgrounds.
- **Series browse rewrite** — Shows all 26 series grouped: Wake-Up Magazine (7) + Deep Dives (19). Visual cards with SeriesHero thumbnails, dynamic day counts, progress bars.
- **Series detail enhanced** — SeriesHero at top. Dynamic day count (not hardcoded 5). Chiastic structure description only for 5-day series.
- **Devotional reader — hybrid cinematic layout** — Full-width treatment (distinct background + borders) for Scripture, Vocab, Prayer, Comprehension. Continuous column for Teaching, Story, Insight, Bridge, etc. SeriesHero card at top. Series slug extraction from devotional slug.
- **Master Decisions Log** — `docs/MASTER-LOG.md` with 21 Sprint 5 decisions + 6 prior decisions.

**26 Series (7 Wake-Up + 19 Substack):**
identity, peace, community, kingdom, provision, truth, hope, too-busy-for-god, hearing-god-in-the-noise, abiding-in-his-presence, surrender-to-gods-will, in-the-beginning-week-1, what-is-the-gospel, why-jesus, what-does-it-mean-to-believe, what-is-carrying-a-cross, once-saved-always-saved, what-happens-when-you-repeatedly-sin, the-nature-of-belief, the-work-of-god, the-word-before-words, genesis-two-stories-of-creation, the-blueprint-of-community, signs-boldness-opposition-integrity, from-jerusalem-to-the-nations, witness-under-pressure-expansion

---

## Sprint 4 — Full MVP Build

### 2026-02-08

- **Landing page redesign** — ironhill.au-inspired: full-viewport hero with massive serif italic typography, scroll-reveal sections, invitation copy from PUBLIC-FACING-LANGUAGE.md, Soul Audit CTA, 7 questions, how-it-works grid
- **Brand copy fix** — Removed unapproved "VENERATE THE MIRACLE. DISMANTLE THE HAVEL." from 3 files, replaced with approved tagline "SOMETHING TO HOLD ONTO."
- **Navigation overhaul** — Added Home, Soul Audit, All Series, Settings links to slide-out menu
- **Soul Audit** — Full flow: `/soul-audit` question UI → `/api/soul-audit` Claude API matching with keyword fallback → `/soul-audit/results` with primary match + alternatives. Crisis detection protocol (988, Crisis Text Line). Soft validation.
- **Module Renderer** — 12 MVP module components: Scripture, Teaching, Vocab, Story, Insight, Prayer, Takeaway, Reflection, Bridge, Comprehension, Profile, Resource. ModuleRenderer switch component.
- **Day-gating** — 7 AM timezone unlock. Series start tracking in localStorage. Days unlock sequentially + time-gated.
- **Devotional viewer enhanced** — Now supports both legacy panel format and new module format. Auto-starts series tracking on first visit.
- **Series Browse** — `/series` page with card grid, progress indicators, Soul Audit CTA
- **Magic link auth API** — `/api/auth/magic-link` route using existing Supabase auth
- **Settings page** — `/settings` with theme (dark/light/system), Sabbath day, Bible translation preferences
- **Legal pages** — `/privacy` and `/terms` rendering markdown from content/legal/
- **Print stylesheet** — Force light mode, hide nav/buttons, page-break rules, show URLs
- **AI Content Pipeline** — `scripts/generate-devotionals.ts` using Claude API with chiastic structure (A-B-C-B'-A'), PaRDeS interpretation, 12 module types, Nicene Creed orthodoxy baseline. Outputs both module + legacy panel format.
- **Tracking system** — Pre-commit hook enforcing CHANGELOG updates, MEMORY.md full project state, CLAUDE.md corrections
- **Tests updated** — Smoke test updated for new landing page, all 10 tests passing

**Routes:**

- `/` — Landing page (redesigned)
- `/soul-audit` — Soul Audit question
- `/soul-audit/results` — Match results
- `/series` — All series browse
- `/settings` — User preferences
- `/privacy` — Privacy policy
- `/terms` — Terms of service
- `/api/soul-audit` — Claude API matching
- `/api/auth/magic-link` — Send magic link

**Files created:** 20+ new files across src/app/, src/components/modules/, scripts/

---

## Deployment Fixes

### 2026-02-08

- **Domain transfer** (1f0fb0b) — euangelion.app moved to wokegodxs-projects, deleted duplicate euangelion-reio project
- **Deployment guardrails** (f5f60e8) — Added `scripts/check-deploy.sh`, deployment rules in CLAUDE.md, .gitignore fix for .env\*.local
- **Middleware fix** (60c520d) — Handle missing Supabase env vars gracefully in middleware, preventing 500 errors

---

## Illustration Pipeline

### 2026-02-07

- **Multi-backend illustration pipeline** (0ca5e67) — Expanded image generation to support Gemini + LegNext backends with 5 visual directions (Sacred Chiaroscuro, Textured Minimalism, Risograph Sacred, Bold Digital Collage, HOLOGRAPHIK Swiss). Series-to-direction mapping, day-3 chiastic overrides, brand palette integration. 2 test cover images generated.

---

## Sprint 3 — Supabase Database, Auth, Sessions (COMPLETE)

### 2026-02-07

- **Supabase integration** (862a9a9) — Typed clients (browser, server, admin), anonymous session management via httpOnly cookies, magic link auth flow callback
- **Middleware** — Route protection for /daily-bread and /settings
- **Database migrations** — user_sessions table, pathway/modules columns, devotional_slug unique constraint
- **Seed script** — Loads all 19 Substack + 7 Wake Up series (30 series, 85 devotionals) into Supabase
- **Files:** `src/lib/supabase/`, `src/lib/session.ts`, `src/lib/auth.ts`, `src/middleware.ts`, `src/app/auth/callback/route.ts`, `scripts/seed-series.ts`, `database/types.ts`

---

## Sprint 2 — Editorial Visual Redesign, SEO Foundation (COMPLETE)

### 2026-02-06

- **Editorial redesign** (61e26dc) — Transformed Wake-Up from generic layouts into publication-quality editorial experience with dramatic typography, breathing whitespace, scroll-driven reveals
- **Client components** — DevotionalPageClient.tsx, SeriesPageClient.tsx (extracted for client interactivity)
- **SEO** — Sitemap (`src/app/sitemap.ts`), robots.txt (`src/app/robots.ts`), OG images (root + devotional + series), JSON-LD structured data
- **Illustration pipeline** — `scripts/generate-illustrations.ts` for 42 devotional covers via LegNext Midjourney API
- **CSS** — Additional editorial typography classes, section transitions

---

## Design System Facelift (COMPLETE)

### 2026-02-06

- **Token system** (c3fb5a8) — Replaced placeholder styling with documented design system
- **Colors:** Exact hex values (#1A1612 Tehom, #F7F3ED Scroll, #C19A6B Gold) with semantic token system that auto-flips for dark/light mode
- **Typography:** Geist Sans replaces Impact+Inter; Playfair Display for masthead/serif; fluid base size clamp(15px, 1vw+14px, 17px)
- **Spacing:** 4px-base semantic scale, 680px reading column, 44px touch targets
- **Animation:** "gentle rise" pattern (fade+24px translateY), documented easing curves, 60ms stagger, prefers-reduced-motion support
- **Components:** All pages updated to semantic tokens, ScrollProgress fades after inactivity, Navigation uses Tehom background

---

## Sprint 1 — Wake-Up Magazine (COMPLETE)

### 2026-02-06

- **Core infrastructure** — Navigation component (hamburger menu, dark mode toggle, slide-out panel), ScrollProgress, design system (globals.css with HSL colors, dark mode, animations, typography utilities), type definitions, Playfair Display + Inter fonts
- **Landing page** — Brand page at `/` with CTA to Wake-Up Magazine
- **Wake-Up Magazine page** — `/wake-up` with hero, problem statement, how-it-works, 7 series question cards with IntersectionObserver animations
- **Series detail page** — `/wake-up/series/[slug]` with introduction, context, chiastic structure info, 5-day list with locked/unlocked states, progress bar, lock modal
- **Devotional viewer** — `/wake-up/devotional/[slug]` loading JSON panels from `/public/devotionals/`, scroll progress bar, panel renderer (text, text-with-image, prayer), scripture detection, bold text parsing, mark-as-complete with reading time
- **Supporting utilities** — `progress.ts` (localStorage progress tracking), `bookmarks.ts` (localStorage bookmarks), `useProgress` hook, `useReadingTime` hook
- **Shared data module** — `src/data/series.ts` with all 7 series metadata
- **Routes:** `/`, `/wake-up`, `/wake-up/series/[slug]`, `/wake-up/devotional/[slug]`
- **Build, lint, tests all pass**

---

## Sprint 0 — Foundation (COMPLETE)

### 2026-02-06

- **Fresh project initialized** — New Next.js 16 app with TypeScript strict mode, Tailwind v4, App Router, src/ directory
- **Tooling configured** — Vitest + RTL, ESLint + Prettier, husky + lint-staged, GitHub Actions CI
- **Foundational files migrated** from old project:
  - `.claude/` agents (8) and skills (2)
  - `content/` — all content including 20 series-json, analytics, drafts, outlines, legal
  - `content/reference/` — 13GB reference library (gitignored)
  - `docs/` — 38 documentation files
  - `database/` — SQL migrations, seed data, types
  - `design-system/` — tokens, typography, dark mode CSS
  - `scripts/` — sync/upload reference scripts
  - `public/devotionals/` — 42 devotional JSON files
- **Coming soon landing page** — Dark-first, minimal
- **Root error boundary** and 404 page
- **CLAUDE.md**, **CHANGELOG.md**, **.env.example**
