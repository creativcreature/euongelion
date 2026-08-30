# Session Handoff — 2026-07-26 → 2026-07-30 (The Harvest + Daily Bread + Site Cleanup)

Closing handoff for the marathon session that shipped The Harvest series
(v1→v5), root-caused and fixed the six-month Daily Bread failure, retired the
legacy Wake-Up mount, and ran the first fine-tooth-comb site cleanup. Written
so the next session can continue with zero re-litigation.

---

## 1. What is LIVE right now (deploy chain, newest last)

| Deploy     | What it shipped                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `92552ea5` | The Harvest v1 live end-to-end (13 riso images, featured lead, SA-031)                                                                           |
| `62a2ed49` | Daily Bread root cause #1 code fix + Harvest v2 re-angle                                                                                         |
| `cf5ae69a` | Root cause #2: Supabase session-refresh restored as **edge middleware** (`src/middleware.ts`)                                                    |
| `015e029e` | Harvest v3 (patience center) + page dedup + settings cleanup pass 1 + 25 dead files removed + riso-first series heroes                           |
| `b79a5562` | Harvest v4 (Matthew 13 cluster) + cross-testament rule + imagery accuracy gate + account-state resume                                            |
| `c3cb7a5c` | **Wake-Up mount retired** (308s live; build 1298→707 pages) + AI & KEYS repair + fear-copy softening                                             |
| `ff061ea8` | **Harvest v5 — clean-sheet single-author rewrite** + reader-timeline TOC removed + zombie-plan expiry + System-theme listener + settings reorder |
| `30b4999d` | **TODAY nav → /daily-bread** (was pointing at the /today rotation everywhere — the real cause of "seek first the kingdom" recurring)             |

Migration 013 (`active_series` + `scheduled_series_swap` + `archived_series`)
is **applied in prod** (founder-approved, verified: 3 tables, 12 RLS policies,
write-path proven). 15 stale "active" soul-audit plans (Mar–Jul) archived in
prod.

## 2. The Harvest — current content state (v5)

- **Clean-sheet rewrite by ONE author in one sitting** (founder rejected
  v1-v4 as patchwork). Spec: scratchpad `harvest-v5-spec.md`; consolidated
  rulings live in `content/series-briefs/the-harvest.md` (v1 brief + v3/v4/v5
  ruling appendices) and `content/source-packs/the-harvest.md` §1–§3 (the
  ONLY citation pool; §2 = Luke 23, §3 = Matthew 13 cluster + OT texts).
- **Anchor:** the Wheat and the Weeds IS the series. Day 1 "While Everyone
  Slept" opens its two-minute head with Matt 13:24-26. Siblings serve it in
  canonical order: Sower = Day 1 deep-dive on-ramp; Mustard/Leaven = Day 3;
  Net = Day 5; Mark 4:26-29 = Day 7 sabbath.
- **Center:** God's enduring patience with the not-yet-turned; a full life
  runs to judgment, the harvest never called early (thief on the cross,
  Newton); patient witness toward the loved one who denies Christ (his
  brother is the unnamed referent — NEVER put private stories in content).
- **Voice:** AUTHORING-SPEC §2 table enforced — B/C/B′ teachings "we"/third
  person, ZERO second person (founder correction); "you" only in bookends /
  reflections / prayers / takeaways.
- **Repetition:** founder reads for it. Stock phrases at zero; 2 Peter 3:9
  full-quote once; loved-one motif once/day in sanctioned slots.
- Imagery: 17 riso images incl. the botanically CORRECT wheat/darnel plate
  (young identical; mature wheat bows golden, darnel stiff/thin) — the v1
  identical-heads plate was founder-rejected. Validator PASS ×7; editor gate
  READY; artifact (same URL all session):
  https://claude.ai/code/artifact/75c8b748-cce2-4dd7-b93b-4aa3e0e598e6

## 3. Daily Bread / TODAY — how it works now

1. **TODAY (header + tab bar) → `/daily-bread`.** The `/today` editorial
   date-rotation still exists but only as footer "Today's Edition".
2. `/daily-bread` resolution order: `active_series` (account-keyed, PATCHed
   day position) → owner-stamped soul-audit plan (`owner_user_id`, stamped at
   sign-in + lazily on read) → session-cookie plan → EmptyState. Expired
   plans (last unlock > 7 days past) auto-archive on read.
3. **No silent fallbacks:** all library writes throw `LibraryPersistenceError`
   with cache rollback; routes return honest 503 `PERSISTENCE_FAILED`.
4. Sign-out = unconditional local reset (sb-\* + audit cookies cleared even
   when upstream revocation fails); state survives on the ACCOUNT.
5. Session refresh happens in `src/middleware.ts` (EDGE — see traps).

## 4. Founder verification still outstanding (only he can do these)

- [ ] Signed-in activate → hard reload (→ next day) → devotional persists.
- [ ] TODAY tap lands on The Harvest (his `active_series` row: the-harvest).
- [ ] Old /wake-up bookmark 308s to /series.
- [ ] System theme follows macOS light/dark switch live.
- [ ] Read v5 Day 1 + Day 4 (Jonah) for voice/angle sign-off.

## 5. Open items / held decisions (need founder ruling)

1. **Supabase dashboard (HUMAN_REQUIRED, accounts diagnosis 2026-07-22):**
   built-in mailer 2/hr cap; magic-link/signup templates missing the token
   variable (in-app 6-digit code form unusable). Sign-in UX stays fragile
   until fixed in the dashboard.
2. **Deferred infra kept on disk** (delete or build?): `clarifier.ts`
   (+CLARIFIER_ENABLED), `queue-producer.ts` (+PHASE_5_ASYNC_ENABLED,
   runbook exists), `voice-bank.ts`.
3. `/design/imagery-samples` — kept (founder-locked imagery workflow).
4. Ellipsis style inside 3 pack quotes ("..." vs "…") — cosmetic, quotes
   byte-verbatim otherwise.
5. `/today` rotation product question: keep as editorial surface, fold into
   Daily Bread, or retire?
6. Settings deeper IA (current order: ACCOUNT → READING → REMINDERS → DATA &
   PRIVACY → ADVANCED-AI & KEYS → ABOUT) — founder called settings "a
   complete mess" before the reorder; confirm the new order satisfies.

## 6. Standing rules added this session (registered, enforced)

- **SA-031:** featured area = exactly 7 cards, most-recent series leads
  (homepage main feature = HARDCODED `HOMEPAGE_TODAY` in `src/app/page.tsx`
  — series.ts alone does NOT change it); /devo-go runs uninterrupted
  end-to-end (artifact still published; gates still run and get reported).
- **SA-032:** cross-testament connection EVERY prefab day; parable-cluster
  rule; imagery ACCURACY gate (fact-check before style-check); editor
  cross-day repetition sweep; account-state resume semantics.
- **SA-033:** wake-up retirement executed; AI & KEYS honest fields; tone
  rules on series contexts; TODAY = your devotional.
- Skill: `.claude/skills/devo-go/` amended for all of the above.

## 7. Traps for the next session (hard-won)

- **Middleware must stay `src/middleware.ts` (legacy convention, EDGE).**
  Next 16's `proxy.ts` is Node-only and `@opennextjs/cloudflare` hard-fails
  Node middleware. Ignore the build deprecation warning. Never "fix" it back.
- Applying prod DDL via Supabase Management API needs founder-named approval
  (auto-mode classifier blocks); curl with custom User-Agent (urllib gets
  Cloudflare-1010'd). `.env.local` has service-role + access tokens; REST
  probe tables BEFORE diagnosing any "state doesn't persist" report.
- "Feature forgets state on reload" playbook: (1) probe the table exists,
  (2) check the surface the user actually CLICKS (TODAY ≠ /daily-bread was
  missed for days), (3) check auth visibility server-side, (4) check for
  stale plan/cookie zombies.
- Parallel-writer content passes converge on identical phrases — the editor
  gate MUST run the cross-day sweep; better: single author for coherence.
- `git checkout --` restores from INDEX — after multi-edit sessions this can
  silently revert uncommitted sibling edits; re-verify after any restore.
- Multi-line JSX surgery: use exact literal blocks, never `[\s\S]*?` regex
  (`=>` broke a `[^>]*` scan and a greedy match ate 130 lines once).
- Edge cache: warm every URL post-deploy (zsh array loop); fresh assets can
  404 once — retry before diagnosing; `/daily-bread` must stay
  `private, no-store` (it is).
- `devotional-teasers.ts` regenerates wholesale on build — diff KEYS
  (`^  '([a-z0-9-]+)':`) for 0-lost/N-gained, not line counts.
- Tests with hardcoded counts: series-data (35 series), PRD integrity (84
  F-ids). Bump on every addition.
- `vitest` "4 unhandled errors" = pre-existing gsap teardown noise in
  soul-audit tests; not a failure signal.

## 8. Tracking pointers

- Decisions: `docs/production-decisions.yaml` (SA-031/032/033 canonical).
- PRDs: F-082 (Harvest), F-083 (Daily Bread persistence/nav), F-084
  (Wake-Up retirement + cleanup 2) — all with dated outcome logs.
- `CHANGELOG.md` 2026-07-26/27 entries tell the full story in order.
- Memory: `project_harvest_ship_sa031.md` (all content rulings + traps),
  `project_accounts_diagnosis.md` (auth/db playbook),
  `project_wakeup_route_retirement.md` (CLOSED).
- Uncommitted drift note: `src/components/LibraryView.tsx` shows
  formatter-touched modifications in the working tree from a parallel
  session — leave staging to explicit file lists as always.
