# Stripe Alignment Audit — 2026-05-05

**Status:** Read-only audit, no code changes
**Source of truth:** Master plan Section 0.2 (founder-locked 2026-05-03)

- Section 0.13 Gap closure 6 ("Stripe billing depth audit")
  **Audience:** founder, with the Stripe dashboard open beside this doc
  **Author:** Claude Opus 4.7 (autonomous overnight, 2026-05-05)
  **Companion:** `docs/copy-specs/pricing-page-spec.md`

This is a delta audit between (a) what the code in
`src/lib/billing/catalog.ts` defines today and (b) what Section 0.2
demands. Use this as a pre-written checklist when you sit down with
the Stripe dashboard.

---

## Code state (today)

`src/lib/billing/catalog.ts` defines exactly **2 plans**:

| Plan id           | Name            | Price label in code | Stripe env var                 | iOS product id                   |
| ----------------- | --------------- | ------------------- | ------------------------------ | -------------------------------- |
| `premium_monthly` | Premium Monthly | **$4.99 / month**   | `STRIPE_PRICE_PREMIUM_MONTHLY` | `app.euangelion.premium.monthly` |
| `premium_annual`  | Premium Annual  | **$39.99 / year**   | `STRIPE_PRICE_PREMIUM_ANNUAL`  | `app.euangelion.premium.annual`  |

Type definitions in `src/types/billing.ts`:

```ts
export type BillingPlanId = 'premium_monthly' | 'premium_annual'

export interface BillingEntitlementsResponse {
  ok: boolean
  requestId: string
  authenticated: boolean
  entitlements: {
    subscriptionTier: 'free' | 'premium' | 'lifetime'  // ← 'lifetime' is in the type
    premiumActive: boolean
    ...
  }
}
```

Routes wired (all under `src/app/api/billing/`):

- `checkout/route.ts` — creates a Stripe Checkout Session, gates on
  `STRIPE_SECRET_KEY` + `BillingPlanId`
- `config/route.ts` — returns `BILLING_PLANS` array + payment-method
  availability flags (`iosIap`, `webStripe`)
- `entitlements/route.ts` — returns the user's current
  `BillingEntitlementsResponse`
- `lifecycle/route.ts` — Stripe webhook handler (subscription created,
  invoice paid, etc.)
- `portal/route.ts` — creates a Stripe Customer Portal Session

Env vars referenced:

- `STRIPE_SECRET_KEY` — server-side Stripe API key
- `STRIPE_PRICE_PREMIUM_MONTHLY` — Stripe Price ID for the monthly plan
- `STRIPE_PRICE_PREMIUM_ANNUAL` — Stripe Price ID for the annual plan
- `STRIPE_WEBHOOK_SECRET` — referenced by lifecycle route (not audited
  in detail here)
- `NEXT_PUBLIC_REVENUECAT_IOS_API_KEY` — iOS IAP via RevenueCat (per
  master plan Section 0.13 Gap closure 5, **iOS deferred to v1.5+** —
  this binding is dormant)

## Section 0.2 locked pricing (recap)

| Item                  | Locked                                                                                |
| --------------------- | ------------------------------------------------------------------------------------- |
| Free tier             | 3 curated matches + AI rationales, unlimited curated reading, 1 GENERATE plan/quarter |
| Paid monthly          | **$7 / month**                                                                        |
| Paid annual           | **$77 / year**                                                                        |
| 2-year prepay         | $140 (range; founder to confirm)                                                      |
| 3-year prepay         | $200 (range)                                                                          |
| Founding Member badge | First 500 paid annual subscribers — status only, NOT a separate price tier            |
| Donation tier         | One-time $25 / $100 / $250 / $500                                                     |
| Lifetime tier         | **REJECTED**                                                                          |
| BYO API key           | **REJECTED as a tier**                                                                |

## Delta — code vs. Section 0.2

### 1. Monthly price wrong: $4.99 → **$7.00**

Increase of $2.01 (≈ 40%). Change required in **2 places**:

- **Stripe dashboard** — edit the existing Price for the monthly
  Product, OR create a new Price at $7/mo and update the env var
  `STRIPE_PRICE_PREMIUM_MONTHLY` to point at the new Price ID.
  Prefer the second approach (Stripe best practice: never edit a
  Price in-place; deactivate the old one and create a new one so
  historical subscriptions keep their original price).
- **Code** — `src/lib/billing/catalog.ts:7` `priceLabel: '$4.99 / month'`
  → `'$7 / month'`.

### 2. Annual price wrong: $39.99 → **$77.00**

Increase of $37.01 (≈ 92%). Same two-place change:

- **Stripe dashboard** — new Price at $77/yr, update
  `STRIPE_PRICE_PREMIUM_ANNUAL`.
- **Code** — `src/lib/billing/catalog.ts:15` `priceLabel: '$39.99 / year'`
  → `'$77 / year'`.

### 3. Missing: 2-year prepay tier ($140)

Need to add **all of**:

- New env var `STRIPE_PRICE_PREMIUM_2YEAR` (or similar)
- New entry in `BILLING_PLANS` array with `id: 'premium_2year'`
- Extend `BillingPlanId` type union to include `'premium_2year'`
- Extend `stripePriceIdEnv` union in `BillingPlan` interface
- Extend `iosProductId` field — or set to `null` since iOS deferred
- Stripe Product + Price (one-time payment representing 2 years of access)

**Founder confirms exact figure first.** $140 was tagged "range" in
Section 0.2 — confirm before creating the Stripe Price.

### 4. Missing: 3-year prepay tier ($200)

Same shape as 2-year. Same "founder confirms exact figure first"
caveat.

### 5. Missing: Donation tier

This is **fundamentally different** from subscription tiers — one-time
payment, no recurring billing, no entitlement change (donations don't
unlock anything per the spec, just support the work).

- **Stripe dashboard** — 4 separate one-time Products + Prices:
  - "Donation $25", price `$25`
  - "Donation $100", price `$100`
  - "Donation $250", price `$250`
  - "Donation $500", price `$500`
    Or one Product with 4 Prices, depending on how you want them to
    appear in Stripe reports.
- **Code** — needs separate route or a `donationAmount` query param on
  `checkout/route.ts`. Donation does NOT touch
  `BillingEntitlementsResponse` (no entitlement gained).
- **Suggested env vars**:
  - `STRIPE_PRICE_DONATION_25`
  - `STRIPE_PRICE_DONATION_100`
  - `STRIPE_PRICE_DONATION_250`
  - `STRIPE_PRICE_DONATION_500`

The pricing-page-spec already shows the UX for this.

### 6. Founding Member tier — DO NOT add as a plan

Founding Member is a **status applied to the first 500 paid annual
subscribers**, not a separate Stripe product. Specifically:

- Same Stripe Product/Price as regular `premium_annual`
- Derived state: query Stripe for active annual subscriptions, count
  them, the first 500 get the badge
- Surfaces as `entitlements.foundingMember: boolean` on the
  `BillingEntitlementsResponse`, not a new `subscriptionTier`

**Implementation note:** the "first 500" cutoff requires either (a) a
new column on a user/subscriptions table to mark each one
deterministically when they subscribe, OR (b) a derived count cached
for 5 minutes against Stripe. (a) is more robust against Stripe data
loss; (b) is simpler. Founder picks.

### 7. Remove `lifetime` from `BillingEntitlementsResponse.subscriptionTier`

Section 0.2 explicitly rejected lifetime. The type still allows it:

```ts
subscriptionTier: 'free' | 'premium' | 'lifetime'
```

Should become:

```ts
subscriptionTier: 'free' | 'premium'
```

Search the codebase for `'lifetime'` references before changing the
type — anything that compares against this literal needs updating.

### 8. iOS productId fields — deferred but should be tagged

Both plans have `iosProductId: 'app.euangelion.premium.monthly|annual'`.
Per master plan Section 0.13 Gap closure 5, iOS is **explicitly
deferred to v1.5+**. The fields aren't actively wired into anything
that ships today (RevenueCat key isn't set), so they're inert
artifacts.

**Recommendation:** leave the fields in (they're harmless and
forward-compatible) but add a comment in `catalog.ts`:

```ts
// iOS product IDs are v1.5+ scaffolding per master plan Section
// 0.13 Gap closure 5. Not wired in v1; left in place for the future
// Capacitor shell.
```

## Pre-launch checklist (in order)

1. **Founder confirms 2-year and 3-year exact prices** ($140 / $200
   were "range")
2. **Founder decides Founding Member counter strategy** (new column
   vs cached Stripe query)
3. **Stripe dashboard work**:
   - [ ] Deactivate or archive existing $4.99 monthly Price
   - [ ] Create new $7 monthly Price; copy Price ID
   - [ ] Deactivate or archive existing $39.99 annual Price
   - [ ] Create new $77 annual Price; copy Price ID
   - [ ] Create $140 2-year Price (one-time payment, recurring not
         applicable); copy Price ID
   - [ ] Create $200 3-year Price; copy Price ID
   - [ ] Create 4 donation Prices ($25, $100, $250, $500); copy IDs
4. **Update env vars** (Cloudflare Workers Secrets via `wrangler
secret put` — these aren't in `.env.local` because they vary by
   environment):
   - [ ] `STRIPE_PRICE_PREMIUM_MONTHLY` → new $7 Price ID
   - [ ] `STRIPE_PRICE_PREMIUM_ANNUAL` → new $77 Price ID
   - [ ] `STRIPE_PRICE_PREMIUM_2YEAR` → $140 Price ID (new)
   - [ ] `STRIPE_PRICE_PREMIUM_3YEAR` → $200 Price ID (new)
   - [ ] `STRIPE_PRICE_DONATION_25` → $25 Price ID (new)
   - [ ] `STRIPE_PRICE_DONATION_100` → $100 Price ID (new)
   - [ ] `STRIPE_PRICE_DONATION_250` → $250 Price ID (new)
   - [ ] `STRIPE_PRICE_DONATION_500` → $500 Price ID (new)
5. **Code changes** (separate PR after Stripe is settled):
   - [ ] `src/types/billing.ts` — extend `BillingPlanId` union; remove
         `'lifetime'` from `subscriptionTier`; extend `stripePriceIdEnv`
         union
   - [ ] `src/lib/billing/catalog.ts` — update price labels, add
         `premium_2year` + `premium_3year` entries, add iOS-deferred
         comment
   - [ ] New module `src/lib/billing/donations.ts` — donation
         checkout helper
   - [ ] New route `src/app/api/billing/checkout/donation/route.ts` (or
         extend existing `checkout/route.ts` with a `donationAmount`
         branch)
   - [ ] Add `foundingMember: boolean` to
         `BillingEntitlementsResponse.entitlements`; compute in
         `entitlements/route.ts` per the chosen counter strategy
   - [ ] Audit any `'lifetime'` references in code; either remove or
         reroute to `'premium'`

## Webhook lifecycle audit (deferred to a separate pass)

`src/app/api/billing/lifecycle/route.ts` exists. Section 0.13 Gap
closure 6 calls for verifying it handles:

- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.paid
- invoice.payment_failed

Did **NOT** audit the lifecycle route in detail tonight — that's a
separate focused pass needing the Stripe dashboard's webhook event
log open beside the code. Captured here as the next-after-pricing
audit task.

## What I did not change

This audit is **read-only**. No code edits, no commits to
`catalog.ts`, no env-var changes. Founder takes this checklist to
the Stripe dashboard.

The pricing-page-spec at `docs/copy-specs/pricing-page-spec.md`
captures the UX side; this audit captures the Stripe-side. Together
they fully scope a `/pricing` launch when the founder is ready.
