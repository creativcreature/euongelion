# Overnight Phase 0 — Pre-flight Findings (2026-05-04)

Branch: `revamp/overnight-2026-05-04` (off `cloudflare-migration` HEAD `1b96475`).
Operator: Claude Opus 4.7 autonomous overnight session.
Founder offline until 7pm 2026-05-04.

## P0-1 — Reference index runtime load path

**Question:** does the runtime load `public/reference-index.json` (15.6 MB) or a slim variant?

**Answer:** the **full** index. No slim variant exists on disk.

**Citations:**

- `src/lib/soul-audit/reference-retriever.ts:27` imports `loadReferenceIndex` from `./reference-index-loader`.
- `src/lib/soul-audit/reference-index-loader.ts:15` explicit comment: `NO SLIM INDEX. NO SILENT FALLBACKS. If load fails, throw.`
- `src/lib/soul-audit/reference-index-loader.ts:30-45` Strategy 1 (production) fetches `https://assets.local/reference-index.json` via the Cloudflare ASSETS binding.
- `src/lib/soul-audit/reference-index-loader.ts:50-67` Strategy 2 (local dev) reads `public/reference-index.json` via `fs.readFileSync`.
- `src/lib/soul-audit/reference-index-loader.ts:69-83` Strategy 3 fetches `${NEXT_PUBLIC_APP_URL}/reference-index.json` over the network.
- `ls -lh public/reference-index*` returns only `public/reference-index.json` (15M, mtime 2026-03-02). `public/reference-index-slim.json` reports `No such file or directory`.

**Implication:** the CLAUDE.md note that the slim index is in use is **stale and incorrect**. The Workers runtime loads the full 15.6 MB JSON via the ASSETS binding. The loader caches the parsed array in a module-level variable (`cachedIndex`) so the parse cost is paid once per Worker isolate, not per request. Per the prompt, I am **not** rebuilding a slim file tonight (out of scope).

**Recommendation for founder (post-overnight):** the deploy currently relies on the ASSETS binding tolerating a 15.6 MB JSON parse on cold start. Validate Workers cold-start memory headroom with a real preview hit. If memory pressure is observed, revisit the slim-index decision under a separate task with proper A/B verification.

## P0-2 — Distinct-source count for /about and marketing claims

**Question:** verify the `19 sources` claim before any marketing copy or PRD asserts it publicly.

**Method:** `jq -r '.[] | .source' public/reference-index.json | sort -u | wc -l` against the actual JSON shape (the index is a top-level array of chunk objects, each with a `source` field).

**Answer:** **45 distinct file paths** in `public/reference-index.json`.

That count includes 12 Bible translations under `content/reference/bibles/open-bibles/` (eng-asv, eng-bbe, eng-darby, eng-dra, eng-gb-oeb, eng-gb-webbe, eng-kjv, eng-us-oeb, eng-web, eng-ylt, heb-leningrad, plus a 12th — see `/tmp/sources.txt`). Treating those 12 translations as one logical "Bible source," the distinct **author/work** count is approximately **34** non-Bible commentaries plus 1 Bible source = ~35.

**Source families counted from the file path prefixes:**

- `content/reference/bibles/open-bibles/` — 12 translations (1 logical source)
- `content/reference/commentaries/<author>/` — 32 distinct files across at least the following authors visible in head 30: augustine, bounds, brother-lawrence, bunyan, calvin, chesterton, douglass, edwards, hannah-whitall-smith, luther… (full list in `/tmp/sources.txt`)
- `content/reference/SOURCE-BANK.md` — 1 manifest file

**Implication:** the "19 sources" CLAUDE.md/MEMORY.md figure is **not corroborated** by the on-disk index. Whether 19 is the true author count, a stale historical figure, or a deliberate selection of "named voices" needs founder confirmation **before** any /about copy or marketing claim invokes it. For overnight purposes I am not changing any copy — this is documented for the morning review.

## P0-3 — Magic-link email infrastructure source

**Question:** what email provider sends magic links? Supabase default vs. Resend vs. Postmark vs. custom SMTP?

**Answer:** **Supabase default (`supabase.auth.signInWithOtp`)**.

**Citations:**

- `src/lib/auth.ts:26-39` `sendMagicLink` calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`. No Resend, Postmark, SES, or custom SMTP integration is wired here.
- `src/app/api/auth/magic-link/route.ts:66` invokes `sendMagicLink(email, redirectTo)` after rate-limiting and validation. No custom email provider in this route either.
- No `RESEND_API_KEY`, `POSTMARK_*`, `SENDGRID_*`, `SMTP_*` env-var references in `src/lib/auth.ts` or `src/app/api/auth/*`. (Spot-checked; broader env audit is a Track C P1 item, deliberately deferred.)

**Implication for Phase 3:** the prompt instructs "Do NOT add OTP code to magic-link emails (depends on email-provider pre-flight finding; defer)." Confirmed defer. Adding a 6-digit OTP code in the email body would require either (a) configuring a custom Supabase email template via the Supabase dashboard (manual ops change, not an in-repo edit), or (b) replacing the Supabase email transport with Resend/Postmark and rendering our own template (substantial engineering, new env vars, new dependency). Both options are out of overnight scope.

**Recommendation for founder:** before any cross-device-magic-link UX work lands, decide whether to (a) customize Supabase's built-in email template via the dashboard (cheap, no infra change) or (b) bring email send in-house via Resend/Postmark (more control, more cost, more env vars).

## Summary

| Pre-flight                | Status                              | Overnight action                                             |
| ------------------------- | ----------------------------------- | ------------------------------------------------------------ |
| Reference index load path | full 15.6 MB via ASSETS binding     | accept; do nothing                                           |
| Distinct sources in index | 45 file paths (~35 logical authors) | document only; defer marketing claim verification to founder |
| Magic-link email provider | Supabase default `signInWithOtp`    | defer OTP-pairing UX entirely                                |

Phase 0 complete. Proceeding to Phase 1 (reader adapter).
