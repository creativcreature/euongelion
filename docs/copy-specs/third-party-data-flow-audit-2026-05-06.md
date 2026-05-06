# Third-Party Data Flow Audit — 2026-05-06

**Status:** Read-only audit
**Source-of-truth:** Master plan Section 3.9 (privacy + safety
prescription) + Section 0.13 Gap closure 7 (analytics decision)
**Audience:** founder + future security review
**Author:** Claude Opus 4.7 (autonomous overnight, 2026-05-06)

This audit answers: **which third-party services receive Soul Audit
reflection text or other user payloads?** The bar is BetterHelp's
$7.8M FTC fine — reflection text must NEVER reach analytics
trackers, ad networks, or any third party that isn't strictly
necessary to deliver the product.

---

## Top-line finding: clean

**No third-party analytics, tracking, ad-network, or
session-replay dependencies are installed.** `package.json`
declares zero such packages. `grep -r` for `Sentry`, `posthog`,
`plausible`, `datadog`, `amplitude`, `mixpanel`, `segment.io`,
`pendo`, `hotjar`, `clarity.ms`, `rollbar`, `honeybadger`,
`bugsnag` returns zero hits in `src/`.

`src/components/ConsentAwareAnalytics.tsx` is a placeholder that
renders `null` (the original `@vercel/analytics/next` was removed
during the Cloudflare migration and never replaced).

## Outbound third-party calls from server code

These are the ONLY external services the server contacts:

| Service             | What we send                                     | Receives reflection text?                | Privacy posture                                                                                                     |
| ------------------- | ------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Anthropic (Claude)  | system prompt, reference chunks, user reflection | **YES**                                  | Set up under zero-data-retention contract per master plan Track B (verify ZDR is enabled on the production API key) |
| OpenAI (GPT-5-nano) | same as Anthropic when fallback fires            | **YES** (only when Anthropic fails)      | OpenAI Enterprise / Zero Retention required (verify)                                                                |
| Google Gemini       | same as Anthropic when fallback fires            | **YES** (only when Anthropic fails)      | Verify Gemini API privacy mode                                                                                      |
| MiniMax             | same                                             | **YES** (BYO key only — user-controlled) | User accepts via BYOK consent                                                                                       |
| NVIDIA Kimi         | same                                             | **YES** (BYO key only)                   | User accepts via BYOK consent                                                                                       |
| Supabase            | all user data                                    | **YES** (this IS our database)           | Service-role access only, RLS gating                                                                                |
| Stripe              | email + plan id only                             | **NO**                                   | PCI-compliant by definition                                                                                         |

**No other outbound calls exist.** No image hosting CDNs (we serve
artwork from `public/images/devotional-prints/` directly via
Cloudflare Workers). No font CDN (fonts are local in `public/fonts/`
or `public/styles/fonts.css`). No script tags pointing at
third-party domains.

## CSP audit — what does the browser allow?

Cross-checked with the Content-Security-Policy header from a live
preview hit (captured during the Phase 10.6 OG image verification):

```
default-src 'self';
base-uri 'self';
frame-ancestors 'none';
object-src 'none';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self' https://*.supabase.co https://api.anthropic.com
            https://generativelanguage.googleapis.com
            https://api.minimax.chat
            https://integrate.api.nvidia.com
            https://api.stripe.com;
frame-src 'self' https://challenges.cloudflare.com
          https://js.stripe.com https://hooks.stripe.com;
form-action 'self' https://checkout.stripe.com;
```

**Notes:**

- `connect-src` is tight — only Supabase, the LLM providers we
  actually call, and Stripe. No analytics or telemetry endpoints.
- `script-src` allows `'unsafe-inline'` and `'unsafe-eval'` (Next.js
  needs these for hydration). Not ideal but standard. Consider
  Strict-CSP with nonces in a future hardening pass.
- `img-src https:` is permissive — any HTTPS image source. Tighten
  to `'self'` once we audit any inline `<img>` tags pointing at
  external URLs (likely none, but worth confirming).
- `frame-src` allows the Stripe Checkout iframe + Cloudflare Turnstile
  challenge widget. Both required.

## Action items for the security review

### Verify Anthropic ZDR

Per master plan Track B P1: "Verify Anthropic zero-data-retention
setting." This requires confirming with Anthropic support that the
production `ANTHROPIC_API_KEY` is on a ZDR contract. **Until
verified, treat reflection text as recoverable from Anthropic for
30 days** per their default retention.

Open a support ticket: "Confirm zero-data-retention status on API
key ending in <...>." Save the confirmation email in a `legal/`
folder.

### Decide on a privacy-respecting analytics tool

Master plan Section 0.13 Gap closure 7 listed four options:

1. **Plausible** ($9/month, EU-hosted, no cookies, no PII)
2. **Vercel Analytics** ($10/month — awkward fit since we're on
   Workers)
3. **PostHog** (self-hostable, more capable, more complex)
4. **Cloudflare Analytics Engine** (already declared in
   `wrangler.jsonc:14`, near-zero cost)

**Recommendation:** Cloudflare Analytics Engine for system metrics
(request volume, error rate, latency by route) + Plausible for
product metrics (page views, conversion funnel). Critical: any tool
must respect the constraint that **reflection text never reaches it**.

This is on the morning decision deck.

### CSP hardening (post-launch)

- Move from `'unsafe-inline' 'unsafe-eval'` to nonced strict-CSP
- Tighten `img-src https:` to a specific allowlist
- Add `connect-src` for the chosen analytics tool only AFTER
  decision

These are separate workstreams; not blocking.

## What I did NOT change

- No code changes. Pure audit.
- No environment variable changes.
- No CSP changes.

The audit confirms the codebase is in a **strong defensive
posture today** (no analytics deps installed, tight CSP), but
the Anthropic ZDR verification is the open security item the
founder needs to close before treating reflection text as
strictly never-retained-by-third-parties.
