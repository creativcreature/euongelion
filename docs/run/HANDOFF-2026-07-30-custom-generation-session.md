# Session Handoff — Custom Generation, Accounts, Storefront (closed 2026-07-30)

**Session span:** 2026-07-10 → 2026-07-30 · **Branch:** work landed on `elevation/soul-audit-rebuild`, merged to `main`, deployed with the Jabez release (2026-07-12) and after.
**Read this with:** `docs/PRODUCTION-COMPACTION-HANDOFF.md` (resume protocol), `docs/production-decisions.yaml` (canonical SA registry), auto-memory (`project_custom_generation_rulings`, `project_accounts_diagnosis`, `project_merch_storefront_direction`).
**Caution:** parallel sessions moved the repo after this session's last code work (SA-031–033, F-082–084, Harvest, wake-up retirement, `src/middleware.ts` session refresh, migration 013 applied). Where this doc conflicts with newer commits or memory, the newer record wins.

---

## 1. What this session shipped (all committed, all gates green at time of commit)

**The custom-generation brief (founder-supplied), Phases 0–2 complete:**

- **Phase 0:** founder rulings ratified as **SA-026** (generation gated: audit/options/curated reading anonymous+free forever; bespoke generation needs a verified account; 1 free generation each), **SA-027** (locked pricing $7/$77/$140/$200 stands; all six access paths approved, subscription primary), **SA-028** (billing single source of truth = `public.users`, webhook-written). Mirrored in MASTER-DECISIONS §4 + PRODUCTION-SOURCE-OF-TRUTH amendments. Fresh-start reset script delivered (never executed): `scripts/ops/fresh-start-reset.mjs` + `docs/runbooks/FRESH-START-RESET-RUNBOOK.md`.
- **Phase 1 (F-075–F-079):** billing read/write split fixed (webhooks + reads unified on `public.users`, Stripe IDs stored, webhook idempotency table, authenticated checkout, one-time 2yr/3yr term plans made purchasable); SA-026 entitlement gate at `/api/soul-audit/select` (401 `SIGN_IN_REQUIRED` / 402 `GENERATION_ENTITLEMENT_REQUIRED`, atomic free grant reserved after pre-checks, released on failure); paywall/checkout-return/success-room/subscription-management surfaces per the founder-approved pattern doc (`docs/design/CUSTOM-GENERATION-PATTERN-DECISIONS.md` — Substack-adjacent commerce honesty, held-generation resume via `?resume=1` + `pendingGenerationStore`); held-moment interstitial ("press room meets Upper Room", stages ratchet on real job signals, consent-cued arrival echo); onboarding bookends (named reminder windows); Google sign-in (flag-gated) + Turnstile (key-gated); §9 admin reset (`users.role`, 4-gate caller-only `/api/admin/reset-my-account`); OWASP Top-10 audit + same-day remediation (`docs/security/OWASP-TOP10-SELF-AUDIT-2026-07-11.md`).
- **Phase 2 (F-080):** journaled credits (`users.generation_credits` + `generation_credit_ledger`, event-idempotent webhook grants, atomic consume/refund), gift codes (sha256-only, atomic `redeem_gift_code` DB fn, no-oracle redemption 5/hr/IP, internal-secret mint at `/api/admin/gift-codes`), pack card + redeem sheet + covered mode in the paywall.
- **Failure-protection tranche (founder ruling "users never have failures / never pay for ours"):** grounding verifier clears English loanwords with diacritics (the "naïveté" class) while still catching fabricated transliterations (F-027); retrying a failed/stalled run bypasses gate + daily plan cap — charged once at creation (F-076); subscriber allowance counts DISTINCT runs; plan-read + deepen routes owner-scoped via `src/lib/soul-audit/plan-ownership.ts` (F-077).
- **Runtime-critical pairing:** `next@16.2.10` requires `@opennextjs/cloudflare@1.20.1` — the old adapter cannot bundle the OG-image wasm. Verified in real workerd. Never downgrade one without the other.
- **Accounts fixes (2026-07-22, commit `7de104f5`):** magic-link route returns honest statuses (429 mail-cap, 400 bad address — was raw 500); first-session onboarding window 120s → 24h.

**Everything above ships DARK behind two flags that must flip TOGETHER: `GENERATION_GATE_LIVE` + `BILLING_CHECKOUT_LIVE`** (neither exists in the Worker yet — deliberate; gating without payment = partial launch, forbidden by rule 10).

## 2. FOUNDER-ONLY actions (the launch checklist, in order)

1. **Supabase → Auth → SMTP:** custom sender (Resend/Postmark/SES) + raise the 2-emails/HOUR project cap. _This is the "accounts don't work" root cause._
2. **Supabase → Auth → Email Templates:** add `<p>Your sign-in code: {{ .Token }}</p>` to _Magic Link_ AND _Confirm signup_ (HUMAN_REQUIRED #3, open since Wave 4). Makes the in-app code entry work and neutralizes single-browser PKCE link failures.
3. **Apply the three billing migrations** in order (`supabase/migrations/20260710000001`, `20260711000001`, `20260712000001`) — unapplied as of the 2026-07-22 probe (re-probe first; migration 013 was since applied by another session, these three may or may not have been). **Never flip `GENERATION_GATE_LIVE` before these are in** — it would deny generation to every account. Precedent: DDL against prod needs founder-named approval; Management API works but use curl with a custom User-Agent (Cloudflare 1010s urllib).
4. **Stripe:** create prices → set Worker/build envs `STRIPE_PRICE_PREMIUM_MONTHLY/ANNUAL/2YEAR/3YEAR`, `STRIPE_PRICE_CREDITS_3/5/10`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; register the webhook endpoint; then a staging end-to-end (checkout → webhook → entitlement flip → success room resume) — never live-verified, tracked in F-078.
5. **Optional providers:** Google button = set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` at build (Supabase side already configured); Turnstile = create widget, set both keys; Upstash (`UPSTASH_REDIS_REST_URL/TOKEN`) — without it rate limiting is per-isolate memory only.
6. **Sign off the legal copy diffs:** `docs/legal/PHASE1-LEGAL-COPY-DIFFS.md` (3 wording questions inside: refund stance, price-hardcoding, credits forward-reference). Not applied to `content/legal/` until approved.
7. **Pre-launch:** run the fresh-start reset per the runbook (backup → verify → stripe-review → dry-run → wipe; you trigger every step), grant your `users.role='admin'` by SQL, set `ADMIN_ACCOUNT_RESET_ENABLED=true` where wanted, walk the site per brief §9, then flip both launch flags together and set `INTERNAL_ROUTE_SECRET`-backed GH secrets so `billing-reconcile.yml` (nightly) runs.
8. **Storefront:** create the Fourthwall account under the wokeGod LLC + connect payouts (recommendation verified 2026-07-22: merchant of record, guest checkout, free plan — no second accounts ever). Then any session can skin it (riso, library-first), add the three collections (Euangelion · Dem Good Vibez · wokeGod), and wire links-only integration (nav Store + series-page tiles; never inside the reader).

## 3. Open build threads for the next session

- **Accounts/settings rebuild to the chosen comparable** — founder-selected via Mobbin 2026-07-22: **Substack reader-account model (web)** + **Waking Up More-tab settings (mobile)**; refs in `project_accounts_diagnosis` memory. Blocked only on founder items 1–2 above, then: live end-to-end sign-up walk first, rebuild second.
- **Phase 3 (BYOK, Settings-only)** and **Phase 4 (MCP round-trip)** — approved by SA-027, deliberately held: brief §11 gates them behind Phases 1–2 deployed _and tested_, and both need founder-side accounts (OpenRouter OAuth app; Claude connector / ChatGPT App Directory submissions). OpenRouter OAuth PKCE is the recommended BYOK mechanic (see `docs/run/RESEARCH_OAUTH.md`).
- **OWASP leftovers:** CSP `unsafe-inline` removal (recommend DEFER — per-request nonces force dynamic rendering sitewide, undoing the LCP work; M-1 sanitization mitigates. Note `src/middleware.ts` now exists for session refresh (F-083), which removes one obstacle but not the rendering cost); cookie-consent banner overlays the held-moment interstitial (consent design call); spend alerts are log-based until an alerting channel exists.
- **Watch at launch:** generation 504s/day-caps under load (seen once in live testing); verifier loanword allowlist is additive — extend it if a new false-positive class appears.

## 4. Traps and conventions this session learned (also in auto-memory)

- `docs/production-decisions.yaml` is the ONLY canonical SA registry (CHANGELOG contains phantom SA-xxx fix labels). F-numbers race across parallel sessions — check the registry tail before minting.
- Stage commits by **explicit file list**, never `git add -A` (parallel-session WIP gets swept — happened once, disclosed).
- Before diagnosing any "feature forgets state on reload": **probe prod Supabase for the table first** (10-second REST probe with the service key). Two 6-month-class bugs were exactly this.
- Pre-commit hooks run the full verify battery + tests — give commits a ≥5-minute timeout. `verify:bundle-secrets` needs a build first. `npm run preview` + curls = the only honest runtime test (Rule 9).
- The generation pipeline itself is untouched per the brief ("existing system wins"); its dormant composer (`composer.ts`) is test-only — don't mistake it for the live path (`grounded-weave.ts` via `runGenerationDay`).

## 5. Artifact index

Pattern/design: `docs/design/CUSTOM-GENERATION-PATTERN-DECISIONS.md` (founder-approved, picks resolved) · PRDs: F-075…F-080 (+F-065/F-027/F-076/F-077 outcome rows) · Security: `docs/security/OWASP-TOP10-SELF-AUDIT-2026-07-11.md` (with remediation log) · Reset: `scripts/ops/fresh-start-reset.mjs` + runbook · Legal: `docs/legal/PHASE1-LEGAL-COPY-DIFFS.md` (awaiting sign-off) · CI: `billing-reconcile.yml` (nightly), bundle-secret scan + npm-audit high gate in `ci.yml` · New env vars this work introduced: `GENERATION_GATE_LIVE`, `SUBSCRIPTION_MONTHLY_GENERATION_ALLOWANCE` (default 6), `SOUL_AUDIT_MONTHLY_COST_BUDGET` (default $100), `ADMIN_ACCOUNT_RESET_ENABLED`, `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`, `TURNSTILE_*`, `STRIPE_PRICE_CREDITS_*`, `CREDIT_PACK_*_LABEL`.
