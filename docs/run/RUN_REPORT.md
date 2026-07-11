# Launch-Readiness Run — Founder Report (Task 9 package)

Run date: 2026-07-10. Source of truth: `docs/audits/MOBBIN-POLISH-AUDIT-2026-07-10.md`.
Status: IN PROGRESS — this report fills in as the final phases land. Sections marked ⏳ complete before the gate.

## What is LIVE on euangelion.app right now

**Deploy 1** (version `f16f2b80`) + **Deploy 2** (version `a6a87f48`), both verified with live batteries (36/36, then 51/51):

**Sprint A — every P0 correctness item:**

- Soul Audit guided reveal revived (recommended-first, alternatives on tap — Calm/Yazio)
- Result cards text-first and complete (real keyword chips, true day count; dead lookups removed)
- Layout-accurate results skeleton; resume badge always carries a real plan title
- One canonical reader: `/soul-audit/plan/<token>` deep links 307 → `/daily-bread`
- `/saved` silo routing fixed; sitemap purged of 175 non-canonical URLs
- Copy truth: computed catalog counts (33 series / 540 devotionals) replace three conflicting hardcodes; "from our library" false claim gone; GET MATCHED unified
- Reader SSR re-enabled — 540/540 corpus render proof, no loader flash
- Session cookie renamed (`euangelion_session`) with zero-loss migration
- 7 orphan components deleted

**Sprint B/C + Sprint D (wave 2):**

- SA-024 platform-adaptive nav: mobile bottom tab bar (Today · Series · Soul Audit · Library · You), mobile top bar = identity + utilities (theme toggle added — mobile had none), desktop masthead restored (Daily Bread + Library back)
- Library consolidated: one 9-tab `/library`; `/saved` + `/clippings` retired via 307
- In-reader "Aa" sheet: Ink / Parchment / Vellum / Night named themes + size stepper (WCAG-verified)
- Signed-in Today band: greeting + continue card + one recommendation
- Settings: profile header + six grouped cards; "coming soon" UI deleted
- Global search: series + 1,074 devotionals + your notes; masthead/top-bar glyphs + Cmd/Ctrl+K
- PWA install prompt: post-completion only, 60-day dismissal respect, iOS fallback
- Series detail tabs: adaptive DAYS · ABOUT · VOICES · ARTWORK (never fabricated)
- SA-025 momentum hybrid: quiet completion beat (7 rotating benedictions) + presence week row (no counts, no shame); install prompt waits 10s so the beat lands first
- Imagery Phase-1 samples wired + `/design/imagery-samples` review page

⏳ **Deploy 3** (Sprint D final: remaining empty states, why-matched rows, motion tokens + haptics + safe-area audit, skeleton sweep) — agents running.

## G-1 — IMAGERY REVIEW (decision needed)

- Review live: **https://euangelion.app/design/imagery-samples** (noindexed).
- Plan + per-slot inventory: `docs/run/IMAGERY_PLAN.md`. Ledger: **0 / 500 paid credits used** (samples came from Nano Banana free tier; one off-spec attempt discarded and regenerated compliant).
- Phase 2 forecast: **~112–130 credits** (core) / ~162 with the bespoke-substack contingency — well under cap.
- Founder decisions queued:
  1. Approve the sample style → full generation run executes (fills ~380 library slots + small generation list).
  2. **R37 conflict**: 16 substack series serve wokeGod title-cards (display text, violates the no-text style spec) as heroes because `series-hero.ts` preference order shadows on-disk posters. Fix is a one-line code flip but reverses founder direction R37 — your call.
  3. Empty-state illustration style confirmation (two live examples: Library → Bookmarks / Clippings tabs when empty).

## G-2 — OAuth research (decision needed)

`docs/run/RESEARCH_OAUTH.md` (25+ citations). Verdict: **no ToS-compliant path exists today** for users signing in with Claude/ChatGPT/Manus subscriptions to power the Curator.

- Anthropic: partner-gated only; token reuse explicitly forbidden + fingerprint-enforced.
- OpenAI: "Sign in with ChatGPT" still an interest-form pilot; not GA.
- Manus: none.
- Closest compliant alternatives (tradeoffs in the doc): OpenRouter OAuth PKCE (user pays own inference — buildable today), Euangelion as a Claude connector / ChatGPT app (subscription-funded but inside their apps), BYOK, or keep the current app-key + cost rails.

## G-3 — HUMAN_REQUIRED (2 items, exact steps in the file)

1. **GitHub push credentials** — all run commits are local-only (deploys unaffected). `! git push` from a session, or install gh.
2. **Reminders go-live** — 5 steps ~10 min (migration 017 → VAPID keys [pre-generated] → edge deploy → pg_cron → guarded first send). Autonomous DB apply was denied by the session permission gate. Until then the Settings picker shows its honest "unconfigured" state.

## G-4 — Run evidence

- Tracking: `docs/run/CHECKLIST.md` (item-level), `docs/run/CHANGELOG.md` (append-only with deploy history), `docs/run/DECISIONS.md` (D-001…D-008, each with reasoning + anchors).
- Repo CHANGELOG.md carries the shipped-tranche entries; PRDs F-063…F-074 carry dated outcome rows.
- Test state at wave-2: **116 files / 1581 tests green**, type-check + lint clean.
- Real generation verified END-TO-END twice: Workers preview (plan built, `/daily-bread` served 107KB, resume title real) and ⏳ live production run in progress.
- ⏳ LCP loop: baseline measuring; ladder Tier 1 <4.0s · Tier 2 <2.5s (launch bar) · Tier 3 <1.8s · Tier 4 <1.2s. Results: `docs/run/RESULTS_LOG.md`.
- ⏳ Final live smoke matrix (Task 8) + scorecard re-score.

## Founder visual checks (couldn't be automated this session — Chrome extension not connected)

1. Phone at 375px: tab bar feel, Aa sheet, search overlay, install prompt after completing a reading, completion beat timing/typography, presence dots contrast in both themes.
2. Auth: magic link + Google sign-in/out round-trip in a real browser.
3. Reduce-motion pass: beat and overlays appear without animation.
4. `/design/imagery-samples` on a real screen (grain shimmer plays on the header sample).
