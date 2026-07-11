# Phase 1 Legal Copy Diffs — Custom Generation + Payments

**Status:** DRAFT — awaiting founder sign-off. Nothing below is applied to
`content/legal/` until approved (brief §11: "updated privacy/terms copy diffs
for review"). Decisions: SA-026, SA-027, SA-028.

The June 2026 retention language (30-day anonymous reflection retention,
Anthropic ZDR processing, cascade delete) is already accurate for the
generation gate and needs **no change**. What Phase 1 adds is payments.

---

## 1. `content/legal/privacy-policy.md`

### 1a. Add under "Information You Provide"

```diff
 - **Preferences:** Your app settings, reading preferences, notification preferences, and any customizations you make.
+- **Billing Information:** If you subscribe or purchase, we store your
+  Stripe customer and subscription identifiers, your plan, its status, and
+  its renewal or expiry date. **Your card details never touch our servers**
+  — payment is handled entirely by Stripe on Stripe-hosted pages, and we
+  never see or store card numbers, CVCs, or billing addresses.
 - **Feedback and Communications:** Any information you provide when contacting us or submitting feedback.
```

### 1b. Add a "Payment Processing" subsection under "Data Storage and Security"

```diff
+### Payment Processing
+
+Payments are processed by Stripe, Inc. When you subscribe or make a
+purchase you are taken to a Stripe-hosted checkout page; the payment
+details you enter there go to Stripe, not to us. Stripe's handling of
+your information is governed by the [Stripe Privacy Policy]
+(https://stripe.com/privacy). What we receive back and keep is limited
+to: your Stripe customer and subscription identifiers, the plan you
+chose, its status, and its renewal or expiry date. We use this solely
+to know what you have access to and to show you honest subscription
+information in Settings.
```

### 1c. Add one line under "Data Retention"

```diff
 - **Account Data:** Retained while your account is active and for a reasonable period afterward.
+- **Billing Records:** Stripe identifiers and subscription state are retained
+  while your account exists and are deleted with it; transaction records are
+  retained by Stripe per their legal obligations (accessible via your Stripe
+  billing portal).
```

---

## 2. `content/legal/terms-of-service.md`

### 2a. Replace the generic "Subscription and Payments" section

```diff
 ## Subscription and Payments

 ### Free and Premium Features

-The Service may offer both free and premium features. Access to certain content or features may require a subscription.
+The Bible is free. The curated library is free. The Soul Audit is free.
+None of that ever sits behind a paywall.
+
+What requires payment is **custom generation**: a bespoke devotional plan
+composed for your specific reflection. Composing a custom plan requires a
+verified account. Every new verified account includes **one free custom
+edition**. Beyond that, custom generation requires a subscription (or
+another entitlement we may offer, such as purchased editions or a
+redeemed code).

 ### Subscription Terms

 If you subscribe to premium features:

-- Subscriptions automatically renew unless cancelled
+- Subscriptions automatically renew unless cancelled; we state the true
+  billed amount beside every purchase button
 - You may cancel at any time through your account settings
+- Cancelling never deletes anything: everything generated for you
+  remains in your library permanently, and paid access continues until
+  the end of the period you paid for
+- Subscriptions include a monthly custom-generation allowance (fair use);
+  we state the allowance where you generate
+- Multi-year plans (2-year, 3-year) are one-time payments that grant a
+  fixed term of access and do not auto-renew
 - Refunds are subject to our refund policy
 - Prices may change with reasonable notice

 ### Payment Processing

-Payments are processed through third-party payment providers. Your use of these services is subject to their terms.
+Payments are processed by Stripe on Stripe-hosted pages; card details
+never touch our servers. Your use of Stripe's services is subject to
+Stripe's terms. Entitlements activate on Stripe's confirmation of
+payment, not on returning to our site.
```

---

## 3. Open wording questions for the founder

1. **Refund policy** — the terms reference "our refund policy" but none is
   written. Minimum viable: "Contact us within 14 days of a charge and we
   will make it right." Confirm the stance and I'll draft it.
2. **Naming the prices in the terms** — recommend NOT hardcoding ($7/$77
   change with notice; the paywall + /pricing state them). Confirm.
3. **"another entitlement we may offer"** — this future-proofs credit packs
   and gift codes (Phase 2) so the terms don't need re-consent at that
   ship. Comfortable with the forward reference?
