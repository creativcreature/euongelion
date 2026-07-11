# Production Source of Truth

Last Updated: 2026-07-10
Owner: Product + Engineering
Status: Authoritative

## Canonical Intent

Euangelion Soul Audit and Devotional Engine are curated-first and selection-first:

1. Repository content is canonical for devotional construction.
2. Local reference volumes are mandatory grounding inputs.
3. Construction target is 80% curated and 20% generation-assisted polish.
4. Soul Audit submit returns options only, never a full plan.
5. A full 5-day plan is generated only after user selection.

## Locked Product Decisions

1. No-account core usage in testing phase remains enabled for landing, audit submit, and option review.
2. Real auth is enabled. Bookmarks (save-for-later) are allowed anonymously, keyed by the audit session token and merged to the account on sign-in; annotations (notes, highlights, stickies) require sign-in. (SA-018, amended 2026-06-09 — founder-authorized.)
3. Soul Audit returns exactly 5 choices:
4. 3 primary AI-ranked options.
5. 2 secondary curated prefab options.
6. Prefab selection routes to a series overview.
7. Essential consent is required; analytics consent is optional and defaults OFF.
8. Crisis flow requires explicit resource acknowledgement before continuation.
9. Tracking is anonymous by default.
10. Audit limit is 3 per cycle.
11. Curated source priority is:
12. `content/approved`
13. `content/final`
14. `content/series-json`
15. Missing curated core module fails closed and blocks publish/render.
16. Generation is constrained to assistive polishing only.
17. Endnotes are required on generated devotional days.
18. Chat is restricted to devotional context and local corpus only.
19. Unlock policy:
20. Monday start: normal weekly cycle.
21. Tuesday start: Monday is readable archived content.
22. Wednesday-Sunday start: onboarding devotional first, full cycle begins Monday.
23. Daily unlock remains 7:00 AM local-time cadence.

## Amendment (2026-07-10) — Paid Custom Generation (founder-ratified)

The founder ratified the custom-generation monetization model via the
custom-generation brief Q&A (see SA-026, SA-027, SA-028 in
`docs/production-decisions.yaml`; MASTER-DECISIONS §4 amended the same day):

1. **What stays free and anonymous forever:** landing, Soul Audit submit,
   3-option review, and all curated reading. Locked Decision #1 above is
   unchanged for those surfaces. The gospel and curated content are never
   paywalled.
2. **What is now gated (amends the anonymous-generation scope of SA-002/SA-018):**
   bespoke custom-generated plans require a verified account. Every new verified
   account receives exactly 1 free generation; beyond that, entitlement is
   required (subscription, credits, gift code, BYOK, or MCP round-trip —
   subscription is the primary, most-emphasized path). The paywall exists at
   exactly one moment: requesting a custom generation. SA-033's removal of the
   gate-before-reading pattern remains intact.
3. **Pricing (locked 2026-05-03, reconfirmed):** $7/mo · $77/yr · $140/2yr ·
   $200/3yr · Founding Member badge. Config-driven via `STRIPE_PRICE_*`.
4. **Billing state:** single source of truth in `public.users` with stored
   Stripe customer/subscription IDs; entitlement changes driven by verified
   Stripe webhooks only, never client redirects (SA-028).
5. **Audit limit #10 above (3 per cycle) governs audit submissions, not
   generations;** generation allowances are governed by SA-026/SA-027
   entitlements.

## Reconciliation Notes (2026-06-20)

A live audit surfaced doc-vs-reality gaps. Recorded here so this file stays
truthful. Items marked **(founder-ratify)** would change a LOCKED decision and need
founder sign-off to formally amend the decision text — they are documented, not
unilaterally rewritten.

1. **Soul Audit options = 3 grounded paths, not "3 + 2 prefab."** Locked Decisions
   #21–25 (SA-002) describe 3 AI + 2 curated-prefab options routing to a series
   overview. The shipped grounded model (SA-020) deliberately removed the prefab
   path — pre-existing series are a browsing experience, never the Soul Audit's
   _output_. Live behavior: 3 grounded options → a bespoke generated plan. Help Hub
   copy corrected to match (2026-06-20). **(founder-ratify: amend SA-002.)**
2. **`POST /api/soul-audit/consent` is folded into `/api/soul-audit/select`.** The
   separate consent route below does not exist as its own endpoint; essential
   consent is carried inline on select (`consentToken` / `essentialAccepted`).
   Either amend the contract list or split the route. **(founder-ratify.)**
3. **Stale flow docs.** `docs/UX-FLOW-MAPS.md` and `docs/MVP-SCOPE.md` still describe
   a single-match result, an email gate _before_ starting, a user-chosen Sabbath,
   the 12-module render model, and `wokegod.world`. The live product is anonymous,
   options-first, grounded, and fixed-schedule on euangelion.app. These need a
   rewrite pass (tracked, not yet done).
4. **Active-plan reader.** All active-plan entry points (header badge, homepage
   "Continue" CTA, resume link) route to `/daily-bread` (the working reader); the
   `/soul-audit/plan/[token]` reader has an unresolved client bug and nothing routes
   users into it (tracked follow-up).
5. **Contract-verifier blind spots.** `scripts/check-production-contracts.mjs` does
   not enforce several declared keys (`policy_split`, `scorecard_required_tokens`,
   `non_wakeup_shell_*`), so drift like #1 and a forbidden `newspaper-home` CSS token
   pass CI green. The verifier should consume these keys.

### Honest-audit follow-up (2026-06-21)

A 5-agent doc-vs-reality audit ran. **Fixed in code:** (a) the options step's
production silent-fallback to templated placeholder cards is removed — composer
failures now surface an honest 503/504 (CLAUDE.md rule #1); (b) onboarding day-0
Scripture now resolves verbatim via `getVerse`; (c) **open-web chat is now OFF by
default**, honoring locked SA-008 (was default-on); (d) `/admin/*` is now
`force-dynamic` so the auth gate fires per-request (the static shell previously
served to anonymous users); (e) the Soul Audit results headings no longer clip
mid-word.

**Still open for FOUNDER decision / governance (documented, not yet changed):**

6. **SA-005 "generation = assistive polishing only" is false.** The shipped grounded
   engine (SA-020) writes full multi-thousand-word grounded readings. SA-005's
   "polish only" text is superseded; amend it. **(founder-ratify.)**
7. **Scorecard "3 AI + 2 prefab split = 7/10" scores a removed feature** (0 prefab
   ships). Correct the row to the grounded 3-option model.
8. **SA-017 App Store gate is a structure check, not readiness** (`check-appstore-gate`
   verifies headings exist, zero `[x]` completed); the 7/10 iOS score is aspirational
   — no device/App Store Connect evidence. Don't read it as submission-ready.
9. **SA-011 version drift:** the semver gate is satisfied by a stale CHANGELOG marker
   while ELEVATION v3.0 scope shipped past it; bump or reconcile.
10. **Sabbath control conflict:** Settings still offers a user-chosen Sabbath
    (Sat/Sun), contradicting Note #3's "fixed-schedule" claim — confirm whether it's
    functional (fix the note) or vestigial (remove the control).
11. **`/wake-up` uses an uncited "43% more anxious" fear stat** — off the AUDIENCE/
    PHILOSOPHY "no fear-motivation, no wild claims" guidance; cite or soften (content).
12. **Several feature PRDs are stale/superseded** (F-052 artwork-manifest empty;
    F-053/F-054/F-056–F-059 describe the deleted pre-F-060 generative pipeline); mark
    them `superseded`. INDEX/REGISTRY omit F-051 + F-056–F-062 (parity vs the gate).
13. **`[x] Manual QA evidence recorded` is checked across ~all "done" PRDs without
    evidence** — recommend distinct engineering-complete / QA-verified / founder-
    accepted statuses.

## Required API Contracts

1. `POST /api/soul-audit/submit`
2. `POST /api/soul-audit/consent`
3. `POST /api/soul-audit/select`
4. `GET /api/devotional-plan/:token/day/:n`
5. `POST /api/mock-account/session`
6. `GET /api/mock-account/export`
7. `POST /api/annotations`
8. `GET /api/annotations`
9. `POST /api/bookmarks`
10. `GET /api/bookmarks`

## Drift Policy

1. `docs/production-decisions.yaml` is the machine-readable contract.
2. CI fails when required contracts are missing or stale.
3. Feature commits must reference a production decision id.
4. `CHANGELOG.md` remains historical log only.

## Feature PRD Governance

1. Every feature has a canonical PRD in `docs/feature-prds/F-xxx.md`.
2. Feature code changes must update the matching PRD outcomes log.
3. Feature commit messages must reference both `SA-xxx` and `F-xxx`.
4. Baseline scoring cap lifted by founder on 2026-06-13; scores reflect honest, evidence-backed quality, never inflated.
5. Founder is the only authority to assign 10/10.

## Folder Preservation Policy

1. `user-references` and `docs/user refmat` are frozen directories.
2. These directories must not be deleted, renamed, or moved by cleanup passes.

## Tracking + Versioning Contracts

1. `CLAUDE.md` must point to:
2. `docs/PRODUCTION-SOURCE-OF-TRUTH.md`
3. `docs/production-decisions.yaml`
4. `docs/PRODUCTION-FEATURE-SCORECARD.md`
5. `docs/PRODUCTION-10-10-PLAN.md`
6. `docs/PRODUCTION-COMPACTION-HANDOFF.md`
7. `CHANGELOG.md`
8. `package.json` semver version and `CHANGELOG.md` current version marker must match.
9. `npm run verify:tracking` is required in pre-commit and CI.

## UX Alignment Contracts

All user-facing decisions must be aligned to:

1. `docs/AUDIENCE.md`
2. `docs/PUBLIC-FACING-LANGUAGE.md`
3. `docs/UX-FLOW-MAPS.md`
4. `docs/SUCCESS-METRICS.md`

These are required continuity inputs, not optional references.
