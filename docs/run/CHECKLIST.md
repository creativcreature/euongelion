# Launch-Readiness Run — Master Checklist

Run started: 2026-07-10. Source of truth: `docs/audits/MOBBIN-POLISH-AUDIT-2026-07-10.md`.
Legend: `[ ]` not started · `[~]` in progress · `[x]` done+verified · `[!]` blocked (see DECISIONS.md / HUMAN_REQUIRED.md)

## Task 0 — Bootstrap

- [x] T0-1: Verify working state (branch `elevation/soul-audit-rebuild`, 46 ahead of main; last prod deploy 2026-06-21)
- [x] T0-2: Commit prior-session Bible-365 full-run rewrite as clean baseline (27c88829; 365/365 validated)
- [x] T0-3: Identify deploy pipeline → HANDOFF.md (Cloudflare Workers, `npm run deploy`, wrangler token verified)
- [x] T0-4: GitHub push credentials — MISSING → HUMAN_REQUIRED.md item 1 (deploys unaffected)
- [x] T0-5: Create docs/run/ with all 7 tracking files, commit

## Task 1 — OAuth subscription sign-in research

- [x] T1-1: Research Claude/ChatGPT/Manus subscription-OAuth feasibility (flows, official support, ToS)
- [x] T1-2: Write docs/run/RESEARCH_OAUTH.md with findings + recommendation
- [x] T1-3: (gate verdict NO — logged, no build) If (and only if) a fully supported ToS-compliant zero-founder-input path exists → implement; else log and move on

## Task 2 — Sprint A: correctness (P0 1–9)

- [x] A-0: Verify every audit claim against current code before fixing (anchors may have drifted)
- [x] A-1: Soul-Audit guided-reveal dead code (`soul-audit/results/page.tsx:70-73`) — revive Calm/Yazio-style progressive reveal (recommended first, alternatives on tap) or delete cleanly
- [x] A-2: Result cards render bare (`OptionCard.tsx:33-38`; AI slug ≠ series slug) — resolve real hero from scripture theme or design text-first card (Yazio)
- [x] A-2b: `seriesSlug` written to plan is AI slug (`select/route.ts:724`) → resume badge title empty (`current/route.ts:98`) — store resolvable title/theme
- [x] A-3: Results loading skeleton (3-up grid) → match real stacked RECOMMENDED/ALTERNATIVE layout
- [x] A-4: (5 deleted: WalkthroughModal, SeriesSearchPanel, MixedHeadline, NetworkStatusBanner, SeriesHero; GuestSignupGate→Sprint C, DevotionalMilestoneReveal→Sprint D) Wire-or-delete 0-import orphans: GuestSignupGate · WalkthroughModal · SeriesSearchPanel · SeriesHero · MixedHeadline · NetworkStatusBanner · DevotionalMilestoneReveal (verify each is truly 0-import first)
- [x] A-5: Two-reader ambiguity (`/soul-audit/plan/[planToken]` vs `/daily-bread`) — pick canonical, finish or retire the other; fix devotional-silo self-canonical URLs (`devotional/[slug]/page.tsx:56`)
- [x] A-6: `/saved` mis-routes Euangelion-silo bookmarks to `/wake-up/devotional/*` (`SavedList.tsx:153`)
- [x] A-7: Copy unification (computed counts 33/540; false claims fixed; GET MATCHED unified) — GET MATCHED vs Continue; kill "from our library" false claim; reconcile "32 plans" vs "65 series"
- [x] A-8: (540/540 corpus proof, 1257 pages prerender) Re-enable reader SSR (fix `too-busy-for-god-day-6` serialization bug; `DevotionalPageClient.tsx:100`) — no loader flash
- [x] A-9: Session cookie misspelling (legacy-read fallback migration, zero loss) `euongelion_session` — rename with live-key migration care
- [x] A-V: Sprint A verification — preview battery 36/36 + REAL generation e2e (submit→3 options→select→54 polls→complete→/daily-bread 107KB→resume title resolves) — type-check, lint, tests, `npm run preview` + curl affected routes, real Soul-Audit generation end-to-end
- [x] A-D: DEPLOYED (version f16f2b80, 2026-07-10) + live battery 36/36 on euangelion.app — includes Sprint B nav tranche

## Task 3 — Sprint B: coherence (P1 9–12)

- [x] B-10: Mobile bottom tab bar (MobileTabBar shipped, z-scale conformance, mobile theme toggle added, hamburger=overflow-only, desktop masthead restored; commit f83288d1) (Today · Series · Soul Audit · Library · You), safe-area-aware, persistent; mobile top bar = identity + utilities only (zero duplication); desktop masthead keeps destinations incl. Daily Bread + Library (SA-NEW-1; refs: Open, Calm, Headspace)
- [x] B-10b: (M04 + APP-VS-WEB-APP addenda; SA-024 assigned) Reconcile with `APP-VS-WEB-APP.md` + `M04` + `M00`; assign real SA id in production-decisions.yaml + MASTER-DECISIONS.md; PRD `F-NEW-a`
- [x] B-11: In-reader "Aa" sheet (Ink/Parchment/Vellum/Night + size stepper; WCAG ratios computed; 11/11 tests; commit pending wave-2) — curated named themes (Ink, Parchment, Vellum, Night) per Apple Books named presets
- [x] B-12: Consolidate Library (9-tab /library; /saved + /clippings 307d; SavedList deleted; full suite 1480 green; commit pending wave-2) to the 7-tab rail; retire `/saved` + `/clippings` as standalone (ElevenReader model)
- [x] B-13: Signed-in "Today" home (TodayReturningBand island, 7/7 tests; commit pending B-12 landing) distinct from marketing landing (Calm/Headspace greeting + continue + one recommendation)
- [x] B-V: Sprint B verification (preview battery 51/51) (as A-V; include 375/390/768/1280/1440 light+dark checks)
- [x] B-D: DEPLOYED (version a6a87f48) + live battery 51/51

## Task 4 — Sprint C: completeness (P1 13–16)

- [x] C-14: Reminder scheduler (honest 6-state picker + window/timezone/idempotent sender; 50 new tests; go-live = HUMAN_REQUIRED #2) — single time-window picker, brand voice ("one quiet word each morning"), Waking Up "Moment" model
- [x] C-15: Global search (series+devotionals+notes, Cmd/Ctrl+K, SearchAction made real; 19/19 tests; commit pending wave-2) over series + notes + clippings (or remove advertised SearchAction) — Calm/Ten Percent pattern
- [x] C-16: PWA install prompt (InstallPrompt.tsx, real completion signals, 11/11 tests + Playwright real-browser checks; commit pending B-12 landing) after good session (`beforeinstallprompt`), Finch-gentle timing
- [x] C-17: Settings restructure (profile header + 6 grouped cards; dead "coming soon" UI deleted; all prior controls asserted present; commit pending wave-2) — grouped cards + light profile header; stop exposing "when this ships" UI (Claude/Cosmos refs)
- [x] C-V: Sprint C verification (preview battery 51/51; note C-14 delivery awaits HUMAN_REQUIRED #2)
- [x] C-D: DEPLOYED (version a6a87f48) + live battery 51/51

## Task 5 — Sprint D: signature polish (P2 17–21)

- [x] D-18: Every empty state designed (3 new library-sourced illustrations w/ justifications + catalog assignedTo; 6 typographic tightened; rest verified already-good; commit pending wave-3)
- [x] D-19: Quiet completion beat — LIVE (CompletionBeat, 7 benedictions, both readers; DevotionalMilestoneReveal deleted) after day/plan (Headspace post-session quote; NOT confetti) — revive DevotionalMilestoneReveal or build fresh (SA-NEW-2)
- [x] D-20: Gentle presence indicator (PresenceWeekRow on /today + Settings profile; local real data; zero visible counts) — lit/unlit dots, zero counts, no shame (Open dotted week / Bears Gratitude) (SA-NEW-2)
- [x] D-20b: (SA-025 + F-066 created earlier) Assign real SA id for momentum hybrid; PRD `F-NEW-d`
- [x] D-21: Series/plan detail tabs (adaptive 4/3/2-tab model backed by real profile modules + artwork assignments; bible-365 grouped nav preserved; 9/9 tests; commit pending wave-2) (Sessions · About · Voices · Artwork) — Waking Up
- [x] D-22: Why-this rows on Today band + Daily Bread + curated view (real stored reasoning only, vanish rather than fabricate; commit pending wave-3)
- [ ] D-23: Haptics + native sheets + safe-area audit + unified motion language (one easing, one duration scale) — Calm
- [ ] D-24: Replace all mismatched skeletons with layout-accurate ones
- [ ] D-V: Sprint D verification
- [ ] D-D: DEPLOY Sprint D live + verify production

## Task 6 — Imagery: plan + samples only (full run gated at Task 9)

- [x] I-1: Inventory every image slot (IMAGERY_PLAN.md; KEEP ~60, REPLACE 18 [founder gate], FILL ~380, GENERATE small list, TYPO ~25) (headers, series cards, Soul Audit results, empty states, Today home, detail pages, OG/social) → this checklist + IMAGERY_PLAN.md
- [x] I-2: Full context-sensitive plan (Phase 2 forecast 112-130 credits of 500 cap; manifest spot-checks pass) per slot (exact content served, specific subject + why, format/ratio, credit estimate); typographic fallback for subject-less slots
- [x] I-3: Samples generated (6 gens, Nano Banana FREE — 0/500 paid credits; 1 discarded for style violation, regenerated compliant) (wide header, card, thumbnail, empty state, one animated test) — ~5–8 generations, ledger updated after EVERY generation; 500-credit HARD CAP
- [x] I-4: (sharp→webp q68-80; inkwell wired to homepage step-1, ribbon+scissors wired to library empty states; /design/imagery-samples review page; CSS grain-shimmer animated test) Integration pipeline (formats, compression, lazy-loading) + wire samples in
- [x] I-5: Samples LIVE (/design/imagery-samples + wired slots; generation stopped until Task 9 approval); STOP generation until Task 9 approval

## Task 7 — Auto-research optimization loop (LCP)

- [x] L-1: Write instructions.md (docs/run/loop/, LOCKED) (goal, rules, cadence, termination ladder) — LOCKED after write
- [x] L-2: Write score.py (docs/run/loop/score.py; Lighthouse 13 + headless Chrome verified present; FIT CHECK passes) (LCP ms, homepage + reader) — LOCKED after write; FIT CHECK: objectively scored / fast feedback / direct asset access
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

- [x] S-1: Assign real SA ids (SA-024 platform IA, SA-025 momentum hybrid) for SA-NEW-1 + SA-NEW-2 in production-decisions.yaml + MASTER-DECISIONS.md
- [x] S-2: (F-063..F-074 created + indexed; registry count-locked at 54 — followed F-056..062 precedent, see DECISIONS D-004) Create + register F-NEW-a…d PRDs (FEATURE-PRD-INDEX.md + FEATURE-PRD-REGISTRY.yaml)
- [~] S-3: (deploy-1 addendum written; full re-score scheduled at Task 8 when everything is live) Update PRODUCTION-FEATURE-SCORECARD.md + PRODUCTION-10-10-PLAN.md from audit Part 6
- [x] S-4: Reconcile Part 1 with APP-VS-WEB-APP.md + M04 (addenda committed with Sprint B tranche 1)
- [ ] S-5: CHANGELOG.md entries per shipped tranche (enforced by hooks anyway)
