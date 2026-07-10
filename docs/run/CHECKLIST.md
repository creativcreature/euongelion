# Launch-Readiness Run — Master Checklist

Run started: 2026-07-10. Source of truth: `docs/audits/MOBBIN-POLISH-AUDIT-2026-07-10.md`.
Legend: `[ ]` not started · `[~]` in progress · `[x]` done+verified · `[!]` blocked (see DECISIONS.md / HUMAN_REQUIRED.md)

## Task 0 — Bootstrap

- [x] T0-1: Verify working state (branch `elevation/soul-audit-rebuild`, 46 ahead of main; last prod deploy 2026-06-21)
- [x] T0-2: Commit prior-session Bible-365 full-run rewrite as clean baseline (27c88829; 365/365 validated)
- [x] T0-3: Identify deploy pipeline → HANDOFF.md (Cloudflare Workers, `npm run deploy`, wrangler token verified)
- [x] T0-4: GitHub push credentials — MISSING → HUMAN_REQUIRED.md item 1 (deploys unaffected)
- [~] T0-5: Create docs/run/ with all 7 tracking files, commit

## Task 1 — OAuth subscription sign-in research

- [ ] T1-1: Research Claude/ChatGPT/Manus subscription-OAuth feasibility (flows, official support, ToS)
- [ ] T1-2: Write docs/run/RESEARCH_OAUTH.md with findings + recommendation
- [ ] T1-3: If (and only if) a fully supported ToS-compliant zero-founder-input path exists → implement; else log and move on

## Task 2 — Sprint A: correctness (P0 1–9)

- [ ] A-0: Verify every audit claim against current code before fixing (anchors may have drifted)
- [ ] A-1: Soul-Audit guided-reveal dead code (`soul-audit/results/page.tsx:70-73`) — revive Calm/Yazio-style progressive reveal (recommended first, alternatives on tap) or delete cleanly
- [ ] A-2: Result cards render bare (`OptionCard.tsx:33-38`; AI slug ≠ series slug) — resolve real hero from scripture theme or design text-first card (Yazio)
- [ ] A-2b: `seriesSlug` written to plan is AI slug (`select/route.ts:724`) → resume badge title empty (`current/route.ts:98`) — store resolvable title/theme
- [ ] A-3: Results loading skeleton (3-up grid) → match real stacked RECOMMENDED/ALTERNATIVE layout
- [ ] A-4: Wire-or-delete 0-import orphans: GuestSignupGate · WalkthroughModal · SeriesSearchPanel · SeriesHero · MixedHeadline · NetworkStatusBanner · DevotionalMilestoneReveal (verify each is truly 0-import first)
- [ ] A-5: Two-reader ambiguity (`/soul-audit/plan/[planToken]` vs `/daily-bread`) — pick canonical, finish or retire the other; fix devotional-silo self-canonical URLs (`devotional/[slug]/page.tsx:56`)
- [ ] A-6: `/saved` mis-routes Euangelion-silo bookmarks to `/wake-up/devotional/*` (`SavedList.tsx:153`)
- [ ] A-7: Copy unification — GET MATCHED vs Continue; kill "from our library" false claim; reconcile "32 plans" vs "65 series"
- [ ] A-8: Re-enable reader SSR (fix `too-busy-for-god-day-6` serialization bug; `DevotionalPageClient.tsx:100`) — no loader flash
- [ ] A-9: Session cookie misspelling `euongelion_session` — rename with live-key migration care
- [ ] A-V: Sprint A verification — type-check, lint, tests, `npm run preview` + curl affected routes, real Soul-Audit generation end-to-end
- [ ] A-D: DEPLOY Sprint A live + verify production

## Task 3 — Sprint B: coherence (P1 9–12)

- [ ] B-10: Mobile bottom tab bar (Today · Series · Soul Audit · Library · You), safe-area-aware, persistent; mobile top bar = identity + utilities only (zero duplication); desktop masthead keeps destinations incl. Daily Bread + Library (SA-NEW-1; refs: Open, Calm, Headspace)
- [ ] B-10b: Reconcile with `APP-VS-WEB-APP.md` + `M04` + `M00`; assign real SA id in production-decisions.yaml + MASTER-DECISIONS.md; PRD `F-NEW-a`
- [ ] B-11: In-reader "Aa" sheet — curated named themes (Ink, Parchment, Vellum, Night) per Apple Books named presets
- [ ] B-12: Consolidate Library to the 7-tab rail; retire `/saved` + `/clippings` as standalone (ElevenReader model)
- [ ] B-13: Signed-in "Today" home distinct from marketing landing (Calm/Headspace greeting + continue + one recommendation)
- [ ] B-V: Sprint B verification (as A-V; include 375/390/768/1280/1440 light+dark checks)
- [ ] B-D: DEPLOY Sprint B live + verify production

## Task 4 — Sprint C: completeness (P1 13–16)

- [ ] C-14: Reminder scheduler — single time-window picker, brand voice ("one quiet word each morning"), Waking Up "Moment" model
- [ ] C-15: Global search over series + notes + clippings (or remove advertised SearchAction) — Calm/Ten Percent pattern
- [ ] C-16: PWA install prompt after good session (`beforeinstallprompt`), Finch-gentle timing
- [ ] C-17: Settings restructure — grouped cards + light profile header; stop exposing "when this ships" UI (Claude/Cosmos refs)
- [ ] C-V: Sprint C verification
- [ ] C-D: DEPLOY Sprint C live + verify production

## Task 5 — Sprint D: signature polish (P2 17–21)

- [ ] D-18: Every empty state → illustration (riso library) + one sentence + one CTA (Pinterest/Skyscanner/OpenTable)
- [ ] D-19: Quiet completion beat after day/plan (Headspace post-session quote; NOT confetti) — revive DevotionalMilestoneReveal or build fresh (SA-NEW-2)
- [ ] D-20: Gentle presence indicator — lit/unlit dots, zero counts, no shame (Open dotted week / Bears Gratitude) (SA-NEW-2)
- [ ] D-20b: Assign real SA id for momentum hybrid; PRD `F-NEW-d`
- [ ] D-21: Series/plan detail tabs (Sessions · About · Voices · Artwork) — Waking Up
- [ ] D-22: "Why this recommendation" row on matched series — Headspace
- [ ] D-23: Haptics + native sheets + safe-area audit + unified motion language (one easing, one duration scale) — Calm
- [ ] D-24: Replace all mismatched skeletons with layout-accurate ones
- [ ] D-V: Sprint D verification
- [ ] D-D: DEPLOY Sprint D live + verify production

## Task 6 — Imagery: plan + samples only (full run gated at Task 9)

- [ ] I-1: Inventory every image slot (headers, series cards, Soul Audit results, empty states, Today home, detail pages, OG/social) → this checklist + IMAGERY_PLAN.md
- [ ] I-2: Full context-sensitive plan per slot (exact content served, specific subject + why, format/ratio, credit estimate); typographic fallback for subject-less slots
- [ ] I-3: Generate ONE sample per format category (wide header, card, thumbnail, empty state, one animated test) — ~5–8 generations, ledger updated after EVERY generation; 500-credit HARD CAP
- [ ] I-4: Integration pipeline (formats, compression, lazy-loading) + wire samples in
- [ ] I-5: DEPLOY samples live; STOP generation until Task 9 approval

## Task 7 — Auto-research optimization loop (LCP)

- [ ] L-1: Write instructions.md (goal, rules, cadence, termination ladder) — LOCKED after write
- [ ] L-2: Write score.py (LCP ms, homepage + reader) — LOCKED after write; FIT CHECK: objectively scored / fast feedback / direct asset access
- [ ] L-3: Record baseline score
- [ ] L-4: Run loop (one hypothesis per round, score, keep/revert, log to RESULTS_LOG.md) until: Tier 4 (<1.2s) · Tier 2 + 10 stale rounds · 100 rounds
- [ ] L-5: DEPLOY winning baseline; record final tier + summary

## Task 8 — Final deploy + production verification

- [ ] V-1: Confirm nothing undeployed (diff working tree vs live)
- [ ] V-2: Live smoke — every route loads, no 404s, no reader loader flash
- [ ] V-3: Live smoke — Soul Audit end-to-end (input → generation → reveal → reader)
- [ ] V-4: Live smoke — auth (magic link + Google), sign-out, return
- [ ] V-5: Live smoke — state persistence (hard reload mid-devotional, resume)
- [ ] V-6: Live smoke — mobile (tab bar, safe areas, install prompt, Aa sheet)
- [ ] V-7: Score final live LCP; record tier
- [ ] V-8: Fix + redeploy anything failing; log to CHANGELOG.md

## Task 9 — FINAL HUMAN GATE (the only stop)

- [ ] G-1: Imagery review package (plan + live samples + credit forecast) → on approval: full generation run, integrate, deploy, close ledger
- [ ] G-2: RESEARCH_OAUTH.md recommendation → founder decision
- [ ] G-3: HUMAN_REQUIRED.md — shortest possible, exact steps per item
- [ ] G-4: Run report — checklist complete, changelog + deploy history, decisions, loop results + final tier, live smoke results

## Spine follow-ups (execute within sprints, per audit Part 10)

- [ ] S-1: Assign real SA ids for SA-NEW-1 + SA-NEW-2 in production-decisions.yaml + MASTER-DECISIONS.md
- [ ] S-2: Create + register F-NEW-a…d PRDs (FEATURE-PRD-INDEX.md + FEATURE-PRD-REGISTRY.yaml)
- [ ] S-3: Update PRODUCTION-FEATURE-SCORECARD.md + PRODUCTION-10-10-PLAN.md from audit Part 6
- [ ] S-4: Reconcile Part 1 with APP-VS-WEB-APP.md + M04
- [ ] S-5: CHANGELOG.md entries per shipped tranche (enforced by hooks anyway)
