# OWASP Top-10 (2021) Self-Audit — Euangelion

**Brief requirement:** custom-generation brief §12.6 — "Before launch: run an OWASP-Top-10 self-audit checklist against the app and fix all highs. Deliver the completed checklist as an artifact."

| Field   | Value                                                                                                                                                                                                                 |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date    | 2026-07-11                                                                                                                                                                                                            |
| Branch  | `elevation/soul-audit-rebuild`                                                                                                                                                                                        |
| Commit  | `ff03ad07`                                                                                                                                                                                                            |
| Method  | Static, evidence-based read of application source. Every claim cites `file:line`. No code was modified; no production environment, Supabase RLS, or Cloudflare edge config was inspected live (see **Not Assessed**). |
| Auditor | Automated security review (Claude), read-only                                                                                                                                                                         |
| Scope   | New payment/auth/generation attack surface (SA-026/027/028) plus the standing app surface                                                                                                                             |

> **Status legend:** PASS · FINDING-LOW · FINDING-MEDIUM · FINDING-HIGH · PLAUSIBLE (cannot confirm exploitability statically).
> This is an audit deliverable. **Nothing here was fixed** — findings are reported for the orchestrator/founder to triage.

---

## 1. Summary table

| #   | Category                         | Status             | Headline                                                                                                                                                                                                     |
| --- | -------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A01 | Broken Access Control            | **FINDING-MEDIUM** | Plan-scoped reader/`deepen` routes authorize by bearer UUID only (no session-ownership binding); `deepen` POST has no rate limit. Entitlement gate + status-route IDOR scoping are solid.                    |
| A02 | Cryptographic Failures           | **FINDING-LOW**    | Token/session crypto is sound (HMAC-SHA256, timing-safe compare, CSPRNG). Secret-resolution fallback chain can silently degrade in production without a warning.                                             |
| A03 | Injection                        | **FINDING-MEDIUM** | No SQL injection (parameterized + RPC). Prompt-injection containment is good (user text as quoted data). **Model-generated markdown is rendered to raw HTML via `marked` with no sanitizer.**                |
| A04 | Insecure Design                  | **PASS**           | Entitlement writes are webhook-only; checkout/lifecycle grant nothing to the caller; free-grant race is closed with an atomic conditional UPDATE; gate/paywall coupling is enforced.                         |
| A05 | Security Misconfiguration        | **FINDING-MEDIUM** | Strong header set + tight CORS allowlist + hardened cookies. **CSP ships `script-src 'unsafe-inline'` in production**, which removes the main defense-in-depth against the A03 raw-HTML sink.                |
| A06 | Vulnerable & Outdated Components | **FINDING-HIGH**   | Next.js `16.1.6` carries outstanding **HIGH**-severity advisories; the CI dependency gate is `--audit-level=critical`, so HIGH findings do not fail the build.                                               |
| A07 | Identification & Auth Failures   | **FINDING-MEDIUM** | Magic-link + verify-code have rate limits, Turnstile, brute-force guard, no account enumeration. **Abuse/rate-limit keys derive from the spoofable `x-forwarded-for` header** instead of `cf-connecting-ip`. |
| A08 | Software & Data Integrity        | **PASS**           | Stripe HMAC verification, idempotency store (`stripe_webhook_events`), retry-safe at-least-once semantics, CI bundle-secret scan + contract gates.                                                           |
| A09 | Logging & Monitoring             | **FINDING-LOW**    | IP is hashed in logs; no PII (email/reflection text) logged. Spend/budget alerting is `console.error`-only with no dedicated alert channel (acknowledged as interim).                                        |
| A10 | SSRF                             | **PASS**           | No user-controlled fetch destination. Open-web search posts to a fixed env endpoint; verse/asset paths are built from typed/validated identifiers; executor fetch targets are env/self-origin.               |

**Counts:** HIGH 1 · MEDIUM 4 · LOW 3 · PASS 4 categories clean.

---

## 2. Prioritized findings (highs first)

### 🔴 HIGH

#### H-1 (A06) — Outstanding HIGH-severity framework advisories; CI gate only blocks _critical_

- **Evidence:** installed `next@16.1.6` (`package.json:` `"next": "16.1.6"`; `node_modules/next/package.json` = 16.1.6). `npm audit` reports **2 production vulnerabilities (1 moderate, 1 high)** — the HIGH is the Next.js advisory cluster (Middleware/Proxy bypass, cache poisoning, SSRF via WebSocket upgrades, App-Router XSS variants, image-optimization DoS) plus a moderate `postcss` `<8.5.10` XSS-in-stringify. The CI gate is `npm audit --audit-level=critical` (`.github/workflows/ci.yml:60`), so a HIGH advisory passes CI unnoticed.
- **Failure scenario:** a shipped framework with a published, unpatched HIGH advisory is the exact "known vulnerable component" A06 warns about. The CI gate as configured will never catch a HIGH; the team would ship it silently.
- **Honest exploitability caveat:** many of the specific advisories have **low applicability to this deployment** — no `middleware.ts`/`proxy.ts` (removed; MEMORY note), no i18n router, `images.unoptimized: true` (`next.config.ts:5`), no CSP nonces in use, and Cloudflare sits in front. So real-world blast radius against _this_ app is smaller than the raw "HIGH" label implies. It is rated HIGH here because (a) the advisory itself is HIGH, (b) the brief mandates fixing highs, and (c) the CI gate structurally cannot catch it.
- **Recommended fix:** bump Next.js to the current patched 16.x (audit suggests `16.2.10`) and re-run `npm audit`; **raise the CI gate to `--audit-level=high`** so future HIGH advisories fail the build. Verify `npm run build` + `npm run type-check` + `npm test` after the bump (Next majors/minors can shift App-Router behavior).

---

### 🟠 MEDIUM

#### M-1 (A03 / A05) — Model-generated content rendered as raw HTML with no sanitizer

- **Evidence:** `src/components/daily-bread/DailyBreadView.tsx:57-59` — `renderMarkdown(md) = marked.parse(md, { async: false })`. `marked` **does not sanitize** (its `sanitize` option was removed years ago; raw inline/block HTML passes through). This output is injected via `dangerouslySetInnerHTML` for model-authored fields: `content.prayer` (`:389, :536`), `content.hookA` (`:437`), `content.centerC` (`:460`), `content.christConnectionBPrime` (`:474`), `content.returnAPrime` (`:485`), `content.interactiveElement.content` (`:405`), and more (`:328, :423, :451, :719, :759`). No `DOMPurify`/`sanitize-html` dependency exists (`package.json`).
- **Path of untrusted influence:** the model prompt embeds the user's own struggle text verbatim as quoted data — `src/lib/soul-audit/grounded-weave.ts:681-682` (`PERSON'S STRUGGLE: "${params.struggle}"`) and `:722-723`. A determined user could attempt a prompt injection that coaxes the model to emit `<img src=x onerror=…>` or `<script>` into a body field, which `marked` would pass through and the reader would render.
- **Why it compounds:** production CSP is `script-src 'self' 'unsafe-inline' …` (`next.config.ts:52`) — inline scripts **and inline event handlers execute**, so an injected `onerror`/`<script>` is _not_ blocked.
- **Blast radius (why MEDIUM, not HIGH):** devotional plan content is session-scoped (`devotional_plan_instances.session_token`, `src/lib/session.ts:154-161`); a plan is only rendered to its owning session / merged signed-in user. So the realistic outcome is **self-XSS** (attacker harms only their own browser). It becomes a genuine stored-XSS the moment any feature renders one user's generated content to another user (quote-sharing, plan sharing, admin moderation view).
- **Recommended fix:** run all model/user-influenced markdown through a sanitizer (e.g. `marked` → `DOMPurify.sanitize` allow-list) before `dangerouslySetInnerHTML`; or render as escaped text where formatting isn't required. Pair with M-2 (drop `unsafe-inline`).

#### M-2 (A05) — Production CSP allows `script-src 'unsafe-inline'`

- **Evidence:** `next.config.ts:50-52` — even the non-dev branch keeps `"script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com"`. `style-src 'unsafe-inline'` (`:53`) is also present (lower risk).
- **Failure scenario:** `'unsafe-inline'` in `script-src` defeats CSP's primary purpose — any HTML-injection sink (see M-1) that lands an inline `<script>` or `on*=` handler will execute. The rest of the header set is strong (`frame-ancestors 'none'`, `object-src 'none'`, HSTS preload, `X-Frame-Options: DENY`, `nosniff`), which makes this the weakest link.
- **Recommended fix:** move to a nonce/hash-based `script-src` and remove `'unsafe-inline'`. The one inline script (theme anti-FOUC bootstrap, `src/app/layout.tsx:46-51`) is static and can carry a build-time nonce/hash. Note: adopting CSP nonces interacts with one of the Next.js advisories in H-1 — patch Next first.

#### M-3 (A07 / A04) — Rate-limit and abuse keys derive from the client-spoofable `x-forwarded-for`

- **Evidence:** `src/lib/api-security.ts:189-210` — `getClientKey()` reads `x-forwarded-for` (first token) then `x-real-ip`, hashes it, and returns `ip:<hash>`. It never reads `cf-connecting-ip`. This key backs every rate limiter (magic-link `src/app/api/auth/magic-link/route.ts:37`, verify-code `:64`, chat, soul-audit select, admin reset, billing) **and** the soul-audit daily plan cap's IP fallback (`src/app/api/soul-audit/select/route.ts:715-719`).
- **Failure scenario:** on Cloudflare Workers the trustworthy client IP is `cf-connecting-ip`; `x-forwarded-for` is attacker-appendable (Cloudflare adds the real IP to the chain, but this code takes the **first**, attacker-supplied token). An attacker rotates `X-Forwarded-For` per request to mint a fresh bucket every time, bypassing the per-IP magic-link (8/min), verify-code brute-force guard (10/min), chat (30/min), and the plan-cap IP fallback. Notably the magic-link route _does_ consult `cf-connecting-ip` for Turnstile remoteip (`magic-link/route.ts:81`) but the rate-limit key does not — inconsistent trust.
- **Blast radius note:** where an Upstash store is configured the limiter is cross-region but still keyed on the spoofable value; where it isn't, buckets are per-isolate (`api-security.ts:35-36` doc). The soul-audit **plan cap is also session-cookie-keyed** (harder to rotate) and the **global daily budget cap** (`src/lib/soul-audit/budget-cap.ts`) is a real backstop against unbounded LLM spend — so this is MEDIUM, not HIGH.
- **Recommended fix:** in `getClientKey`, prefer `cf-connecting-ip` (then `true-client-ip`) ahead of `x-forwarded-for`, and/or take the **last** XFF token behind a known proxy hop count.

#### M-4 (A01) — Plan-scoped reader / `deepen` routes authorize by bearer token only; `deepen` has no rate limit

- **Evidence:** `src/app/api/devotional-plan/[token]/day/[n]/route.ts:103-135` — `GET` resolves the plan by `token` (`getPlanInstanceWithFallback`) and returns day content with **no check that the caller's session/user owns that plan**. Same for `deepen`: `src/app/api/devotional-plan/[token]/day/[n]/deepen/route.ts:79-108` (`POST`) and `:49-77` (`GET`) — plan resolved by token, no ownership binding, and **no `takeRateLimit` call** on the POST that triggers a ~2-minute Sonnet Deep Dive generation (`:162-179`).
- **Failure scenario:** the `plan_token` is a random UUID (`randomUUID()`, `select/route.ts:791`), so this is a capability-URL model — security rests entirely on token secrecy. If a token leaks (Referer header, shared link, logs, screenshot), anyone can (a) read that plan's days and (b) fire paid Deep Dive generations for its not-yet-deepened days. Cost abuse is **bounded** by idempotency (`deepen/route.ts:137-140` returns early once deepened), day-locking gates, and the global daily budget cap — but a single leaked token still allows unauthenticated reads and some paid generation.
- **Recommended fix:** bind these routes to the owning session/user (mirror the status route's dual check, below), OR explicitly accept the capability-URL model and (1) add a per-token/per-IP rate limit to `deepen` POST, (2) ensure `plan_token` never appears in Referer/logs. Document the decision either way.

**Contrast — this IS done correctly on the status route** (`src/app/api/soul-audit/select/status/route.ts:76-115`): a job may only be polled by the session that created it (`callerToken === record.session_id`) or the signed-in user that session is linked to (`user_sessions` join), else `404` — a good IDOR-scoping template to copy onto M-4.

---

### 🟡 LOW

#### L-1 (A01 / A02) — Internal-secret comparison is not timing-safe

- **Evidence:** `src/lib/internal-auth.ts:7-11` — `validateInternalSecret` uses `request.headers.get('X-Internal-Secret') === secret` (plain `===`). Gates `billing-reconcile` (`.../billing-reconcile/route.ts:33`) and `run-retention-cleanup` (`.../run-retention-cleanup/route.ts:40`).
- **Failure scenario:** `===` short-circuits on first differing byte, a theoretical timing side-channel for byte-by-byte secret recovery. Low in practice (network jitter dwarfs the signal; secret is long/random), but trivially fixable.
- **Recommended fix:** compare with `crypto.timingSafeEqual` over fixed-length buffers (the token-utils `safeEqualHex` pattern already exists in-repo, `src/lib/soul-audit/token-utils.ts:35-41`).

#### L-2 (A02) — Token-secret fallback can silently degrade in production

- **Evidence:** `src/lib/soul-audit/token-utils.ts:56-82` — `resolveTokenSecret` prefers `SOUL_AUDIT_RUN_TOKEN_SECRET` (≥32 chars), else derives from `SUPABASE_SERVICE_ROLE_KEY` with a namespace salt, else an **ephemeral per-process** secret. The "deriving fallback" and "ephemeral" warnings only fire when `NODE_ENV !== 'production'` (`:64, :74`).
- **Failure scenario:** if `SOUL_AUDIT_RUN_TOKEN_SECRET` is unset in production, level-2 derivation (from the service-role key) works but is **silent** — operators get no signal they're relying on a derived secret. Worse, if the service-role key were also absent, the **level-3 ephemeral** secret differs per isolate, so run/consent tokens minted on one Worker isolate fail verification on another (intermittent, hard-to-debug auth failures) — again with **no production warning**. Not directly exploitable, but a resilience/observability gap on load-bearing signing material.
- **Recommended fix:** emit a loud production warning (or fail closed) when falling below level 1; confirm `SOUL_AUDIT_RUN_TOKEN_SECRET` is set in prod (see Not Assessed).

#### L-3 (A03) — Curated markdown rendered as raw HTML (`inlineMd`)

- **Evidence:** `src/app/today/page.tsx:76-78` — `inlineMd(text) = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')` injected via `dangerouslySetInnerHTML` (`:98, :122, :173, :200, :216`). Content source is the 175 curated devotional JSON files (`public/devotionals/`), which are trusted, checked-in editorial content — not user or model input.
- **Failure scenario:** only realized if untrusted content ever reaches `/today` panels. Today it's curated-only, so risk is latent. The many `JSON.stringify(...jsonLd)` `dangerouslySetInnerHTML` uses (`page.tsx:297-305`, `series/[slug]/page.tsx`, etc.) are SEO JSON-LD from typed objects and are **not** a finding.
- **Recommended fix:** if any dynamic content is ever piped through `inlineMd`, escape first; otherwise document the curated-only invariant.

#### L-4 (A09) — Spend/budget alerting is log-only, no dedicated channel

- **Evidence:** `src/lib/soul-audit/budget-cap.ts:201-232` — threshold alerts (50/80/100%) are `console.error('[spend-alert] …')` + telemetry, explicitly noted as "log-based alerting (§12.6) until a real alert channel exists." De-dup is per-isolate (`alertedThresholds`), so an alert can be missed if isolates cycle.
- **Failure scenario:** a spend spike or an entitlement-bypass abuse run might not page anyone in real time; it depends on someone watching logs. Acceptable for launch if log alerting is wired to Cloudflare log alerts, but there's no in-repo evidence of that binding.
- **Recommended fix:** route `[spend-alert]` / `budget_exceeded` telemetry to a real channel (email/Slack/Cloudflare alert) before or shortly after launch.

---

## 3. Per-category detail (evidence)

### A01 — Broken Access Control → FINDING-MEDIUM

- **Entitlement gate (SA-026):** `src/app/api/soul-audit/select/route.ts:664-708` runs server-side `supabaseServer.auth.getUser()` (not client claims), returns `401 SIGN_IN_REQUIRED` when anonymous and `402 GENERATION_ENTITLEMENT_REQUIRED` when unentitled, **before** any plan/job creation or model spend. `checkGenerationEntitlement` (`src/lib/billing/generation-entitlement.ts:104-154`) **fails closed** on a missing users row (`:112-119`). **PASS.**
- **Free-grant atomicity:** `reserveFreeGeneration` (`generation-entitlement.ts:161-181`) does a conditional `UPDATE … WHERE free_generation_used_at IS NULL` and treats "no row updated" as already-consumed — two concurrent selects cannot both ride one grant. Reservation happens **after** the 429/budget pre-checks (`select/route.ts:772-788`) so a rate-limit never burns the grant, and is **released** on any downstream creation failure (`:818-829, :895-906, :941-945`). **PASS.**
- **IDOR — status route:** properly scoped (`select/status/route.ts:76-115`); non-owners get `404`. **PASS.**
- **Admin — `reset-my-account`:** four ordered gates (env flag → auth → DB `role==='admin'` → typed confirm phrase), no target parameter, `404` (not 403) on every gate miss (`src/app/api/admin/reset-my-account/route.ts:54-109`). **PASS.**
- **Admin — internal-secret routes:** header-secret gated (`billing-reconcile/route.ts:33`, `run-retention-cleanup/route.ts:40`); comparison not timing-safe (**L-1**).
- **Admin — UI allowlist:** `src/app/admin/layout.tsx:12-49` — `force-dynamic`, fails closed on anonymous/empty-allowlist/non-member with `notFound()`. **PASS.**
- **Plan/day + deepen token scoping:** **M-4** (bearer-token-only, no ownership binding; `deepen` un-rate-limited).
- **Annotations:** POST requires auth and keys rows on `user.id` (`src/app/api/annotations/route.ts:40-105`); GET scopes to `user.id ?? anonymous session token` (`:153-154`). No IDOR. Bodies stored via `sanitizeOptionalText` (control-char strip only) but rendered as **escaped React text** (no `dangerouslySetInnerHTML` in `DevotionalStickiesLayer.tsx` / `TextHighlightTrigger.tsx` / `DevotionalLibraryRail.tsx`), so no stored XSS via notes. **PASS.**

### A02 — Cryptographic Failures → FINDING-LOW

- **Session tokens:** `src/lib/session.ts:18-22` — 32 bytes from `crypto.getRandomValues` (CSPRNG), hex-encoded. **PASS.**
- **Run/consent tokens:** HMAC-SHA256 over base64url payload, timing-safe hex compare, session-fingerprint binding, version + max-age checks (`src/lib/soul-audit/run-token.ts:36-111`, `consent-token.ts:35-102`, `token-utils.ts:35-97`). Distinct HMAC salts per namespace prevent cross-token reuse (`token-utils.ts:56-82`). **PASS.**
- **Webhook HMAC:** Stripe `constructEvent` on the raw body (**A08**).
- **Secret resolution fallback:** silent-degrade gap (**L-2**).

### A03 — Injection → FINDING-MEDIUM

- **SQL:** all DB access is via the Supabase JS client's parameterized query builder; the only `.rpc(...)` calls pass named args to Postgres functions, not string-built SQL (`src/lib/soul-audit/cost-ledger.ts:167`, `rate-limit.ts:102`). No string-concatenated SQL found. **PASS.**
- **Prompt injection:** user struggle text is embedded as **quoted data** with explicit closed-grounding rules ("Use ONLY the materials above — invent nothing") — `src/lib/soul-audit/grounded-weave.ts:637-648` (system) and `:681-712` / `:722-747` (user). User text is never concatenated as instructions; delimiters are `@@@SECTION@@@`. Containment is reasonable (**do not modify these files** per brief). Residual: user text is interpolated without delimiter-escaping — standard for LLM prompts, mitigated by grounding. **PASS** (with the rendering caveat below).
- **Output rendering (XSS):** **M-1** (`marked` raw-HTML sink) and **L-3** (`inlineMd`).

### A04 — Insecure Design → PASS

- **Webhook-only entitlement writes:** premium/tier writes live only in `src/lib/billing/webhook-handlers.ts` (`:174, :233-254, :375, :424-430`), dispatched from the signature-verified webhook (`src/app/api/billing/webhook/route.ts:209-283`).
- **No client-redirect grant:** `checkout` requires auth and writes only `stripe_customer_id` to the caller's own row (`src/app/api/billing/checkout/route.ts:172-211`) — no entitlement grant. `lifecycle` GET is a Stripe read; its one write (founding-member claim) is idempotent and matched by the **Stripe buyer email**, not the caller (`src/app/api/billing/lifecycle/route.ts:138-169`) — cannot self-grant. `entitlements` GET is read-only (`:42-71`).
- **Free-grant race:** atomic conditional UPDATE (see A01).
- **Gate/paywall coupling:** `generationGateLive()` gates on `GENERATION_GATE_LIVE==='true'` and is documented to ship with `BILLING_CHECKOUT_LIVE` so gating never lands without a way to pay (`generation-entitlement.ts:17-25, 44-46`; `select/route.ts:666-671`).

### A05 — Security Misconfiguration → FINDING-MEDIUM

- **Headers:** strong baseline — CSP with `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `upgrade-insecure-requests`; HSTS `max-age=31536000; includeSubDomains; preload`; `X-Content-Type-Options: nosniff`; `X-Frame-Options: DENY`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` locking camera/mic/geo (`next.config.ts:43-80`). Weak link: `script-src 'unsafe-inline'` (**M-2**).
- **CORS:** status route uses a strict allowlist echo (`select/status/route.ts:16-31`) — only `localhost:3333/3000` + `https://euangelion.app`; unknown origins fall back to the first allowed origin (not `*`). Methods limited to `GET, OPTIONS`. **PASS.**
- **Cookies:** app session cookie is `httpOnly`, `secure` in production, `SameSite=Lax`, `path=/`, 30-day TTL (`src/lib/session.ts:39-51`). Supabase SSR cookies use the library's defaults via the server client adapter (`src/lib/supabase/server.ts:12-27`) — flags not overridden in-repo (see Not Assessed). Day-locking cookie is a non-sensitive `SameSite=Lax` preference (`src/lib/day-locking.ts:31-33`). **PASS.**
- **Admin client** never persists sessions / auto-refreshes (`src/lib/supabase/admin.ts:13-16`). **PASS.**

### A06 — Vulnerable & Outdated Components → FINDING-HIGH

- **H-1** above. Raw evidence: `npm audit --omit=dev` → "2 vulnerabilities (1 moderate, 1 high)"; the HIGH is the Next.js advisory cluster, moderate is `postcss <8.5.10`. CI gate `--audit-level=critical` (`.github/workflows/ci.yml:60`).

### A07 — Identification & Auth Failures → FINDING-MEDIUM

- **Magic-link:** rate-limited 8/min (`src/app/api/auth/magic-link/route.ts:34-49`), email-format validated, Turnstile enforced when `TURNSTILE_SECRET_KEY` is set (fail-closed, `:75-91`; `src/lib/auth/turnstile.ts:26-61`). Redirect target passed through `sanitizeSafeRedirectPath` open-redirect guard (`magic-link/route.ts:93-95`; `api-security.ts:405-413`). **PASS** except the key-derivation issue (**M-3**).
- **Account enumeration:** magic-link returns `{ success: true }` regardless of registration (`:98`), and Supabase `signInWithOtp` doesn't distinguish existing vs new; verify-code returns one generic message for wrong/expired/used (`verify-code/route.ts:116-135`). **No enumeration. PASS.**
- **Verify-code brute force:** 10/min per client key (`verify-code/route.ts:42-76`), 6-digit format enforced, plus Supabase's own token invalidation/429 pass-through. **PASS** except **M-3**.
- **Session fixation/rotation:** sign-in mints Supabase session cookies via `verifyOtp`; `onAuthSuccess` links the anonymous app-session to the user and migrates session-keyed data (`src/lib/auth.ts:44-49`, `src/lib/session.ts:238-264`). The anonymous app-session token is **not rotated** on privilege change — it is intentionally linked/carried so data follows the user; the sensitive auth boundary is the separate Supabase cookie set fresh by `verifyOtp`. **PASS** (design is deliberate; note for awareness).
- **Turnstile:** conditional on secret presence — off ⇒ prior behavior, on ⇒ hard-required (`turnstile.ts:17-61`). Live enablement not verifiable statically (Not Assessed).

### A08 — Software & Data Integrity → PASS

- **Webhook signature:** `stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)` on the raw body with `runtime='nodejs'` (`src/app/api/billing/webhook/route.ts:61, 147-190`); missing/invalid signature ⇒ 400.
- **Idempotency:** `stripe_webhook_events` checked before dispatch and recorded **after** successful dispatch, so a thrown handler returns 500 and Stripe retries without a false duplicate-skip (`:74-104, 192-201, 307-309`). Handlers documented idempotent; store failures fail open safely (`:74-86`).
- **CI integrity gates:** contract/tracking/PRD/governance/appstore verifies + `verify:bundle-secrets` + build + tests (`.github/workflows/ci.yml:22-63`). Bundle-secret scanner blocks server secret names/value shapes in client chunks (`scripts/check-bundle-secrets.mjs:22-97`).

### A09 — Logging & Monitoring → FINDING-LOW

- **PII redaction:** logs key on hashed IP (`getClientKey` → `ip:<sha256-slice>`, `api-security.ts:204-209`); `logApiError` logs requestId/method/path/clientKey + serialized error, **not** request bodies (`:477-494`). Chat logs provider/quota/`ip_hash` only — **no message content** (`src/app/api/chat/route.ts:841-853`). No `console.*` of `email`/`response_text`/`reflection`/`user_input` found in a targeted grep. **PASS** on PII.
- **Webhook signature-failure logging:** invalid signatures are logged with `reason:'invalid-signature'` (`webhook/route.ts:176-190`). **PASS.**
- **Spend alerts:** log-only (**L-4**).

### A10 — SSRF → PASS

- **Open-web search:** posts the query to a **fixed** `OPEN_WEB_SEARCH_API_URL` env endpoint, never a user URL; requires flag + configured endpoint + per-query acknowledgement (`src/lib/brain/router.ts:1035-1087`; gated in `src/app/api/chat/route.ts:631-669`). Returned result URLs are shown as citations, not server-fetched.
- **Verse/asset fetch:** `getVerse` builds `bibles/{translation}/{book}.json` from a typed translation + `BibleBookId` (`src/lib/bible/getVerse.ts:45-88`); an unknown book/reference fails parsing rather than pathing to an arbitrary URL. Localhost bases are rewritten to the prod origin (`src/lib/today-devotional.ts`).
- **Executor fetch:** `select/status` and `deepen` fetch either `SOUL_AUDIT_GENERATOR_URL` (env) or the **request's own origin** `/api/soul-audit/generate-day` (`select/status/route.ts:186-200`; `deepen/route.ts:95-179`) — no user-controlled destination.
- **Image/illustration:** `nanobanana` posts to its fixed API URL (`src/lib/illustrations/nanobanana.ts:44`).

---

## 4. Not assessed (cannot verify statically)

These require live infrastructure, deployed config, or production secret state — **out of scope for a source-only audit** and must be confirmed separately before the launch sign-off:

1. **Supabase RLS policies as deployed.** The app relies heavily on the **service-role admin client** (`createAdminClient`, which bypasses RLS) for reads/writes across `user_sessions`, `devotional_plan_instances`, `soul_audit_jobs`, `annotations`, `users`, etc. Route-level scoping is the effective access control in those paths. Whether RLS is additionally enabled/correct on these tables for any anon/`authenticated`-key access path was **not** verified. **Confirm RLS is ON and correct for every table reachable by the anon key.**
2. **Production secret presence/strength.** Cannot confirm whether `SOUL_AUDIT_RUN_TOKEN_SECRET`, `INTERNAL_ROUTE_SECRET`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`, `ADMIN_EMAIL_ALLOWLIST` are set (and strong) in the Worker environment. L-2 and Turnstile enforcement depend on this.
3. **Feature-flag state in production:** `GENERATION_GATE_LIVE`, `BILLING_CHECKOUT_LIVE`, `DAY_LOCKING_DEFAULT`, `brainRouterEnabled`, `openWebModeEnabled`. The entitlement gate and paywall are inert unless the flags are on.
4. **Rate-limit backing store:** whether Upstash Redis is configured (`UPSTASH_REDIS_REST_URL/TOKEN`). Without it, limiters are per-isolate in-memory (`api-security.ts:35-36`, `91-137`) and far weaker across Cloudflare's many isolates — this materially amplifies **M-3**.
5. **Cloudflare edge:** WAF rules, bot-management, DDoS, and whether `cf-connecting-ip` is trustworthy end-to-end (relevant to **M-3**).
6. **DB role grants:** whether `public.users.role='admin'` is set for exactly the intended accounts (backs `reset-my-account` gate 3).
7. **Supabase SSR cookie flags as emitted** (Secure/SameSite/HttpOnly) at runtime — only the library defaults are visible in source (`supabase/server.ts`).
8. **Stripe dashboard webhook config:** endpoint URL, subscribed events, and that the signing secret in the env matches the endpoint.
9. **Dynamic/runtime exploitability** of M-1 (whether a prompt injection can actually force attacker HTML through the grounded weave) — marked **PLAUSIBLE**; confirming requires a live generation attempt against the deployed model + prompt.

---

## 5. Recommended remediation order

1. **H-1** — bump Next.js to patched 16.x; raise CI gate to `--audit-level=high`. _(brief §12.6 "fix all highs")_
2. **M-1 + M-2** — sanitize model markdown (DOMPurify) **and** drop `script-src 'unsafe-inline'`; these two together close the XSS exposure.
3. **M-3** — key rate limits on `cf-connecting-ip`; confirm Upstash is configured in prod (Not Assessed #4).
4. **M-4** — bind plan/day/`deepen` routes to session ownership (copy the status-route pattern) and rate-limit `deepen`.
5. **L-1, L-2, L-3, L-4** — timing-safe internal-secret compare; loud prod warning on secret fallback; document/escape `inlineMd`; wire a real spend-alert channel.
6. Work the **Not Assessed** list with someone who has production/Supabase/Cloudflare access before final launch sign-off.

---

## Remediation log (2026-07-11, same day)

Applied immediately after the audit (brief §12.6 mandates fixing all
highs pre-launch; §12.3/§12.4 mandate the sanitization and header
fixes):

| Finding       | Action                                                                                                                                                                                                                                                                        | Status                                                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| H-1 (A06)     | `next` 16.1.6 → 16.2.10; CI audit gate raised `--audit-level=critical` → `high`; `npm audit --audit-level=high` now exits 0; full suite + production build re-verified on the new version                                                                                     | **FIXED**                                                                                                                 |
| M-1 (A03/A05) | New `src/lib/markdown-safe.ts` — marked renderer with raw-HTML tokens escaped (block + inline); `DailyBreadView` now renders ALL model-authored fields through it (§12.3 "markdown renderer with HTML disabled"); 5 regression tests incl. script/img/event-handler smuggling | **FIXED**                                                                                                                 |
| M-2 (A05)     | CSP `script-src 'unsafe-inline'` remains — removing it requires nonce plumbing via a new `proxy.ts` (structural change; CLAUDE.md forbids `middleware.ts`, and the repo deliberately has no proxy today). Defense-in-depth restored by M-1's sanitization.                    | **FOUNDER DECISION** — approve adding `proxy.ts` for CSP nonces, or accept with M-1 mitigation                            |
| M-3 (A07/A04) | `getClientKey` now prefers Cloudflare's unspoofable `cf-connecting-ip`; `x-forwarded-for` demoted to a dev/non-CF fallback                                                                                                                                                    | **FIXED**                                                                                                                 |
| M-4 (A01)     | Deepen POST (the ~2-min Sonnet spend trigger): per-client rate limit (5/min) + ownership scoping (owning session or its signed-in user; others 404 — same policy as select/status). Day-read GET + deepen readiness GET remain bearer-token-only                              | **PARTIALLY FIXED** — read-scoping is a product decision (plan-sharing semantics, brief §5 `share_slug`); founder to rule |
| L-1 (A01)     | `validateInternalSecret` now constant-time (portable XOR compare, Workers-safe)                                                                                                                                                                                               | **FIXED**                                                                                                                 |
| L-2 (A02)     | Token-secret fallback now logs `console.error` in EVERY environment incl. production                                                                                                                                                                                          | **FIXED**                                                                                                                 |
| L-3 (A03)     | Curated-only `inlineMd` raw path — curated content is human-reviewed and committed; unchanged by design                                                                                                                                                                       | ACCEPTED                                                                                                                  |
| L-4 (A09)     | Spend alerts remain log-based until an alerting channel exists (documented in F-077)                                                                                                                                                                                          | ACCEPTED (tracked)                                                                                                        |
