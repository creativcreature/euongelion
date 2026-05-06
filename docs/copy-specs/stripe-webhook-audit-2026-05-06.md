# Stripe Webhook Lifecycle Audit — 2026-05-06

**Status:** Read-only audit, no code changes
**Source-of-truth:** Master plan Section 0.13 Gap closure 6 follow-up

- Section 0.2 (founder-locked subscription tiers)
  **Audience:** founder, with the Stripe webhook event log open beside this doc
  **Author:** Claude Opus 4.7 (autonomous overnight, 2026-05-06)
  **Companion:** `docs/copy-specs/stripe-alignment-audit-2026-05-05.md`

This audit looks at the Stripe lifecycle code on the cloudflare-migration
branch and answers a single question: **does the codebase reliably handle
the full subscription lifecycle, or does it only handle the
checkout-success path?**

Spoiler: **only checkout-success.** Real production billing needs more.

---

## What exists today

`src/app/api/billing/lifecycle/route.ts` exposes a **GET endpoint**
that the client's success page hits after returning from Stripe
Checkout. Flow:

1. Client navigates to `/settings?billing=success&session_id={CHECKOUT_SESSION_ID}`
2. Settings page reads the session_id, calls
   `GET /api/billing/lifecycle?session_id=...`
3. Route validates the session_id, retrieves the session from
   Stripe API, retrieves the subscription if present
4. Route returns `{ billingStatus, premiumActive, subscriptionStatus,
foundingMemberClaimed }`
5. Client UI updates accordingly

This is **pull-based polling**, NOT a Stripe webhook. The route reads
state from Stripe; Stripe never pushes events to the route.

`src/lib/billing/lifecycle.ts` provides `resolveBillingLifecycle` —
maps Stripe session/subscription status pairs into a 6-value
`billingStatus` enum (`pending | success | cancelled | requires_action
| failed | expired`).

## What's missing

A real Stripe **webhook endpoint** (POST with HMAC signature
verification via `stripe.webhooks.constructEvent`) that handles
ongoing subscription events. Specifically:

| Stripe event                           | Why it matters                              | Handled today                    |
| -------------------------------------- | ------------------------------------------- | -------------------------------- |
| `checkout.session.completed`           | First confirmation of a successful checkout | ✅ (via the GET poll)            |
| `customer.subscription.created`        | Subscription is live; activate premium      | ⚠️ (via GET poll only — fragile) |
| `customer.subscription.updated`        | Plan change, billing-cycle change           | ❌                               |
| `customer.subscription.deleted`        | User cancelled OR subscription ended        | ❌                               |
| `invoice.paid`                         | Renewal succeeded                           | ❌                               |
| `invoice.payment_failed`               | Card declined; start dunning                | ❌                               |
| `customer.subscription.trial_will_end` | 3-day pre-trial-end heads-up                | ❌                               |
| `charge.refunded`                      | Manual refund issued                        | ❌                               |

**Why this matters concretely:**

- **Cancellations** — when a paid user cancels via the Stripe Customer
  Portal (or you cancel them manually), nothing in the codebase fires.
  Their `subscription_tier` stays `'premium'` until the next time they
  visit the settings success page (which they probably won't).
- **Renewal failures** — if a user's card fails on month-13's renewal,
  Stripe enters dunning. The user keeps premium access for 7-21 days
  while Stripe retries. If Stripe gives up, the subscription becomes
  `canceled`. None of this is reflected in our `subscription_tier`.
- **Plan changes** — if a user upgrades from monthly → annual via the
  Stripe Customer Portal, our DB doesn't notice.
- **Refunds** — if you refund a Founding Member, their badge stays.
  This may or may not be desired (founder direction said badge
  persists even on cancellation — but refunds are a different signal).

## The Founding Member edge case

Per founder direction 2026-05-05: Founding Member badge **persists
even on cancellation** (intentional). So `customer.subscription.deleted`
should NOT clear `founding_member_at`.

But: the badge is currently awarded only via the GET poll at the
checkout-success moment. If the user closes the success page before
the poll fires (rare but possible), the badge is never claimed —
and the user can't claim it later because nothing else fires.

**Recommendation:** the webhook should handle
`customer.subscription.created` for `premium_annual` plans as the
canonical claim moment. The GET poll becomes redundant claim
attempt for the same user (idempotent — `claimFoundingMemberSlot`
returns `already_held` on the second call).

## Recommended implementation

### New route: `src/app/api/billing/webhook/route.ts`

```ts
import Stripe from 'stripe'
// ...
export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature')
  if (!sig) return new Response('Missing signature', { status: 400 })
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret)
    return new Response('Webhook not configured', { status: 503 })

  const body = await request.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object)
      break
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object)
      break
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object)
      break
    // ...
    default:
      // Acknowledge so Stripe doesn't retry — event is just irrelevant.
      break
  }
  return new Response('ok', { status: 200 })
}
```

### Handler responsibilities

**`customer.subscription.created`**

- Find the user by `customer.email` (or by `subscription.metadata.user_id`
  if we start passing it on checkout)
- Set `users.subscription_tier = 'premium'`
- If plan is `premium_annual`, call `claimFoundingMemberSlot(userId)`
  (idempotent with the existing GET-poll claim)

**`customer.subscription.deleted`**

- Find the user
- Set `users.subscription_tier = 'free'`
- Do NOT clear `founding_member_at` (per founder direction)
- Optional: log to a `subscription_lifecycle_events` table for
  founder visibility

**`customer.subscription.updated`**

- Find the user
- Re-derive `subscription_tier` from the new plan + status
- For plan changes (monthly → annual), re-attempt Founding Member
  claim if newly annual

**`invoice.payment_failed`**

- Find the user
- Send a single notification (email or in-app banner) — NOT every
  retry; Stripe retries up to 4 times in 21 days
- Don't change `subscription_tier` until `subscription.deleted`
  fires

### Stripe dashboard config

When creating the webhook in Stripe dashboard:

- URL: `https://euangelion.app/api/billing/webhook`
- Events: the 7 listed above
- API version: pin to whatever Stripe SDK version we're on
- Get the webhook signing secret → set as `STRIPE_WEBHOOK_SECRET` env var

### Test strategy

- Use the Stripe CLI (`stripe listen --forward-to localhost:3333/api/billing/webhook`)
  to forward live webhook events to local dev
- Mock-test each handler with synthetic event payloads
- Integration test: create a test subscription in Stripe test mode,
  verify our DB updates correctly through each lifecycle stage

## Defense-in-depth: keep the GET poll

The GET poll (`/api/billing/lifecycle?session_id=...`) should stay
even after the webhook lands. Reasons:

1. **Latency on the success page** — the user just clicked Pay; they
   want immediate confirmation, not a webhook round-trip.
2. **Webhook reliability** — Stripe webhooks can be delayed. The GET
   poll lets us avoid showing "Processing..." for 30+ seconds.
3. **Local development** — you don't need to run `stripe listen` for
   the basic checkout-success test.

The two paths reconverge at `claimFoundingMemberSlot` which is
idempotent.

## What I did NOT change

This is a **read-only audit**. No new webhook route, no new env vars,
no Stripe dashboard changes. Founder takes this audit + their Stripe
dashboard and configures the webhook when ready.

## Pre-implementation checklist

- [ ] Decide whether to add a `subscription_lifecycle_events` table
      for audit trail of Stripe events (recommended; keeps a record
      of every state change we received from Stripe)
- [ ] Create webhook endpoint in Stripe dashboard
- [ ] Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET` env var
- [ ] Update `src/types/database.ts` if adding the audit table
- [ ] Add migration for the audit table (if adding it)
- [ ] Implement `src/app/api/billing/webhook/route.ts` with
      handlers for the 7 events above
- [ ] Add tests using Stripe CLI for live event forwarding
- [ ] Update `docs/copy-specs/stripe-alignment-audit-2026-05-05.md`
      to reference the new webhook endpoint
