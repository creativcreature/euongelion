# /pricing page — Copy + Information Architecture Spec

**Status:** Draft, not built
**Source of truth:** Master plan Section 0.2 (founder-locked 2026-05-03)
**Audience for this doc:** founder + frontend engineer when ready to ship `/pricing`
**Author:** Claude Opus 4.7 (autonomous overnight, 2026-05-05)

This is a copy + IA spec, not an implementation. The locked pricing
decisions exist; the page does not. Use this as the starting brief
when you ship `/pricing` — adjust the wording to your taste, then
hand to engineering for layout.

---

## Why this page now

The master plan flagged "Stripe is wired but no `/pricing` surface"
as the worst-of-all-worlds state (Section 3.10). The locked Section
0.2 pricing model resolves the open question. A `/pricing` page is
needed before any paid-tier launch.

## Pricing model (Section 0.2 locked)

| Item                  | Locked                                                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Free tier             | 3 curated matches with 80–100-word AI rationales per audit, unlimited curated reading, 1 GENERATE plan per quarter (taste)                      |
| Paid monthly          | $7 / month                                                                                                                                      |
| Paid annual           | $77 / year (one month free baked in vs. $84 monthly)                                                                                            |
| 2-year prepay         | $140 (range; founder to confirm exact figure later)                                                                                             |
| 3-year prepay         | $200 (range)                                                                                                                                    |
| Founding Member badge | First 500 paid annual subscribers — badge in profile, name in /about credits, early access to new features. **No price discount, just status.** |
| Donation tier         | One-time tiered donations: $25 / $100 / $250 / $500 — separate from subscription                                                                |
| Lifetime tier         | **REJECTED** — live surface with ongoing per-user compute cost                                                                                  |
| BYO API key           | **REJECTED as a tier** — consumer-market BYOK conversion ceiling is 2–5%                                                                        |

Soft rate limit on the free tier: **4 Soul Audits per calendar month**.
Caps worst-case cost exposure on viral spikes.

## Information architecture

```
/pricing
├── Hero
│   ├── Tagline
│   └── Single sentence promising free tier never goes away
├── Two-column comparison (Free | Paid)
│   ├── Free: what you always get
│   ├── Paid: what unlocks
│   └── Annual savings callout
├── Founding Member section
│   └── Limited to first 500 — claim a slot
├── Donation tier (separate card)
│   └── One-time tiered support
├── Pricing FAQ
│   ├── "Is the gospel ever paywalled?" — No, never.
│   ├── "What if I can't afford $7/mo?" — Free tier is the full curated catalog.
│   ├── "Can I cancel anytime?"
│   ├── "What happens to my plan if I downgrade?"
│   ├── "Do you offer student / nonprofit pricing?"
│   └── "Why no lifetime tier?"
└── Quiet footer
    └── Link to /about + /donation-disclosure + /privacy
```

## Hero copy (3 candidates)

### Option A — direct

> ## Pricing
>
> The Bible is free. The library of 65 curated devotional series is free.
> The Soul Audit and three matched paths are free. **You only pay if you
> want a custom plan written for your specific words.**

### Option B — pastoral

> ## Pricing
>
> Ancient depth, modern clarity — for free.
>
> Pay only when you want a devotional plan composed specifically for
> what you carry today.

### Option C — minimal

> ## Pricing
>
> Free for everyone. Always.
>
> Optional: $7/month for AI-composed personal plans.

**Recommendation:** Option A — most concrete about what's free, most
honest about what costs money, most defensible if a future critic
asks "what does the free tier actually include?"

## Two-column comparison

### Free

- All 65 curated devotional series (175+ devotionals)
- Wake-Up Magazine (7 series, 35 devotionals)
- Soul Audit submission
- 3 curated match recommendations with AI-written rationales
- 1 personalized GENERATE plan per quarter (a taste)
- Reading position sync across devices (with sign-in)
- Bookmarks + journal entries
- Daily Bread surface
- **Always free. No "lite" version.**

### Paid — Euangelion +

- Everything in Free, plus:
- Unlimited GENERATE plans — a custom 7-day devotional written for
  your specific reflection
- Unlimited Soul Audit re-rolls
- Soft cap: 1 GENERATE per week (catches abuse without restricting normal use)
- Priority support
- Founding Member badge for first 500 annual subscribers

**Pricing:**

- $7 / month
- $77 / year (~$6.42/mo, save $7)
- $140 / 2 years (~$5.83/mo, save $28) — _figure to confirm_
- $200 / 3 years (~$5.55/mo, save $52) — _figure to confirm_

## Founding Member section

> ## Founding Members
>
> The first 500 annual subscribers receive a Founding Member badge in
> their profile, their name in the `/about` credits, and early access
> to new features as they ship.
>
> **No price discount.** Just acknowledgment of building this with us.
>
> _N of 500 claimed_

(Engineering note: the "N of 500" counter requires a query against
Stripe — the active annual-subscription count. Cache for 5 minutes.)

## Donation tier (separate card)

> ## Support beyond a subscription
>
> If Euangelion has been meaningful to you and you want to support
> the work without a recurring subscription, one-time donations help
> keep the lights on and the gospel free.
>
> - $25 — A small thanks
> - $100 — One month of Anthropic API costs at our current free-tier load
> - $250 — One quarter of operating costs
> - $500 — A meaningful contribution to a year of free reading for everyone
>
> _Donations are not tax-deductible. Donations are not subscriptions._
>
> [Make a one-time gift] → Stripe checkout

## Pricing FAQ (canonical answers)

**Is the gospel ever paywalled?**

> No. The Bible is free. The full curated catalog is free. The Soul
> Audit and matched recommendations are free. We pay for AI generation;
> the Word costs nothing.

**What if I can't afford $7/month?**

> The free tier is the full curated catalog — every devotional we've
> written, every series, every word of Scripture. It is not a "lite"
> version. There is no feature you'd miss except for AI-composed
> personal plans, which you can sample once a quarter for free.

**Can I cancel anytime?**

> Yes. Cancellation takes effect at the end of your current billing
> period. You keep access until then.

**What happens to my plan if I downgrade?**

> Any AI-composed plans you've already generated stay in your library
> permanently. You just can't compose new ones until you're back on
> the paid tier or your quarterly free GENERATE refreshes.

**Do you offer student / nonprofit pricing?**

> Not currently. The free tier is designed to be enough for anyone.
> If you're a church, school, or nonprofit interested in a group
> license, email us — we'll figure something out.

**Why no lifetime tier?**

> Every Soul Audit and every devotional plan involves real per-user
> compute cost (Anthropic API). Lifetime pricing for a SaaS with
> ongoing compute is a slow-motion margin trap. We'd rather charge a
> fair monthly price and keep the free tier robust.

## Engineering notes

### Stripe wiring (already exists, per master plan Gap closure 6)

- Routes: `/api/billing/{checkout, config, entitlements, lifecycle, portal}`
- `src/lib/billing/catalog.ts` defines products
- Audit before launch: prices in `catalog.ts` should match Stripe
  dashboard for the locked tiers ($7/mo, $77/yr, $140/2yr, $200/3yr,
  donation amounts)

### State to surface per visitor

- Authenticated + paid → "You're on Euangelion+" + manage-subscription link
- Authenticated + free → primary CTA = "Upgrade"
- Anonymous → primary CTA = "Sign up to start"

### Components needed (likely new)

- `<PricingComparison />` — two-column grid
- `<FoundingMemberCard />` — counter + claim CTA
- `<DonationTierCard />` — four amounts + Stripe checkout buttons
- `<PricingFAQ />` — accordion (reuse FAQ pattern from homepage)

### Tracking

- Page view on /pricing
- Click on each tier CTA
- Click on FAQ items (which questions get the most opens)

### Schema.org JSON-LD

Add `Product` + `Offer` JSON-LD per tier. Use the
`schema.org/Product` shape. Helps Google render rich results.

## Open questions for the founder

1. **2-year + 3-year exact figures** — locked as "range" pending confirmation
2. **Counter implementation for Founding Member** — query Stripe, cache, or
   maintain a separate `founding_members` table?
3. **Hero copy choice** — Option A / B / C / your own
4. **Launch order** — `/pricing` first, then enable Stripe checkout?
   Or coordinate the two?
5. **Group / church licensing** — defer or build a basic "contact
   us" form for now?

---

This spec is intentionally complete enough to hand to an engineer
without further input. Each open question above has a defensible
default; the founder can override during the implementation pass.
